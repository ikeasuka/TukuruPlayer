import AVFoundation
import Foundation

/// Native implementation of the RGSS Audio module (BGM / BGS / ME / SE).
/// Ogg Vorbis is decoded with stb_vorbis (LOOPSTART / LOOPLENGTH supported),
/// WAV / MP3 / M4A with AVAudioFile, MIDI with AVMIDIPlayer + a user supplied SoundFont.
final class GameAudio {
    private let fs: GameFileSystem
    private let engine: AVAudioEngine
    private let q = DispatchQueue(label: "tkr.audio", qos: .userInitiated)
    private let decodeQ = DispatchQueue(label: "tkr.audio.decode", qos: .userInitiated, attributes: .concurrent)

    private let bgm: AudioChannel
    private let bgs: AudioChannel
    private let me: AudioChannel
    private var ses: [AudioChannel] = []
    private var seNext = 0
    private var seCache: [String: Decoded] = [:]
    private var seCacheOrder: [String] = []

    private var midiBGM: MIDIChannel?
    private var midiME: MIDIChannel?
    private var bgmIsMidi = false
    private var bgmPausedByME = false
    private var posTimer: DispatchSourceTimer?
    private var paused = false

    /// Reports the BGM position (in samples) periodically, on the main thread.
    var onBGMPosition: ((Int) -> Void)?

    struct Decoded {
        enum Kind { case pcm(AVAudioPCMBuffer), midi(Data) }
        let kind: Kind
        let loopStart: Int
        let loopLength: Int
    }

    init(fs: GameFileSystem) {
        self.fs = fs
        let eng = AVAudioEngine()
        engine = eng
        bgm = AudioChannel(engine: eng)
        bgs = AudioChannel(engine: eng)
        me = AudioChannel(engine: eng)
        for _ in 0..<12 { ses.append(AudioChannel(engine: eng)) }
        configureSession()
        q.async { self.startEngine() }
        let t = DispatchSource.makeTimerSource(queue: q)
        t.schedule(deadline: .now() + 0.25, repeating: 0.25)
        t.setEventHandler { [weak self] in
            guard let self else { return }
            let pos = self.bgm.position()
            DispatchQueue.main.async { self.onBGMPosition?(pos) }
        }
        t.resume()
        posTimer = t
        NotificationCenter.default.addObserver(self, selector: #selector(interrupted(_:)),
                                               name: AVAudioSession.interruptionNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(configChanged(_:)),
                                               name: .AVAudioEngineConfigurationChange, object: engine)
    }

    deinit {
        posTimer?.cancel()
        NotificationCenter.default.removeObserver(self)
    }

    func shutdown() {
        posTimer?.cancel()
        posTimer = nil
        q.sync {
            [bgm, bgs, me].forEach { $0.stop() }
            ses.forEach { $0.stop() }
            midiBGM?.stop(); midiME?.stop()
            engine.stop()
        }
    }

    private func configureSession() {
        let s = AVAudioSession.sharedInstance()
        let ignore = AppSettings.defaults.bool(forKey: AppSettings.Key.ignoreSilent)
        try? s.setCategory(ignore ? .playback : .soloAmbient, mode: .default, options: [])
        try? s.setActive(true)
    }

    private func startEngine() {
        if !engine.isRunning && !paused {
            engine.prepare()
            do { try engine.start() } catch { NSLog("[TukuruPlayer] audio engine start failed: \(error)") }
        }
    }

    @objc private func interrupted(_ n: Notification) {
        guard let raw = n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .ended {
            q.async {
                try? AVAudioSession.sharedInstance().setActive(true)
                self.startEngine()
                self.resumePlayers()
            }
        }
    }

    @objc private func configChanged(_ n: Notification) {
        q.async {
            self.startEngine()
            self.resumePlayers()
        }
    }

    private func resumePlayers() {
        for c in [bgm, bgs, me] where c.isActive && !(c === bgm && bgmPausedByME) { c.resume() }
    }

    func setPaused(_ p: Bool) {
        q.async {
            self.paused = p
            if p {
                self.engine.pause()
                self.midiBGM?.pause(); self.midiME?.pause()
            } else {
                try? AVAudioSession.sharedInstance().setActive(true)
                self.startEngine()
                self.resumePlayers()
                self.midiBGM?.resume(); self.midiME?.resume()
            }
        }
    }

    // MARK: - command dispatch from the web runtime

