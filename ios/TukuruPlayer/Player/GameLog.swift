import Foundation

/// Keeps the recent runtime log of a game session (also written to Documents/Logs/<game>.log)
/// so that crashes can be diagnosed. A marker file records that a session is running; if the app
/// is killed (crash, out of memory, watchdog) the marker remains and the next launch reports it.
final class GameLog {
    private(set) var lines: [String] = []
    private(set) var lastStage = "(開始前)"
    let fileURL: URL
    private let queue = DispatchQueue(label: "tkr.log")
    private let start = Date()

    static var logsDir: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Logs", isDirectory: true)
    }
    static var markerURL: URL { logsDir.appendingPathComponent("active-session.txt") }

    /// Log file of the currently running session (used by the exception handler).
    static var currentFile: URL?

    init(gameID: String) {
        let dir = Self.logsDir
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let safe = gameID.replacingOccurrences(of: "/", with: "_")
        fileURL = dir.appendingPathComponent(safe + ".log")
        try? Data().write(to: fileURL)
        try? Data(fileURL.path.utf8).write(to: Self.markerURL)
        Self.currentFile = fileURL
        Self.installExceptionHandler()
        add("session start: \(Date())")
        add("app \(AppSettings.versionString), iOS \(ProcessInfo.processInfo.operatingSystemVersionString), memory \(ProcessInfo.processInfo.physicalMemory / 1_048_576)MB")
    }

    /// Normal end of the session.
    func endSession() {
        add("session end")
        queue.sync {}
        try? FileManager.default.removeItem(at: Self.markerURL)
        Self.currentFile = nil
    }

    func stage(_ s: String) {
        lastStage = s
        add("[stage] " + s)
    }

    func add(_ s: String) {
        let t = String(format: "%7.2f", Date().timeIntervalSince(start))
        let line = "[\(t)] " + s
        lines.append(line)
        if lines.count > 400 { lines.removeFirst(lines.count - 400) }
        let url = fileURL
        queue.async {
            Self.append(line, to: url)
        }
    }

    static func append(_ line: String, to url: URL) {
        guard let h = try? FileHandle(forWritingTo: url) else { return }
        defer { try? h.close() }
        _ = try? h.seekToEnd()
        try? h.write(contentsOf: Data((line + "\n").utf8))
    }

    func tail(_ n: Int) -> String {
        lines.suffix(n).joined(separator: "\n")
    }

    // MARK: crash reporting

    private static var handlerInstalled = false

    private static func installExceptionHandler() {
        guard !handlerInstalled else { return }
        handlerInstalled = true
        NSSetUncaughtExceptionHandler { e in
            guard let url = GameLog.currentFile else { return }
            let stack = e.callStackSymbols.prefix(25).joined(separator: "\n")
            GameLog.append("!!! APP CRASH (exception) \(e.name.rawValue): \(e.reason ?? "")\n\(stack)", to: url)
        }
    }

    /// If the previous session did not end normally, returns its log file.
    static func previousAbnormalSession() -> URL? {
        guard let data = try? Data(contentsOf: markerURL),
              let path = String(data: data, encoding: .utf8) else { return nil }
        try? FileManager.default.removeItem(at: markerURL)
        let url = URL(fileURLWithPath: path)
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }
}
