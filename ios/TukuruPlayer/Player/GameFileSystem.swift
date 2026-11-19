import Foundation

/// Virtual filesystem for a game: the game folder, its encrypted archive and the RTP,
/// with Windows-like case-insensitive lookup and extension search.
/// Mirrors web/dev/gamefs.mjs (used by the desktop dev server).
final class GameFileSystem {
    enum Source {
        case disk(URL)
        case archive(RGSSArchive.Entry)
    }

    struct Item {
        let name: String   // relative path with original case
        let source: Source
    }

    static let imageExts = [".png", ".jpg", ".jpeg", ".bmp"]
    static let audioExts = [".ogg", ".wav", ".mp3", ".m4a", ".mid", ".midi", ".aac", ".caf"]
    static let dataExts = [".rvdata2", ".rvdata", ".rxdata"]
    static let fontExts = [".ttf", ".otf", ".ttc"]
    static let allExts = imageExts + audioExts + dataExts + fontExts

    let root: URL
    private(set) var archive: RGSSArchive?
    private var archiveKind = ""
    private var index: [String: Item] = [:]
    private var rtp: [String: Item] = [:]
    private let lock = NSLock()

    init(root: URL, rtpRoots: [URL]) {
        self.root = root
        let fm = FileManager.default
        if let names = try? fm.contentsOfDirectory(atPath: root.path) {
            // Game.rgss3a normally, but RGSS uses <exe name>.rgss3a, so accept any name.
            let sorted = names.sorted { a, b in
                let ga = a.lowercased().hasPrefix("game."), gb = b.lowercased().hasPrefix("game.")
                return ga != gb ? ga : a < b
            }
            outer: for ext in ["rgss3a", "rgss2a", "rgssad"] {
                for n in sorted where (n as NSString).pathExtension.lowercased() == ext {
                    if let a = try? RGSSArchive(url: root.appendingPathComponent(n)) {
                        archive = a
                        archiveKind = ext
                        break outer
                    }
                }
            }
        }
        if let a = archive {
            for (k, e) in a.entries { index[k] = Item(name: e.name, source: .archive(e)) }
        }
        Self.walk(self.root) { rel, url in
            self.index[rel.lowercased()] = Item(name: rel, source: .disk(url))
        }
        for r in rtpRoots {
            Self.walk(r) { rel, url in
                let k = rel.lowercased()
                if self.rtp[k] == nil { self.rtp[k] = Item(name: rel, source: .disk(url)) }
            }
        }
    }

    /// Enumerate files below `dir`, passing the relative path ("Graphics/System/Window.png").
    static func walk(_ dir: URL, _ cb: (String, URL) -> Void) {
        let fm = FileManager.default
        // enumerator(atPath:) yields relative paths, so no string prefix comparison is needed
        // (iOS reports some paths as /private/var/... and others as /var/...).
        guard let en = fm.enumerator(atPath: dir.path) else { return }
        while let rel = en.nextObject() as? String {
            let parts = rel.split(separator: "/")
            if parts.contains(where: { $0.hasPrefix(".") }) { continue }
            let url = dir.appendingPathComponent(rel)
            var isDir: ObjCBool = false
            if fm.fileExists(atPath: url.path, isDirectory: &isDir), !isDir.boolValue {
                cb(rel, url)
            }
        }
    }

    /// 3 = VX Ace (RGSS3), 2 = VX (RGSS2), 1 = XP (RGSS1, unsupported), 0 = unknown
    var engine: Int {
        func has(_ p: String) -> Bool { index[p.lowercased()] != nil }
        if archiveKind == "rgss3a" || has("Data/Scripts.rvdata2") { return 3 }
        if archiveKind == "rgss2a" || has("Data/Scripts.rvdata") { return 2 }
        if archiveKind == "rgssad" || has("Data/Scripts.rxdata") { return 1 }
        return 0
    }

    func resolve(_ path: String) -> Item? {
        var n = path.replacingOccurrences(of: "\\", with: "/")
        if n.hasPrefix("./") { n.removeFirst(2) }
        while n.hasPrefix("/") { n.removeFirst() }
        let k = n.lowercased()
        lock.lock(); defer { lock.unlock() }
        if let i = index[k] ?? rtp[k] { return i }
        for ext in Self.allExts {
            if let i = index[k + ext] ?? rtp[k + ext] { return i }
        }
        return nil
    }