    func handle(op: String, args: [Any]) {
        func s(_ i: Int) -> String { args.count > i ? (args[i] as? String ?? "\(args[i])") : "" }
        func n(_ i: Int, _ d: Int) -> Int {
            guard args.count > i else { return d }
            if let v = args[i] as? Int { return v }
            if let v = args[i] as? Double { return Int(v) }
            if let v = args[i] as? NSNumber { return v.intValue }
            return d
        }
        switch op {
        case "bgm_play": playBGM(s(0), volume: n(1, 100), pitch: n(2, 100), pos: n(3, 0))
        case "bgm_stop": q.async { self.stopBGM() }
        case "bgm_fade": q.async { self.bgm.fade(ms: n(0, 0)); self.midiBGM?.fadeOut(ms: n(0, 0)) }
        case "bgs_play": playLoop(bgs, s(0), volume: n(1, 80), pitch: n(2, 100), pos: n(3, 0))
        case "bgs_stop": q.async { self.bgs.stop() }
        case "bgs_fade": q.async { self.bgs.fade(ms: n(0, 0)) }
        case "me_play": playME(s(0), volume: n(1, 100), pitch: n(2, 100))
        case "me_stop": q.async { self.stopME() }
        case "me_fade": q.async { self.me.fade(ms: n(0, 0)); self.midiME?.fadeOut(ms: n(0, 0)) }
        case "se_play": playSE(s(0), volume: n(1, 80), pitch: n(2, 100))
        case "se_stop": q.async { self.ses.forEach { $0.stop() } }
        default: break
        }
    }

    // MARK: - decoding

    private func load(_ name: String) -> Decoded? {
        guard let item = fs.resolve(name), let data = try? fs.data(for: item) else {
            NSLog("[TukuruPlayer] audio not found: \(name)")
            return nil
        }
        return Self.decode(data, name: item.name)
    }

