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

    init(game: GameEntry) {
        self.game = game
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
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
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
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
        menuButton.translatesAutoresizingMaskIntoConstraints = false
        menuButton.addTarget(self, action: #selector(showPauseMenu), for: .touchUpInside)
        menuButton.accessibilityLabel = "メニュー"
        view.addSubview(menuButton)
        NSLayoutConstraint.activate([
            menuButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 6),
            menuButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -10),
            menuButton.widthAnchor.constraint(equalToConstant: 40),
            menuButton.heightAnchor.constraint(equalToConstant: 40),
        ])
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
            audio.handle(op: body["op"] as? String ?? "", args: body["args"] as? [Any] ?? [])
        case "save":
            if let path = body["path"] as? String, let b64 = body["data"] as? String,
               let data = Data(base64Encoded: b64) {
                let fs = self.fs!
                DispatchQueue.global(qos: .utility).async { fs.writeSave(path, data: data) }
            }
        case "delete":
            if let path = body["path"] as? String { fs.deleteSave(path) }
        case "exit":
            close()
        case "error":
            NSLog("[TukuruPlayer] game error: \(body["title"] ?? "") \(body["text"] ?? "")")
        case "log":
            #if DEBUG
            NSLog("[game] \(body["text"] ?? "")")
            #endif
        default:
            break
        }
    }

    // MARK: WKNavigationDelegate / WKUIDelegate

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        let alert = UIAlertController(title: "ゲームが終了しました",
                                      message: "メモリ不足などによりゲームの実行が停止しました。",
                                      preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "再起動", style: .default) { _ in
            webView.load(URLRequest(url: SchemeHandler.startURL))
        })
        alert.addAction(UIAlertAction(title: "ライブラリに戻る", style: .cancel) { [weak self] _ in self?.close() })
        present(alert, animated: true)
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
