import GameController
import UIKit
import WebKit

/// Full-screen game player: WKWebView running the RGSS web runtime, native audio,
/// game controller / keyboard input, on-screen virtual pad and a pause menu.
final class PlayerViewController: GCEventViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate,
    UIGestureRecognizerDelegate {
    let game: GameEntry
    var onClose: (() -> Void)?

    private var webView: WKWebView!
    private var fs: GameFileSystem!
    private var schemeHandler: SchemeHandler!
    private var audio: GameAudio!
    private let controllers = ControllerManager()
    private let pad = VirtualPadView()
    private var lastLoggedSize = CGSize.zero
    private let menuButton = UIButton(type: .system)
    private let pauseMenu = PauseMenuView()
    private var padMask: UInt32 = 0
    private var controllerMask: UInt32 = 0
    private var lastSentMask: UInt32 = .max
    private var observers: [NSObjectProtocol] = []
    private var closed = false
    private lazy var log = GameLog(gameID: game.id)
    /// Game resolution (reported by the runtime on Graphics.resize_screen).
    private var gameSize = CGSize(width: 544, height: 416)

    init(game: GameEntry) {
        self.game = game
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
        modalPresentationCapturesStatusBarAppearance = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        // Let game controllers drive the game rather than UIKit focus navigation.
        controllerUserInteractionEnabled = false
        log.stage("open game: \(game.title) (VX\(game.engine == 3 ? " Ace" : ""))")

        fs = GameFileSystem(root: game.url, rtpRoots: GameLibrary.rtpRoots(for: game))
        audio = GameAudio(fs: fs)
        schemeHandler = SchemeHandler(fs: fs)

        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(schemeHandler, forURLScheme: SchemeHandler.scheme)
        config.userContentController.add(WeakMessageHandler(self), name: "tkr")
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.suppressesIncrementalRendering = false
        if AppSettings.defaults.bool(forKey: AppSettings.Key.noJIT) {
            if let pool = Self.noJITProcessPool() {
                config.processPool = pool
                log.stage("JIT disabled for the web process")
            } else {
                log.stage("JIT setting not supported on this iOS")
            }
        }
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        #if DEBUG
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        #endif
        view.addSubview(webView)
        // touching the game screen reveals the menu button
        let tap = UITapGestureRecognizer(target: self, action: #selector(gameTapped))
        tap.cancelsTouchesInView = false
        tap.delegate = self
        webView.addGestureRecognizer(tap)

        pad.frame = view.bounds
        pad.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        pad.onLayout = { [weak self] desc in self?.log.stage("pad layout: \(desc)") }
        pad.onMaskChange = { [weak self] m in
            self?.padMask = m
            self?.sendMask()
        }
        view.addSubview(pad)

        menuButton.setImage(UIImage(systemName: "line.3.horizontal.circle"), for: .normal)
        menuButton.tintColor = UIColor(white: 1, alpha: 0.6)
        menuButton.addTarget(self, action: #selector(menuButtonTapped), for: .touchUpInside)
        menuButton.alpha = Self.menuIdleAlpha
        menuButton.accessibilityLabel = "メニュー"
        view.addSubview(menuButton)
        menuButton.contentVerticalAlignment = .fill
        menuButton.contentHorizontalAlignment = .fill

        pauseMenu.frame = view.bounds
        pauseMenu.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        pauseMenu.isHidden = true
        pauseMenu.onSelect = { [weak self] action in self?.handleMenu(action) }
        view.addSubview(pauseMenu)

        controllers.onMaskChange = { [weak self] m in
            self?.controllerMask = m
            self?.sendMask()
        }
        controllers.onPauseMenu = { [weak self] in
            guard let self else { return }
            if self.pauseMenu.isHidden { self.showPauseMenu() } else { self.hidePauseMenu() }
        }
        controllers.onConnectionChange = { [weak self] _ in self?.applyPadVisibility() }

        audio.onBGMPosition = { [weak self] pos in
            self?.webView.evaluateJavaScript("window.TKRNative&&TKRNative.bgmPos(\(pos))", completionHandler: nil)
        }

        let nc = NotificationCenter.default
        observers.append(nc.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
            self?.setPaused(true)
        })
        observers.append(nc.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            guard let self, self.pauseMenu.isHidden else { return }
            self.setPaused(false)
        })
        observers.append(nc.addObserver(forName: UserDefaults.didChangeNotification, object: nil, queue: .main) { [weak self] _ in
            self?.applySettings()
        })

        applySettings()
        webView.load(URLRequest(url: SchemeHandler.startURL))
        game.markPlayed()
    }

    /// A process pool whose web content processes run without JIT (private _WKProcessPoolConfiguration).
    private static var cachedNoJITPool: WKProcessPool?
    private static func noJITProcessPool() -> WKProcessPool? {
        if let p = cachedNoJITPool { return p }
        guard let cfgClass = NSClassFromString("_WKProcessPoolConfiguration") as? NSObject.Type else { return nil }
        let cfg = cfgClass.init()
        guard cfg.responds(to: NSSelectorFromString("setJITEnabled:")) else { return nil }
        cfg.setValue(false, forKey: "JITEnabled")
        let initSel = NSSelectorFromString("_initWithConfiguration:")
        guard let allocated = (WKProcessPool.self as AnyObject).perform(NSSelectorFromString("alloc"))?
                .takeUnretainedValue() as? NSObject,
              allocated.responds(to: initSel),
              let pool = allocated.perform(initSel, with: cfg)?.takeUnretainedValue() as? WKProcessPool
        else { return nil }
        cachedNoJITPool = pool
        return pool
    }

    /// Game area: full width at the top in portrait (controls go below), centered in landscape.
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let b = view.bounds
        // Cap the insets: landscape sometimes reports huge left/right insets (see VirtualPadView).
        let raw = view.safeAreaInsets
        let insets = UIEdgeInsets(top: min(raw.top, 60), left: min(raw.left, 50),
                                  bottom: min(raw.bottom, 34), right: min(raw.right, 50))
        let safe = b.inset(by: insets)
        if b.size != lastLoggedSize {
            lastLoggedSize = b.size
            log.stage("layout \(Int(b.width))x\(Int(b.height)) safe area \(Int(raw.top)),\(Int(raw.left)),\(Int(raw.bottom)),\(Int(raw.right))")
        }
        let aspect = gameSize.width / max(1, gameSize.height)
        let game: CGRect
        if b.height > b.width {
            let w = safe.width
            let h = min(safe.height, (w / aspect).rounded())
            game = CGRect(x: safe.minX, y: safe.minY, width: w, height: h)
        } else {
            // Landscape: use the full screen height (aspect ratio kept); the pad goes in the side margins.
            let h0 = b.height - insets.top - insets.bottom
            var h = h0
            var w = (h * aspect).rounded()
            if w > safe.width { w = safe.width; h = (w / aspect).rounded() }
            game = CGRect(x: (b.width - w) / 2, y: safe.minY + (h0 - h) / 2, width: w, height: h)
        }
        if webView.frame != game {
            webView.frame = game
            // WKWebView doesn't always fire 'resize' when only its frame changes (e.g. on rotation).
            webView.evaluateJavaScript("window.dispatchEvent(new Event('resize'))", completionHandler: nil)
        }
        pad.frame = b
        pad.gameRect = game
        // menu button: top-left corner (hidden until the corner is tapped)
        let size: CGFloat = 60
        menuButton.frame = CGRect(x: safe.minX + 2, y: safe.minY + 2, width: size, height: size)
        menuButton.imageEdgeInsets = UIEdgeInsets(top: 10, left: 10, bottom: 10, right: 10)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        setNeedsStatusBarAppearanceUpdate()
        setNeedsUpdateOfHomeIndicatorAutoHidden()
    }

    // MARK: menu button (auto-hide)

    /// Faintly visible when idle; fully visible for a few seconds after touching the game.
    private static let menuIdleAlpha: CGFloat = 0.35
    private var menuRevealed = false

    @objc private func gameTapped() {
        if !menuRevealed { setMenuRevealed(true) }
    }
    private var menuHideWork: DispatchWorkItem?

    /// First tap near the corner reveals the button; a tap while visible opens the menu.
    @objc private func menuButtonTapped() {
        if menuRevealed {
            setMenuRevealed(false)
            showPauseMenu()
        } else {
            setMenuRevealed(true)
        }
    }

    private func setMenuRevealed(_ on: Bool) {
        menuRevealed = on
        menuHideWork?.cancel()
        UIView.animate(withDuration: 0.2) {
            self.menuButton.alpha = on ? 1.0 : Self.menuIdleAlpha
        }
        if on {
            let work = DispatchWorkItem { [weak self] in self?.setMenuRevealed(false) }
            menuHideWork = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 3, execute: work)
        }
    }

    deinit {
        observers.forEach(NotificationCenter.default.removeObserver)
    }

    // MARK: settings / input

    private func applySettings() {
        let d = AppSettings.defaults
        pad.alpha = CGFloat(d.double(forKey: AppSettings.Key.padOpacity))
        pad.haptics = d.bool(forKey: AppSettings.Key.padHaptics)
        pad.padScale = CGFloat(max(0.6, d.double(forKey: AppSettings.Key.padScale)))
        controllers.reloadMapping()
        applyPadVisibility()
        if let json = try? JSONSerialization.data(withJSONObject: AppSettings.webSettings),
           let s = String(data: json, encoding: .utf8) {
            webView?.evaluateJavaScript("window.TKRNative&&TKRNative.settings(\(s))", completionHandler: nil)
        }
    }

    private func applyPadVisibility() {
        let mode = AppSettings.defaults.string(forKey: AppSettings.Key.padMode) ?? "auto"
        let show: Bool
        switch mode {
        case "always": show = true
        case "never": show = false
        default: show = !controllers.hasGamepad
        }
        if pad.isHidden == show {
            pad.isHidden = !show
            if !show { pad.releaseAll() }
            view.setNeedsLayout()
        }
    }

    private func sendMask() {
        let m = padMask | controllerMask
        guard m != lastSentMask else { return }
        lastSentMask = m
        webView.evaluateJavaScript("window.TKRNative&&TKRNative.input(\(m))", completionHandler: nil)
    }

    private func setPaused(_ p: Bool) {
        audio.setPaused(p)
        webView.evaluateJavaScript("window.TKRNative&&TKRNative.pause(\(p))", completionHandler: nil)
    }

    // MARK: pause menu

    @objc private func showPauseMenu() {
        guard pauseMenu.isHidden else { return }
        setPaused(true)
        pad.releaseAll()
        pauseMenu.padVisible = !pad.isHidden
        pauseMenu.show()
        controllers.menuHandler = { [weak self] e in
            guard let self else { return }
            switch e {
            case .up: self.pauseMenu.move(-1)
            case .down: self.pauseMenu.move(1)
            case .confirm: self.pauseMenu.confirm()
            case .cancel: self.hidePauseMenu()
            }
        }
    }

    private func hidePauseMenu() {
        pauseMenu.isHidden = true
        controllers.menuHandler = nil
        setPaused(false)
    }

    private func handleMenu(_ action: PauseMenuView.Action) {
        switch action {
        case .resume:
            hidePauseMenu()
        case .reset:
            hidePauseMenu()
            webView.evaluateJavaScript("window.TKRNative&&TKRNative.reset()", completionHandler: nil)
        case .togglePad:
            let showing = !pad.isHidden
            AppSettings.defaults.set(showing ? "never" : "always", forKey: AppSettings.Key.padMode)
            applyPadVisibility()
            pauseMenu.padVisible = !pad.isHidden
        case .shareLog:
            shareLog(afterCrash: false)
        case .quit:
            close()
        }
    }

    private func close() {
        guard !closed else { return }
        closed = true
        controllers.menuHandler = nil
        log.endSession()
        audio.shutdown()
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "tkr")
        webView.stopLoading()
        dismiss(animated: true) { [onClose] in onClose?() }
    }

    func gestureRecognizer(_ g: UIGestureRecognizer,
                           shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { true }

    // MARK: WKScriptMessageHandler

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "audio":
            let op = body["op"] as? String ?? ""
            let args = body["args"] as? [Any] ?? []
            log.add("audio \(op) \(args.map { "\($0)" }.joined(separator: ","))")
            audio.handle(op: op, args: args)
        case "save":
            if let path = body["path"] as? String, let b64 = body["data"] as? String,
               let data = Data(base64Encoded: b64) {
                log.add("file write: \(path) (\(data.count) bytes)")
                let fs = self.fs!
                DispatchQueue.global(qos: .utility).async { fs.writeSave(path, data: data) }
            }
        case "delete":
            if let path = body["path"] as? String { fs.deleteSave(path) }
        case "exit":
            close()
        case "error":
            log.add("ERROR \(body["title"] ?? "") \(body["text"] ?? "")")
        case "log":
            log.add("\(body["level"] ?? "info"): \(body["text"] ?? "")")
        case "stage":
            log.stage(body["name"] as? String ?? "")
        case "resolution":
            if let w = body["w"] as? Int, let h = body["h"] as? Int, w > 0, h > 0 {
                gameSize = CGSize(width: w, height: h)
                view.setNeedsLayout()
            }
        default:
            break
        }
    }

    // MARK: WKNavigationDelegate / WKUIDelegate

    /// WebKit (private delegate method) reports why the web process was terminated.
    /// When implemented, WebKit calls this instead of webViewWebContentProcessDidTerminate.
    @objc(_webView:webContentProcessDidTerminateWithReason:)
    func webViewProcessDidTerminate(_ webView: WKWebView, reason: Int) {
        let names = [0: "ExceededMemoryLimit（メモリ上限）", 1: "ExceededCPULimit（CPU使用量の上限）",
                     2: "RequestedByClient", 3: "Crash（WebKit内部のクラッシュ）"]
        log.add("!!! termination reason: \(reason) \(names[reason] ?? "")")
        terminationReason = names[reason] ?? "コード \(reason)"
        webViewWebContentProcessDidTerminate(webView)
    }

    private var terminationReason: String?
    private var lastTerminationAlert = Date.distantPast

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // avoid a second alert if WebKit reports the termination through both delegate methods
        if Date().timeIntervalSince(lastTerminationAlert) < 1 { return }
        lastTerminationAlert = Date()
        log.add("!!! web content process terminated")
        let alert = UIAlertController(title: "ゲームが終了しました",
                                      message: "ゲームの実行が停止しました。\n理由: \(terminationReason ?? "不明")\n\n最後の処理: \(log.lastStage)\n\n"
                                        + log.tail(6),
                                      preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "再起動", style: .default) { [weak self] _ in
            self?.log.stage("restart")
            webView.load(URLRequest(url: SchemeHandler.startURL))
        })
        alert.addAction(UIAlertAction(title: "ログを共有", style: .default) { [weak self] _ in
            self?.shareLog()
        })
        alert.addAction(UIAlertAction(title: "ライブラリに戻る", style: .cancel) { [weak self] _ in self?.close() })
        present(alert, animated: true)
    }

    private func shareLog(afterCrash: Bool = true) {
        let vc = UIActivityViewController(activityItems: [log.fileURL], applicationActivities: nil)
        vc.popoverPresentationController?.sourceView = view
        vc.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        vc.completionWithItemsHandler = { [weak self] _, _, _, _ in
            // offer the crash dialog again
            guard afterCrash, let self, let wv = self.webView else { return }
            self.webViewWebContentProcessDidTerminate(wv)
        }
        present(vc, animated: true)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(navigationAction.request.url?.scheme == SchemeHandler.scheme ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: game.title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }
}

/// Avoids the retain cycle WKUserContentController -> handler.
final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(ucc, didReceive: message)
    }
}