    /// Every buffer is converted to this format so the audio graph never has to be
    /// reconnected while running (reconnecting / format mismatches raise exceptions that crash the app).
    static let engineFormat = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 2)!

    static func decode(_ data: Data, name: String) -> Decoded? {
        guard let d = decodeRaw(data, name: name) else { return nil }
        guard case .pcm(let buf) = d.kind else { return d }
        guard let (out, ratio) = normalize(buf) else {
            NSLog("[TukuruPlayer] audio convert failed \(name) \(buf.format)")
            return nil
        }
        func scale(_ v: Int) -> Int { v < 0 ? v : Int((Double(v) * ratio).rounded()) }
        return Decoded(kind: .pcm(out), loopStart: scale(d.loopStart), loopLength: scale(d.loopLength))
    }

    /// Convert to 44.1kHz stereo float. Returns the buffer and the sample-rate ratio.
    static func normalize(_ input: AVAudioPCMBuffer) -> (AVAudioPCMBuffer, Double)? {
        let target = engineFormat
        guard input.frameLength > 0, let src = input.floatChannelData else { return nil }
        let frames = Int(input.frameLength)
        let ch = Int(input.format.channelCount)
        // 1) to stereo at the original rate (duplicate mono, drop extra channels)
        guard let stereoFmt = AVAudioFormat(standardFormatWithSampleRate: input.format.sampleRate, channels: 2),
              let stereo = AVAudioPCMBuffer(pcmFormat: stereoFmt, frameCapacity: AVAudioFrameCount(frames)),
              let dst = stereo.floatChannelData else { return nil }
        memcpy(dst[0], src[0], frames * MemoryLayout<Float>.size)
        memcpy(dst[1], src[ch > 1 ? 1 : 0], frames * MemoryLayout<Float>.size)
        stereo.frameLength = AVAudioFrameCount(frames)
        if stereoFmt.sampleRate == target.sampleRate { return (stereo, 1) }
        // 2) resample
        guard let conv = AVAudioConverter(from: stereoFmt, to: target) else { return nil }
        let ratio = target.sampleRate / stereoFmt.sampleRate
        let cap = AVAudioFrameCount(Double(frames) * ratio + 4096)
        guard let out = AVAudioPCMBuffer(pcmFormat: target, frameCapacity: cap) else { return nil }
        var supplied = false
        var error: NSError?
        let status = conv.convert(to: out, error: &error) { _, inputStatus in
            if supplied {
                inputStatus.pointee = .endOfStream
                return nil
            }
            supplied = true
            inputStatus.pointee = .haveData
            return stereo
        }
        guard status != .error, out.frameLength > 0 else { return nil }
        return (out, ratio)
    }

    private static func decodeRaw(_ data: Data, name: String) -> Decoded? {
        let head = data.prefix(4)
        if head == Data("OggS".utf8) {
            return decodeVorbis(data)
        }
        if head == Data("MThd".utf8) {
            return Decoded(kind: .midi(data), loopStart: -1, loopLength: -1)
        }
        // Other formats via AVAudioFile (needs a file URL)
        let ext = (name as NSString).pathExtension.isEmpty ? "wav" : (name as NSString).pathExtension
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + "." + ext)
        defer { try? FileManager.default.removeItem(at: tmp) }
        do {
            try data.write(to: tmp)
            let file = try AVAudioFile(forReading: tmp)
            guard let buf = AVAudioPCMBuffer(pcmFormat: file.processingFormat,
                                             frameCapacity: AVAudioFrameCount(file.length)) else { return nil }
            try file.read(into: buf)
            return Decoded(kind: .pcm(buf), loopStart: -1, loopLength: -1)
        } catch {
            NSLog("[TukuruPlayer] audio decode failed \(name): \(error)")
            return nil
        }
    }

    private static func decodeVorbis(_ data: Data) -> Decoded? {
        var out = TKRDecodedAudio()
        let r: Int32 = data.withUnsafeBytes { raw in
            tkr_vorbis_decode(raw.bindMemory(to: UInt8.self).baseAddress, Int32(raw.count), &out)
        }
        defer { tkr_vorbis_free(&out) }
        guard r == 0, out.frames > 0, out.channels > 0,
              let fmt = AVAudioFormat(standardFormatWithSampleRate: Double(out.sample_rate),
                                      channels: AVAudioChannelCount(out.channels)),
              let buf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: AVAudioFrameCount(out.frames)),
              let dst = buf.floatChannelData, let src = out.samples else { return nil }
        let ch = Int(out.channels)
        let frames = Int(out.frames)
        for c in 0..<ch {
            let d = dst[c]
            var i = 0
            while i < frames {
                d[i] = src[i * ch + c]
                i += 1
            }
        }
        buf.frameLength = AVAudioFrameCount(frames)
        return Decoded(kind: .pcm(buf), loopStart: Int(out.loop_start), loopLength: Int(out.loop_length))
    }

    // MARK: - BGM / BGS

    private func playBGM(_ name: String, volume: Int, pitch: Int, pos: Int) {
        q.async {
            if self.bgm.name == name && (self.bgm.isActive || (self.bgmIsMidi && self.midiBGM != nil)) {
                // same BGM: only update volume / pitch (RGSS behaviour)
                self.bgm.setVolume(volume, pitch: pitch)
                self.midiBGM?.set(volume: volume, pitch: pitch)
                return
            }
            self.stopBGM()
            self.bgm.name = name
            let token = self.bgm.token
            self.decodeQ.async {
                guard let d = self.load(name) else { return }
                self.q.async {
                    guard self.bgm.token == token else { return }
                    switch d.kind {
                    case .pcm(let buf):
                        self.bgmIsMidi = false
                        self.startEngine()
                        self.bgm.play(buf, volume: volume, pitch: pitch, pos: pos, loop: true,
                                      loopStart: d.loopStart, loopLength: d.loopLength)
                        if self.bgmPausedByME { self.bgm.player.pause() }
                    case .midi(let data):
                        self.bgmIsMidi = true
                        self.midiBGM = MIDIChannel(data: data, volume: volume, pitch: pitch, loop: true, queue: self.q)
                        if !self.bgmPausedByME { self.midiBGM?.start() }
                    }
                }
            }
        }
    }

    private func stopBGM() {
        bgm.stop()
        bgm.name = ""
        midiBGM?.stop()
        midiBGM = nil
        bgmIsMidi = false
    }

    private func playLoop(_ ch: AudioChannel, _ name: String, volume: Int, pitch: Int, pos: Int) {
        q.async {
            if ch.name == name && ch.isActive {
                ch.setVolume(volume, pitch: pitch)
                return
            }
            ch.stop()
            ch.name = name
            let token = ch.token
            self.decodeQ.async {
                guard let d = self.load(name), case .pcm(let buf) = d.kind else { return }
                self.q.async {
                    guard ch.token == token else { return }
                    self.startEngine()
                    ch.play(buf, volume: volume, pitch: pitch, pos: pos, loop: true,
                            loopStart: d.loopStart, loopLength: d.loopLength)
                }
            }
        }
    }

    // MARK: - ME (pauses BGM while playing)

    private func playME(_ name: String, volume: Int, pitch: Int) {
        q.async {
            self.stopME()
            self.me.name = name
            let token = self.me.token
            self.decodeQ.async {
                guard let d = self.load(name) else { return }
                self.q.async {
                    guard self.me.token == token else { return }
                    self.pauseBGMForME()
                    switch d.kind {
                    case .pcm(let buf):
                        self.startEngine()
                        self.me.play(buf, volume: volume, pitch: pitch, pos: 0, loop: false,
                                     loopStart: -1, loopLength: -1) { [weak self] in
                            self?.q.async {
                                guard let self, self.me.token == token else { return }
                                self.me.isActive = false
                                self.resumeBGMAfterME()
                            }
                        }
                    case .midi(let data):
                        let m = MIDIChannel(data: data, volume: volume, pitch: pitch, loop: false, queue: self.q)
                        m.onFinish = { [weak self] in
                            self?.q.async {
                                guard let self, self.me.token == token else { return }
                                self.midiME = nil
                                self.resumeBGMAfterME()
                            }
                        }
                        self.midiME = m
                        m.start()
                    }
                }
            }
        }
    }

    private func stopME() {
        me.stop()
        midiME?.stop()
        midiME = nil
        resumeBGMAfterME()
    }

    private func pauseBGMForME() {
        guard !bgmPausedByME else { return }
        bgmPausedByME = true
        if bgm.isActive { bgm.player.pause() }
        midiBGM?.pause()
    }

    private func resumeBGMAfterME() {
        guard bgmPausedByME else { return }
        bgmPausedByME = false
        if bgm.isActive {
            bgm.player.volume = 0
            startEngine()
            bgm.resume()
            bgm.fadeIn(ms: 1000)
        }
        if let m = midiBGM { if m.started { m.resume() } else { m.start() } }
    }

    // MARK: - SE

    private func playSE(_ name: String, volume: Int, pitch: Int) {
        q.async {
            if let d = self.seCache[name] {
                self.startSE(d, volume: volume, pitch: pitch)
                return
            }
            self.decodeQ.async {
                guard let d = self.load(name) else { return }
                self.q.async {
                    self.seCache[name] = d
                    self.seCacheOrder.append(name)
                    if self.seCacheOrder.count > 64 {
                        self.seCache.removeValue(forKey: self.seCacheOrder.removeFirst())
                    }
                    self.startSE(d, volume: volume, pitch: pitch)
                }
            }
        }
    }

    private func startSE(_ d: Decoded, volume: Int, pitch: Int) {
        guard case .pcm(let buf) = d.kind else { return }
        startEngine()
        // prefer an idle voice
        var idx = ses.firstIndex { !$0.isActive } ?? seNext
        if idx >= ses.count { idx = 0 }
        seNext = (idx + 1) % ses.count
        let ch = ses[idx]
        ch.stop()
        let token = ch.token
        ch.play(buf, volume: volume, pitch: pitch, pos: 0, loop: false, loopStart: -1, loopLength: -1) { [weak self] in
            self?.q.async { if ch.token == token { ch.isActive = false } }
        }
    }
}

