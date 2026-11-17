import Foundation

/// Keeps the recent runtime log of a game session (also written to Documents/Logs/<game>.log)
/// so that a crash of the web process can be diagnosed.
final class GameLog {
    private(set) var lines: [String] = []
    private(set) var lastStage = "(開始前)"
    let fileURL: URL
    private let queue = DispatchQueue(label: "tkr.log")
    private let start = Date()

    init(gameID: String) {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Logs", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let safe = gameID.replacingOccurrences(of: "/", with: "_")
        fileURL = dir.appendingPathComponent(safe + ".log")
        try? Data().write(to: fileURL)
        add("session start: \(Date())")
        add("device: \(ProcessInfo.processInfo.operatingSystemVersionString), memory \(ProcessInfo.processInfo.physicalMemory / 1_048_576)MB")
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
            guard let h = try? FileHandle(forWritingTo: url) else { return }
            defer { try? h.close() }
            _ = try? h.seekToEnd()
            try? h.write(contentsOf: Data((line + "\n").utf8))
        }
    }

    func tail(_ n: Int) -> String {
        lines.suffix(n).joined(separator: "\n")
    }
}