    func data(for item: Item) throws -> Data {
        switch item.source {
        case .disk(let url): return try Data(contentsOf: url, options: .mappedIfSafe)
        case .archive(let e):
            guard let a = archive else { throw CocoaError(.fileNoSuchFile) }
            return try a.data(for: e)
        }
    }

    func readText(_ path: String) -> String? {
        guard let i = resolve(path), let d = try? data(for: i) else { return nil }
        return String(data: d, encoding: .utf8) ?? String(data: d, encoding: .shiftJIS)
    }

    /// Value of Key= in Game.ini [Game] section.
    func iniValue(_ key: String) -> String? {
        guard let text = readText("Game.ini") else { return nil }
        for line in text.components(separatedBy: .newlines) {
            let parts = line.split(separator: "=", maxSplits: 1).map { $0.trimmingCharacters(in: .whitespaces) }
            if parts.count == 2, parts[0].lowercased() == key.lowercased() { return parts[1] }
        }
        return nil
    }

    var title: String {
        iniValue("Title").flatMap { $0.isEmpty ? nil : $0 } ?? root.lastPathComponent
    }

    /// JSON consumed by the web runtime at startup (see web/src/main.js).
    func bootInfo(settings: [String: Any]) -> Data {
        lock.lock()
        var files: [String] = []
        files.reserveCapacity(index.count + rtp.count)
        for (_, i) in index { files.append(i.name) }
        for (k, i) in rtp where index[k] == nil { files.append(i.name) }
        var preload: [String: String] = [:]
        for (_, i) in index {
            guard case .disk(let url) = i.source else { continue }
            let lower = i.name.lowercased()
            let top = !i.name.contains("/")
            let isSave = (lower.hasSuffix(".rvdata2") || lower.hasSuffix(".rvdata") || lower.hasSuffix(".rxdata")
                || lower.hasSuffix(".sav") || lower.hasSuffix(".dat")) && !lower.hasPrefix("data/")
            let small = lower.hasSuffix(".ini") || lower.hasSuffix(".txt") || lower.hasSuffix(".json") || lower.hasSuffix(".csv")
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            if ((top && (isSave || small)) || isSave) && size < 8 * 1024 * 1024,
               let d = try? Data(contentsOf: url) {
                preload[i.name] = d.base64EncodedString()
            }
        }
        lock.unlock()
        let info: [String: Any] = [
            "engine": engine,
            "title": title,
            "files": files,
            "preload": preload,
            "settings": settings,
        ]
        return (try? JSONSerialization.data(withJSONObject: info)) ?? Data("{}".utf8)
    }

    // MARK: native engine

    /// Write the files of the encrypted archive (Game.rgss3a ...) into the game folder, so the
    /// native engine can read them as ordinary files. Existing files are kept (they override
    /// the archive, as in RGSS). Returns the number of files written.
    @discardableResult
    func extractArchive() -> Int {
        guard let a = archive else { return 0 }
        let fm = FileManager.default
        let marker = root.appendingPathComponent(".tkr_extracted")
        if fm.fileExists(atPath: marker.path) { return 0 }
        var written = 0
        for (_, e) in a.entries {
            let parts = GameImporter.safeComponents(e.name)
            guard !parts.isEmpty else { continue }
            let url = GameImporter.safeJoin(root, parts)
            if fm.fileExists(atPath: url.path) { continue }
            guard let data = try? a.data(for: e) else { continue }
            try? fm.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            if (try? data.write(to: url)) != nil { written += 1 }
        }
        try? Data().write(to: marker)
        return written
    }

    // MARK: saves

    private func safeURL(_ rel: String) -> URL? {
        let parts = GameImporter.safeComponents(rel)
        guard !parts.isEmpty else { return nil }
        return GameImporter.safeJoin(root, parts)
    }

    func writeSave(_ rel: String, data: Data) {
        guard let url = safeURL(rel) else { return }
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        do {
            try data.write(to: url, options: .atomic)
            lock.lock()
            index[rel.lowercased()] = Item(name: rel, source: .disk(url))
            lock.unlock()
        } catch {
            NSLog("[TukuruPlayer] save failed: \(error)")
        }
    }

    func deleteSave(_ rel: String) {
        guard let url = safeURL(rel) else { return }
        try? FileManager.default.removeItem(at: url)
        lock.lock()
        index.removeValue(forKey: rel.lowercased())
        lock.unlock()
    }
}