// MARK: - AudioChannel (one AVAudioPlayerNode + varispeed for pitch)

final class AudioChannel {
    let player = AVAudioPlayerNode()
    let speed = AVAudioUnitVarispeed()
    private weak var engine: AVAudioEngine?
    private var format: AVAudioFormat?
    var name = ""
    var token = 0
    var isActive = false
    private var volume: Float = 1
    private var startPos = 0
    private var introFrames = 0
    private var loopStart = 0
    private var loopLength = 0
    private var looping = false
    private var fadeTimer: DispatchSourceTimer?

    init(engine: AVAudioEngine) {
        self.engine = engine
        engine.attach(player)
        engine.attach(speed)
        let fmt = GameAudio.engineFormat
        engine.connect(player, to: speed, format: fmt)
        engine.connect(speed, to: engine.mainMixerNode, format: fmt)
        format = fmt
    }

    static func gain(_ v: Int) -> Float {
        let x = Float(max(0, min(100, v))) / 100
        return x * x
    }

    func setVolume(_ v: Int, pitch: Int) {
        cancelFade()
        volume = Self.gain(v)
        player.volume = volume
        speed.rate = Float(max(50, min(150, pitch))) / 100
    }

    private static func slice(_ b: AVAudioPCMBuffer, from: Int, to: Int) -> AVAudioPCMBuffer? {
        let from = max(0, min(from, Int(b.frameLength)))
        let to = max(from, min(to, Int(b.frameLength)))
        let n = to - from
        guard n > 0, let out = AVAudioPCMBuffer(pcmFormat: b.format, frameCapacity: AVAudioFrameCount(n)),
              let src = b.floatChannelData, let dst = out.floatChannelData else { return nil }
        for c in 0..<Int(b.format.channelCount) {
            memcpy(dst[c], src[c] + from, n * MemoryLayout<Float>.size)
        }
        out.frameLength = AVAudioFrameCount(n)
        return out
    }

