import CoreText
import UIKit

/// The game screen and lifecycle hooks the native engine needs from the player UI.
protocol NativeEngineHost: AnyObject {
    func nativePresent(_ image: CGImage)
    func nativeEvent(_ name: String, _ text: String)
    func nativeMessageBox(_ text: String, done: @escaping () -> Void)
    func nativeAudio(_ op: String, _ args: [Any])
    func nativeGameEnded()
}

/// Runs games with the native RGSS engine (native/core + embedded CRuby) on a dedicated
/// thread. Ruby can only be initialised once per process, so the same thread serves every
/// game: it waits for a start request, runs the game until it exits, then waits again.
final class NativeEngine {
    static let shared = NativeEngine()

    weak var host: NativeEngineHost?
    private(set) var running = false
    /// Incremented for every start; lets a closed player ignore a later game's state.
    private(set) var session = 0

    // Shared with the Ruby thread (read there, written on main).
    private let lock = NSLock()
    private var _paused = false
    private var _reset = false
    private var _quit = false
    private var _bgmPos = 0
    private var fps = 60

    private var thread: Thread?
    private var pending: (dir: String, engine: Int, rtp: [String], session: Int)?
    private let startSignal = DispatchSemaphore(value: 0)
    private let resumeSignal = DispatchSemaphore(value: 0)
    private var nextFrame: CFTimeInterval = 0

    var paused: Bool {
        get { lock.lock(); defer { lock.unlock() }; return _paused }
        set {
            lock.lock()
            let was = _paused
            _paused = newValue
            lock.unlock()
            if was && !newValue { resumeSignal.signal() }
        }
    }

    func requestReset() { lock.lock(); _reset = true; lock.unlock() }
    func setBGMPosition(_ p: Int) { lock.lock(); _bgmPos = p; lock.unlock() }
    var bgmPosition: Int { lock.lock(); defer { lock.unlock() }; return _bgmPos }

    /// Start a game. The previous one must have ended (see stop()).
    @discardableResult
    func start(gameDir: URL, engine: Int, rtp: [URL], host: NativeEngineHost) -> Int {
        session += 1
        self.host = host
        lock.lock()
        _quit = false
        _reset = false
        _paused = false
        lock.unlock()
        pending = (gameDir.path, engine, rtp.map(\.path), session)
        running = true
        if thread == nil {
            let t = Thread { [unowned self] in self.threadMain() }
            t.stackSize = 64 << 20   // the Ruby VM runs here: generous native stack
            t.qualityOfService = .userInteractive
            t.name = "tkr.ruby"
            thread = t
            t.start()
        }
        startSignal.signal()
        return session
    }

    /// Ask the running game to quit (raises SystemExit at the next Graphics.update).
    func stop() {
        lock.lock()
        _quit = true
        let wasPaused = _paused
        _paused = false
        lock.unlock()
        if wasPaused { resumeSignal.signal() }
    }

    private func threadMain() {
        guard let rgss = Bundle.main.resourceURL?.appendingPathComponent("rgss").path else { return }
        while true {
            startSignal.wait()
            guard let p = pending else { continue }
            pending = nil
            nextFrame = CACurrentMediaTime()
            let rtpC = p.rtp.map { strdup($0) }
            var rtpPtrs: [UnsafePointer<CChar>?] = rtpC.map { UnsafePointer($0) }
            let r = rtpPtrs.withUnsafeMutableBufferPointer { buf in
                tkr_ios_run(p.dir, rgss, Int32(p.engine), buf.baseAddress, Int32(p.rtp.count))
            }
            rtpC.forEach { free($0) }
            NSLog("[TukuruPlayer] native game ended (\(r))")
            let ended = p.session
            DispatchQueue.main.async {
                guard ended == self.session else { return }   // a newer game is already starting
                self.running = false
                self.host?.nativeGameEnded()
            }
        }
    }

    // MARK: called on the Ruby thread (via the C platform functions below)

