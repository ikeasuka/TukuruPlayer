import GameController
import UIKit
import WebKit

/// Full-screen game player: WKWebView running the RGSS web runtime, native audio,
/// game controller / keyboard input, on-screen virtual pad and a pause menu.
final class PlayerViewController: GCEventViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    let game: GameEntry
    var onClose: (() -> Void)?

    private var webView: WKWebView!
    private var fs: GameFileSystem!
    private var schemeHandler: SchemeHandler!
    private var audio: GameAudio!
    private let controllers = ControllerManager()
    private let pad = VirtualPadView()
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

        pad.frame = view.bounds
        pad.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        pad.onMaskChange = { [weak self] m in
            self?.padMask = m
            self?.sendMask()
        }
        view.addSubview(pad)

        menuButton.setImage(UIImage(systemName: "line.3.horizontal.circle"), for: .normal)
        menuButton.tintColor = UIColor(white: 1, alpha: 0.6)
        menuButton.addTarget(self, action: #selector(menuButtonTapped), for: .touchUpInside)
        menuButton.alpha = 0.02
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

    /// Game area: full width at the top in portrait (controls go below), centered in landscape.
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let b = view.bounds
        let safe = b.inset(by: view.safeAreaInsets)
        let aspect = gameSize.width / max(1, gameSize.height)
        let game: CGRect
        let padShown = !pad.isHidden
        if b.height > b.width {
            let w = safe.width
            let h = min(safe.height, (w / aspect).rounded())
            game = CGRect(x: safe.minX, y: safe.minY, width: w, height: h)
        } else {
            // Landscape: keep black side margins wide enough for the D-pad and buttons.
            let minMargin: CGFloat = padShown ? 130 : 0
            var h = safe.height
            var w = min(safe.width, (h * aspect).rounded())
            if (safe.width - w) / 2 < minMargin {
                w = max(safe.width * 0.5, safe.width - minMargin * 2)
                h = (w / aspect).rounded()
            }
            game = CGRect(x: (b.width - w) / 2, y: safe.minY + (safe.height - h) / 2, width: w, height: h)
        }
        if webView.frame != game { webView.frame = game }
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

    private var menuRevealed = false
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
            // alpha must stay above 0.01 so the hidden button still receives taps
            self.menuButton.alpha = on ? 1.0 : 0.02
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

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        log.add("!!! web content process terminated")
        let alert = UIAlertController(title: "ゲームが終了しました",
                                      message: "ゲームの実行が停止しました（メモリ不足など）。\n\n最後の処理: \(log.lastStage)\n\n"
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

    private func shareLog() {
        let vc = UIActivityViewController(activityItems: [log.fileURL], applicationActivities: nil)
        vc.popoverPresentationController?.sourceView = view
        vc.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        vc.completionWithItemsHandler = { [weak self] _, _, _, _ in
            // offer the crash dialog again
            guard let self, let wv = self.webView else { return }
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