    func play(_ buf: AVAudioPCMBuffer, volume v: Int, pitch: Int, pos: Int, loop: Bool,
              loopStart ls: Int, loopLength ll: Int, completion: (() -> Void)? = nil) {
        guard engine != nil else { return }
        player.stop()
        cancelFade()
        // All buffers are normalized to GameAudio.engineFormat; never reconnect at runtime.
        guard buf.format == format, buf.frameLength > 0 else {
            NSLog("[TukuruPlayer] skipped buffer with unexpected format \(buf.format)")
            completion?()
            return
        }
        let total = Int(buf.frameLength)
        var start = max(0, pos)
        if start >= total { start = 0 }
        looping = loop
        if loop {
            var lStart = 0, lEnd = total
            if ls >= 0 && ls < total {
                lStart = ls
                lEnd = ll > 0 ? min(total, ls + ll) : total
            }
            if start >= lEnd { start = lStart }
            loopStart = lStart
            loopLength = max(1, lEnd - lStart)
            startPos = start
            introFrames = lEnd - start
            if start == lStart && lStart == 0 && lEnd == total {
                player.scheduleBuffer(buf, at: nil, options: .loops)
            } else {
                if let intro = Self.slice(buf, from: start, to: lEnd) {
                    player.scheduleBuffer(intro, at: nil, options: [])
                }
                if let body = Self.slice(buf, from: lStart, to: lEnd) {
                    player.scheduleBuffer(body, at: nil, options: .loops)
                }
            }
        } else {
            startPos = 0
            introFrames = total
            let b = start > 0 ? (Self.slice(buf, from: start, to: total) ?? buf) : buf
            player.scheduleBuffer(b, at: nil, options: [], completionCallbackType: .dataPlayedBack) { _ in
                completion?()
            }
        }
        setVolume(v, pitch: pitch)
        isActive = true
        resume()
    }

    /// Resume playback; AVAudioPlayerNode.play() raises an exception (app crash) when the
    /// engine is not running, so always check first.
    func resume() {
        guard let engine, engine.isRunning, engine.attachedNodes.contains(player) else { return }
        player.play()
    }

    func stop() {
        token += 1
        cancelFade()
        player.stop()
        isActive = false
    }

    /// Current position in samples (for Audio.bgm_pos).
    func position() -> Int {
        guard isActive, let nt = player.lastRenderTime, let pt = player.playerTime(forNodeTime: nt) else { return 0 }
        let t = Int(pt.sampleTime)
        if t < introFrames || !looping { return startPos + t }
        return loopStart + (t - introFrames) % max(1, loopLength)
    }

    private func cancelFade() {
        fadeTimer?.cancel()
        fadeTimer = nil
    }

    func fade(ms: Int) {
        guard isActive else { return }
        if ms <= 0 { stop(); return }
        let startVol = player.volume
        let steps = max(1, ms / 20)
        var i = 0
        let token = self.token
        let t = DispatchSource.makeTimerSource(queue: DispatchQueue(label: "tkr.fade"))
        t.schedule(deadline: .now(), repeating: .milliseconds(20))
        t.setEventHandler { [weak self] in
            guard let self, self.token == token else { t.cancel(); return }
            i += 1
            self.player.volume = startVol * Float(max(0, steps - i)) / Float(steps)
            if i >= steps {
                t.cancel()
                self.stop()
            }
        }
        cancelFade()
        fadeTimer = t
        t.resume()
    }

    func fadeIn(ms: Int) {
        let target = volume
        let steps = max(1, ms / 20)
        var i = 0
        let t = DispatchSource.makeTimerSource(queue: DispatchQueue(label: "tkr.fade"))
        t.schedule(deadline: .now(), repeating: .milliseconds(20))
        t.setEventHandler { [weak self] in
            guard let self else { t.cancel(); return }
            i += 1
            self.player.volume = target * Float(min(i, steps)) / Float(steps)
            if i >= steps { t.cancel() }
        }
        cancelFade()
        fadeTimer = t
        t.resume()
    }
}