    fileprivate func frame() -> Int32 {
        // present the composed frame
        let w = Int(tkr_render_width()), h = Int(tkr_render_height())
        if let px = tkr_render_output(), w > 0, h > 0 {
            let data = Data(bytes: px, count: w * h * 4) as CFData
            if let provider = CGDataProvider(data: data),
               let image = CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: w * 4,
                                   space: CGColorSpaceCreateDeviceRGB(),
                                   bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue),
                                   provider: provider, decode: nil, shouldInterpolate: false,
                                   intent: .defaultIntent) {
                DispatchQueue.main.async { self.host?.nativePresent(image) }
            }
        }
        // wait for the next frame (Graphics.frame_rate)
        let period = 1.0 / Double(max(10, min(120, fps)))
        nextFrame += period
        let now = CACurrentMediaTime()
        if nextFrame > now {
            Thread.sleep(forTimeInterval: nextFrame - now)
        } else if now - nextFrame > 0.25 {
            nextFrame = now   // fell far behind (e.g. a long load): don't try to catch up
        }
        // pause (menu open / app in background)
        while paused { resumeSignal.wait(); nextFrame = CACurrentMediaTime() }
        lock.lock()
        defer { lock.unlock() }
        if _quit { return 2 }
        if _reset { _reset = false; return 1 }
        return 0
    }

    fileprivate func setFrameRate(_ r: Int) { fps = r }

    fileprivate func messageBox(_ text: String) {
        lock.lock()
        let quitting = _quit
        lock.unlock()
        if quitting { return }
        let done = DispatchSemaphore(value: 0)
        DispatchQueue.main.async {
            guard let host = self.host else { done.signal(); return }
            host.nativeMessageBox(text) { done.signal() }
        }
        done.wait()
        nextFrame = CACurrentMediaTime()
    }

    // MARK: text (CoreText)

    private var fontCache: [String: CTFont] = [:]
    private var registeredFonts = Set<String>()

    /// Register the fonts shipped with the game (Fonts/*.ttf|otf) for this process.
    func registerFonts(in dirs: [URL]) {
        let fm = FileManager.default
        for dir in dirs {
            for sub in ["Fonts", "fonts"] {
                let fdir = dir.appendingPathComponent(sub)
                guard let names = try? fm.contentsOfDirectory(atPath: fdir.path) else { continue }
                for n in names where ["ttf", "otf", "ttc"].contains((n as NSString).pathExtension.lowercased()) {
                    let url = fdir.appendingPathComponent(n)
                    if registeredFonts.contains(url.path) { continue }
                    registeredFonts.insert(url.path)
                    CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
                }
            }
        }
        fontCache.removeAll()
    }

    fileprivate func font(_ f: UnsafePointer<TkrFont>) -> CTFont {
        var names: [String] = []
        withUnsafeBytes(of: f.pointee.names) { raw in
            let ptrs = raw.bindMemory(to: UnsafePointer<CChar>?.self)
            for i in 0..<Int(min(8, max(0, f.pointee.count))) {
                if let p = ptrs[i] { names.append(String(cString: p)) }
            }
        }
        let size = CGFloat(f.pointee.px)
        let bold = f.pointee.bold != 0, italic = f.pointee.italic != 0
        let key = "\(names.joined(separator: "|"))/\(size)/\(bold)/\(italic)"
        if let c = fontCache[key] { return c }
        var base: CTFont?
        for n in names {
            let desc = CTFontDescriptorCreateWithAttributes([kCTFontFamilyNameAttribute: n] as CFDictionary)
            if let m = CTFontDescriptorCreateMatchingFontDescriptor(desc, nil) {
                base = CTFontCreateWithFontDescriptor(m, size, nil)
                break
            }
            // PostScript / full names
            let byName = CTFontCreateWithName(n as CFString, size, nil)
            let fam = CTFontCopyFamilyName(byName) as String
            let full = CTFontCopyFullName(byName) as String
            if fam.caseInsensitiveCompare(n) == .orderedSame || full.caseInsensitiveCompare(n) == .orderedSame {
                base = byName
                break
            }
        }
        var font = base ?? CTFontCreateWithName((bold ? "HiraginoSans-W6" : "HiraginoSans-W3") as CFString, size, nil)
        var traits: CTFontSymbolicTraits = []
        if bold { traits.insert(.traitBold) }
        if italic { traits.insert(.traitItalic) }
        if !traits.isEmpty, let t = CTFontCreateCopyWithSymbolicTraits(font, size, nil, traits, traits) {
            font = t
        }
        fontCache[key] = font
        let chosen = CTFontCopyFullName(font) as String
        tkr_platform_event_swift("stage", "font \(names.joined(separator: "|")) \(size)px -> \(chosen)")
        return font
    }

    fileprivate func text(_ f: UnsafePointer<TkrFont>, _ utf8: UnsafePointer<CChar>, _ mask: UnsafeMutablePointer<UInt8>?,
                          _ mw: Int32, _ mh: Int32, _ origin: Double, _ baseline: Double,
                          _ ascent: UnsafeMutablePointer<Double>, _ descent: UnsafeMutablePointer<Double>) -> Double {
        let font = self.font(f)
        ascent.pointee = Double(CTFontGetAscent(font))
        descent.pointee = Double(CTFontGetDescent(font))
        let s = String(cString: utf8)
        let attrs: [CFString: Any] = [kCTFontAttributeName: font, kCTForegroundColorFromContextAttributeName: true]
        guard let astr = CFAttributedStringCreate(nil, s as CFString, attrs as CFDictionary) else { return 0 }
        let line = CTLineCreateWithAttributedString(astr)
        let width = CTLineGetTypographicBounds(line, nil, nil, nil)
        if let mask, mw > 0, mh > 0,
           let ctx = CGContext(data: mask, width: Int(mw), height: Int(mh), bitsPerComponent: 8, bytesPerRow: Int(mw),
                               space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.alphaOnly.rawValue) {
            ctx.setFillColor(gray: 0, alpha: 1)
            ctx.setShouldAntialias(true)
            ctx.textPosition = CGPoint(x: origin, y: Double(mh) - baseline)
            CTLineDraw(line, ctx)
        }
        return Double(width)
    }
}

