import Foundation
import WebKit

/// Serves the bundled web runtime and the game's files to the WKWebView via the `tkr://` scheme.
///   tkr://local/index.html, app.js, ruby.wasm  -> app bundle (WebRuntime/)
///   tkr://local/game/<path>                    -> GameFileSystem (case-insensitive, archive, RTP)
///   tkr://local/game/__boot.json               -> boot information
final class SchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "tkr"
    static let startURL = URL(string: "tkr://local/index.html")!

    private let fs: GameFileSystem
    private let runtimeDir: URL
    private let queue = DispatchQueue(label: "tkr.scheme", qos: .userInitiated, attributes: .concurrent)
    private var active = Set<ObjectIdentifier>()

    init(fs: GameFileSystem) {
        self.fs = fs
        runtimeDir = Bundle.main.resourceURL!.appendingPathComponent("WebRuntime")
        super.init()
    }

    private static func mime(for name: String) -> String {
        switch (name as NSString).pathExtension.lowercased() {
        case "html": return "text/html"
        case "js": return "text/javascript"
        case "wasm": return "application/wasm"
        case "json": return "application/json"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "bmp": return "image/bmp"
        case "ttf": return "font/ttf"
        case "otf": return "font/otf"
        case "ogg": return "audio/ogg"
        case "wav": return "audio/wav"
        case "mp3": return "audio/mpeg"
        default: return "application/octet-stream"
        }
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        let id = ObjectIdentifier(task)
        active.insert(id)
        guard let url = task.request.url else { return }
        let path = url.path.removingPercentEncoding ?? url.path
        queue.async { [weak self] in
            guard let self else { return }
            var body: Data?
            var mime = "application/octet-stream"
            if path.hasPrefix("/game/") {
                let rel = String(path.dropFirst("/game/".count))
                if rel == "__boot.json" {
                    body = self.fs.bootInfo(settings: AppSettings.webSettings)
                    mime = "application/json"
                } else if let item = self.fs.resolve(rel) {
                    body = try? self.fs.data(for: item)
                    mime = Self.mime(for: item.name)
                }
            } else {
                let rel = path == "/" ? "index.html" : String(path.dropFirst())
                let fileURL = self.runtimeDir.appendingPathComponent(rel).standardizedFileURL
                if fileURL.path.hasPrefix(self.runtimeDir.standardizedFileURL.path) {
                    body = try? Data(contentsOf: fileURL, options: .mappedIfSafe)
                    mime = Self.mime(for: rel)
                }
            }
            DispatchQueue.main.async {
                guard self.active.contains(id) else { return }
                self.active.remove(id)
                if let body {
                    let resp = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: [
                        "Content-Type": mime,
                        "Content-Length": String(body.count),
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "no-cache",
                    ])!
                    task.didReceive(resp)
                    task.didReceive(body)
                    task.didFinish()
                } else {
                    let resp = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: [
                        "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*",
                    ])!
                    task.didReceive(resp)
                    task.didReceive(Data())
                    task.didFinish()
                }
            }
        }
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {
        active.remove(ObjectIdentifier(task))
    }
}
