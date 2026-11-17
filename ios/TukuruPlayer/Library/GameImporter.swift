import Foundation
import ZIPFoundation

/// Game / RTP import logic (folder copy, ZIP extraction, game folder detection).
/// Pure Foundation + ZIPFoundation so it can be unit-tested outside the app (tools/ImportTests).
enum GameImporter {
    enum ImportError: LocalizedError {
        case notFound(String)
        case unsupported(String)

        var errorDescription: String? {
            switch self {
            case .notFound(let s), .unsupported(let s): return s
            }
        }
    }

    static let scriptNames: Set<String> = ["scripts.rvdata2", "scripts.rvdata", "scripts.rxdata"]
    static let archiveExts: Set<String> = ["rgss3a", "rgss2a", "rgssad"]

    private static func isDirectory(_ url: URL) -> Bool {
        var isDir: ObjCBool = false
        return FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir) && isDir.boolValue
    }

    private static func children(_ dir: URL) -> [URL] {
        let names = (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []
        return names.filter { !$0.hasPrefix(".") }.sorted().map { dir.appendingPathComponent($0) }
    }

    /// Is `dir` itself a game folder (VX / VX Ace / XP)?
    static func isGameRoot(_ dir: URL) -> Bool {
        let items = children(dir)
        let names = items.map { $0.lastPathComponent.lowercased() }
        // encrypted archive (Game.rgss3a, or <ExeName>.rgss3a)
        if names.contains(where: { archiveExts.contains(($0 as NSString).pathExtension) }) { return true }
        // Data/Scripts.rvdata(2)
        if let data = items.first(where: { $0.lastPathComponent.lowercased() == "data" }), isDirectory(data) {
            let d = children(data).map { $0.lastPathComponent.lowercased() }
            if d.contains(where: { scriptNames.contains($0) }) { return true }
        }
        return false
    }

    /// Find the game folder at or below `dir`.
    static func findGameRoot(_ dir: URL, depth: Int = 0) -> URL? {
        if isGameRoot(dir) { return dir }
        guard depth < 6 else { return nil }
        for s in children(dir) where isDirectory(s) {
            if s.lastPathComponent == "__MACOSX" { continue }
            if let r = findGameRoot(s, depth: depth + 1) { return r }
        }
        return nil
    }

    /// A short listing of what is in `dir` (for error messages).
    static func summary(of dir: URL, limit: Int = 14) -> String {
        var lines: [String] = []
        func walk(_ d: URL, _ prefix: String, _ depth: Int) {
            for c in children(d) where c.lastPathComponent != "__MACOSX" {
                if lines.count >= limit { return }
                let isDir = isDirectory(c)
                lines.append(prefix + c.lastPathComponent + (isDir ? "/" : ""))
                if isDir && depth < 2 { walk(c, prefix + "  ", depth + 1) }
            }
        }
        walk(dir, "", 0)
        return lines.isEmpty ? "（空です）" : lines.joined(separator: "\n")
    }

    /// Message when no game folder was found.
    static func notFoundMessage(in dir: URL, source: String) -> String {
        var exe: [String] = []
        func collect(_ d: URL, _ depth: Int) {
            for c in children(d) {
                if isDirectory(c) { if depth < 4 && c.lastPathComponent != "__MACOSX" { collect(c, depth + 1) } }
                else if c.pathExtension.lowercased() == "exe" { exe.append(c.lastPathComponent) }
            }
        }
        collect(dir, 0)
        var msg = "\(source)の中に RPGツクールVX / VX Ace のゲームが見つかりませんでした。\n"
        msg += "（Data フォルダ内の Scripts.rvdata2 / Scripts.rvdata、または Game.rgss3a / Game.rgss2a が必要です）\n"
        if !exe.isEmpty {
            msg += "\n.exe ファイルだけが見つかりました。ゲームが 1 つの exe にまとめられている（暗号化・圧縮された）配布形式の場合は、"
            msg += "そのままでは読み込めません。PC で exe を実行して展開されるタイプなら、展開後のフォルダを ZIP にしてください。\n"
        }
        msg += "\n中身:\n" + summary(of: dir)
        return msg
    }

    /// Join path components below `base`, dropping "..", "." and empty parts.
    static func safeJoin(_ base: URL, _ parts: [String]) -> URL {
        var url = base
        for p in parts where p != ".." && p != "." && !p.isEmpty && !p.contains("\0") {
            url.appendPathComponent(p)
        }
        return url
    }

    /// Split a relative path ("a/b\\c") into safe components.
    static func safeComponents(_ rel: String) -> [String] {
        rel.replacingOccurrences(of: "\\", with: "/").split(separator: "/").map(String.init)
            .filter { $0 != ".." && $0 != "." && !$0.isEmpty }
    }

    /// Decode a ZIP entry name: UTF-8 when valid, otherwise Shift_JIS (CP932), otherwise ZIPFoundation's default.
    static func entryName(_ entry: Entry) -> String {
        let utf = entry.path(using: .utf8)
        if !utf.isEmpty && !utf.contains("\u{FFFD}") { return utf }
        let cp932 = String.Encoding(rawValue: CFStringConvertEncodingToNSStringEncoding(
            CFStringEncoding(CFStringEncodings.dosJapanese.rawValue)))
        let sjis = entry.path(using: cp932)
        if !sjis.isEmpty { return sjis }
        let sjis2 = entry.path(using: .shiftJIS)
        if !sjis2.isEmpty { return sjis2 }
        return entry.path
    }

    /// Unzip handling Shift_JIS file names (common for Japanese games) and zip-slip protection.
    static func unzip(_ zip: URL, to dir: URL) throws {
        let archive = try Archive(url: zip, accessMode: .read)
        let fm = FileManager.default
        var count = 0
        for entry in archive {
            var name = entryName(entry).replacingOccurrences(of: "\\", with: "/")
            let isDirEntry = name.hasSuffix("/") || entry.type == .directory
            name = name.precomposedStringWithCanonicalMapping
            let comps = name.split(separator: "/").map(String.init).filter { $0 != ".." && $0 != "." && !$0.isEmpty }
            guard !comps.isEmpty else { continue }
            // ".." and "." were removed above, so the target is always inside `dir`.
            // (Do not compare standardized paths: on iOS /private/var vs /var differ.)
            let target = safeJoin(dir, comps)
            if isDirEntry {
                try fm.createDirectory(at: target, withIntermediateDirectories: true)
            } else if entry.type != .symlink {
                try fm.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
                if fm.fileExists(atPath: target.path) { try fm.removeItem(at: target) }
                _ = try archive.extract(entry, to: target, skipCRC32: true)
                count += 1
            }
        }
        if count == 0 { throw ImportError.notFound("ZIP にファイルが入っていません") }
    }

    /// Import a game from a folder or ZIP into `dest`. Throws ImportError with a user facing message.
    static func importGame(from url: URL, to dest: URL) throws {
        let fm = FileManager.default
        let staging = fm.temporaryDirectory.appendingPathComponent("import-" + UUID().uuidString, isDirectory: true)
        defer { try? fm.removeItem(at: staging) }
        if isDirectory(url) {
            guard let root = findGameRoot(url) else {
                throw ImportError.notFound(notFoundMessage(in: url, source: "フォルダ"))
            }
            try fm.copyItem(at: root, to: dest)
        } else if url.pathExtension.lowercased() == "zip" {
            try fm.createDirectory(at: staging, withIntermediateDirectories: true)
            do {
                try unzip(url, to: staging)
            } catch let e as ImportError {
                throw e
            } catch {
                throw ImportError.unsupported("ZIP を展開できませんでした（\(error.localizedDescription)）。\n"
                    + "パスワード付きや特殊な圧縮形式の ZIP には対応していません。PC で標準の「圧縮（ZIP形式）フォルダー」で作り直してください。")
            }
            guard let root = findGameRoot(staging) else {
                throw ImportError.notFound(notFoundMessage(in: staging, source: "ZIP "))
            }
            try fm.moveItem(at: root, to: dest)
        } else {
            throw ImportError.unsupported("ゲームのフォルダ、または .zip ファイルを選んでください（選択: \(url.lastPathComponent)）")
        }
    }

    /// Find the RTP root (folder containing Graphics/).
    static func findRTPRoot(_ dir: URL, depth: Int = 0) -> URL? {
        if children(dir).contains(where: { $0.lastPathComponent.lowercased() == "graphics" && isDirectory($0) }) { return dir }
        guard depth < 4 else { return nil }
        for c in children(dir) where isDirectory(c) && c.lastPathComponent != "__MACOSX" {
            if let r = findRTPRoot(c, depth: depth + 1) { return r }
        }
        return nil
    }
}