private func tkr_platform_event_swift(_ name: String, _ text: String) {
    DispatchQueue.main.async { NativeEngine.shared.host?.nativeEvent(name, text) }
}

// MARK: - C platform functions (native/core/tkr_platform.h)

@_cdecl("tkr_platform_frame")
func swift_platform_frame() -> Int32 { NativeEngine.shared.frame() }

@_cdecl("tkr_platform_set_frame_rate")
func swift_platform_set_frame_rate(_ fps: Int32) { NativeEngine.shared.setFrameRate(Int(fps)) }

@_cdecl("tkr_platform_bgm_pos")
func swift_platform_bgm_pos() -> Int { NativeEngine.shared.bgmPosition }

@_cdecl("tkr_platform_msgbox")
func swift_platform_msgbox(_ text: UnsafePointer<CChar>?) {
    NativeEngine.shared.messageBox(text.map { String(cString: $0) } ?? "")
}

@_cdecl("tkr_platform_log")
func swift_platform_log(_ level: UnsafePointer<CChar>?, _ msg: UnsafePointer<CChar>?) {
    let l = level.map { String(cString: $0) } ?? "info"
    let m = msg.map { String(cString: $0) } ?? ""
    DispatchQueue.main.async { NativeEngine.shared.host?.nativeEvent("log", "\(l): \(m)") }
}

@_cdecl("tkr_platform_event")
func swift_platform_event(_ name: UnsafePointer<CChar>?, _ text: UnsafePointer<CChar>?) {
    let n = name.map { String(cString: $0) } ?? ""
    let t = text.map { String(cString: $0) } ?? ""
    DispatchQueue.main.async { NativeEngine.shared.host?.nativeEvent(n, t) }
}

@_cdecl("tkr_platform_audio")
func swift_platform_audio(_ op: UnsafePointer<CChar>?, _ argc: Int32,
                        _ sargs: UnsafePointer<UnsafePointer<CChar>?>?, _ iargs: UnsafePointer<Int>?) {
    let o = op.map { String(cString: $0) } ?? ""
    var args: [Any] = []
    for i in 0..<Int(max(0, argc)) {
        if let s = sargs?[i] { args.append(String(cString: s)) } else { args.append(iargs?[i] ?? 0) }
    }
    DispatchQueue.main.async { NativeEngine.shared.host?.nativeAudio(o, args) }
}

@_cdecl("tkr_platform_text")
func swift_platform_text(_ f: UnsafePointer<TkrFont>?, _ utf8: UnsafePointer<CChar>?, _ mask: UnsafeMutablePointer<UInt8>?,
                       _ mw: Int32, _ mh: Int32, _ origin: Double, _ baseline: Double,
                       _ ascent: UnsafeMutablePointer<Double>?, _ descent: UnsafeMutablePointer<Double>?) -> Double {
    guard let f, let utf8, let ascent, let descent else { return 0 }
    return NativeEngine.shared.text(f, utf8, mask, mw, mh, origin, baseline, ascent, descent)
}
