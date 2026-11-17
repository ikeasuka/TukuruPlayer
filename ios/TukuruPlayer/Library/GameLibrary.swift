import Foundation
import SwiftUI
import ZIPFoundation

/// A game folder inside Documents/Games.
struct GameEntry: Identifiable, Hashable {
    let id: String          // folder name
    let url: URL
    let title: String
    let engine: Int         // 3 = VX Ace, 2 = VX, 1 = XP, 0 = unknown

    var engineLabel: String {
        switch engine {
        case 3: return "VX Ace"
        case 2: return "VX"
        case 1: return "XP（非対応）"
        default: return "不明"
        }
    }

    var playable: Bool { engine == 2 || engine == 3 }

    var lastPlayed: Date? {
        let t = Settings.defaults.double(forKey: "lastPlayed." + id)
        return t > 0 ? Date(timeIntervalSince1970: t) : nil
    }

    func markPlayed() {
        Settings.defaults.set(Date().timeIntervalSince1970, forKey: "lastPlayed." + id)
    }
}

@MainActor
final class GameLibrary: ObservableObject {
    @Published private(set) var games: [GameEntry] = []
    @Published var importing: String?
    @Published var lastError: String?

    static var documents: URL { FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0] }
    static var gamesDir: URL { documents.appendingPathComponent("Games", isDirectory: true) }
    static var rtpDir: URL { documents.appendingPathComponent("RTP", isDirectory: true) }
    static var soundFontDir: URL { documents.appendingPathComponent("SoundFont", isDirectory: true) }
    static let rtpNames = [3: "RPGVXAce", 2: "RPGVX"]

    init() {
        let fm = FileManager.default
        for d in [Self.gamesDir, Self.rtpDir, Self.soundFontDir] {
            try? fm.createDirectory(at: d, withIntermediateDirectories: true)
        }
        for (_, n) in Self.rtpNames {
            try? fm.createDirectory(at: Self.rtpDir.appendingPathComponent(n), withIntermediateDirectories: true)
        }
        refresh()
    }

    static func rtpRoots(for game: GameEntry) -> [URL] {
        guard let n = rtpNames[game.engine] else { return [] }
        return [rtpDir.appendingPathComponent(n, isDirectory: true)]
    }

    static func rtpInstalled(engine: Int) -> Bool {
        guard let n = rtpNames[engine] else { return false }
        let dir = rtpDir.appendingPathComponent(n).appendingPathComponent("Graphics")
        return (try? FileManager.default.contentsOfDirectory(atPath: dir.path).isEmpty == false) ?? false
    }

    static var soundFontName: String? { MIDIChannel.soundBankURL?.lastPathComponent }

    /// Is `dir` itself a game folder?
    nonisolated static func isGameRoot(_ dir: URL) -> Bool {
        let fm = FileManager.default
        guard let names = try? fm.contentsOfDirectory(atPath: dir.path) else { return false }
        let lower = Set(names.map { $0.lowercased() })
        if lower.contains("game.rgss3a") || lower.contains("game.rgss2a") || lower.contains("game.rgssad") { return true }
        if lower.contains("game.ini") && lower.contains("data") { return true }
        if let data = names.first(where: { $0.lowercased() == "data" }),
           let d = try? fm.contentsOfDirectory(atPath: dir.appendingPathComponent(data).path) {
            return d.contains { ["scripts.rvdata2", "scripts.rvdata", "scripts.rxdata"].contains($0.lowercased()) }
        }
        return false
    }

    /// Find the game folder at or below `dir` (max depth 3).
    nonisolated static func findGameRoot(_ dir: URL, depth: Int = 0) -> URL? {
        if isGameRoot(dir) { return dir }
        guard depth < 3,
              let subs = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.isDirectoryKey],
                                                                       options: [.skipsHiddenFiles]) else { return nil }
        for s in subs where (try? s.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true {
            if s.lastPathComponent == "__MACOSX" { continue }
            if let r = findGameRoot(s, depth: depth + 1) { return r }
        }
        return nil
    }

    func refresh() {
        let fm = FileManager.default
        // Game folders copied directly into Documents (e.g. via Finder/Files) are moved into Games/.
        if let top = try? fm.contentsOfDirectory(at: Self.documents, includingPropertiesForKeys: [.isDirectoryKey],
                                                 options: [.skipsHiddenFiles]) {
            for u in top where !["Games", "RTP", "SoundFont", "Inbox"].contains(u.lastPathComponent) {
                if (try? u.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true, Self.isGameRoot(u) {
                    let dest = uniqueDestination(u.lastPathComponent)
                    try? fm.moveItem(at: u, to: dest)
                }
            }
        }
        var list: [GameEntry] = []
        let dirs = (try? fm.contentsOfDirectory(at: Self.gamesDir, includingPropertiesForKeys: [.isDirectoryKey],
                                                options: [.skipsHiddenFiles])) ?? []
        for d in dirs where (try? d.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true {
            let root = Self.findGameRoot(d) ?? d
            let fs = GameFileSystem(root: root, rtpRoots: [])
            list.append(GameEntry(id: d.lastPathComponent, url: root, title: fs.title, engine: fs.engine))
        }
        list.sort {
            let a = $0.lastPlayed ?? .distantPast, b = $1.lastPlayed ?? .distantPast
            return a != b ? a > b : $0.title.localizedStandardCompare($1.title) == .orderedAscending
        }
        games = list
    }

    func delete(_ g: GameEntry) {
        let folder = Self.gamesDir.appendingPathComponent(g.id)
        try? FileManager.default.removeItem(at: folder)
        refresh()
    }

    private func uniqueDestination(_ name: String) -> URL {
        let clean = name.replacingOccurrences(of: "/", with: "_")
        var url = Self.gamesDir.appendingPathComponent(clean, isDirectory: true)
        var i = 2
        while FileManager.default.fileExists(atPath: url.path) {
            url = Self.gamesDir.appendingPathComponent("\(clean) \(i)", isDirectory: true)
            i += 1
        }
        return url
    }

    // MARK: - import

    /// Import a game from a folder or a .zip chosen in the Files app.
    func importItem(at url: URL) {
        let scoped = url.startAccessingSecurityScopedResource()
        importing = "読み込み中: \(url.lastPathComponent)"
        let destName = url.deletingPathExtension().lastPathComponent
        let dest = uniqueDestination(destName)
        Task.detached(priority: .userInitiated) {
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            let result = Self.performImport(from: url, to: dest)
            await MainActor.run {
                self.importing = nil
                if let err = result { self.lastError = err }
                self.refresh()
            }
        }
    }

    /// Returns an error message or nil.
    nonisolated static func performImport(from url: URL, to dest: URL) -> String? {
        let fm = FileManager.default
        let isDir = (try? url.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) ?? false
        let staging = fm.temporaryDirectory.appendingPathComponent("import-" + UUID().uuidString, isDirectory: true)
        defer { try? fm.removeItem(at: staging) }
        do {
            if isDir {
                guard let root = findGameRoot(url) else {
                    return "ゲームフォルダが見つかりません（Game.ini / Data フォルダ / Game.rgss3a を含むフォルダを選んでください）"
                }
                try fm.copyItem(at: root, to: dest)
            } else if url.pathExtension.lowercased() == "zip" {
                try fm.createDirectory(at: staging, withIntermediateDirectories: true)
                try unzip(url, to: staging)
                guard let root = findGameRoot(staging) else {
                    return "ZIP の中にゲームフォルダが見つかりません"
                }
                try fm.moveItem(at: root, to: dest)
            } else {
                return "フォルダまたは .zip を選択してください"
            }
        } catch {
            try? fm.removeItem(at: dest)
            return "読み込みに失敗しました: \(error.localizedDescription)"
        }
        return nil
    }

    /// Unzip handling Shift_JIS file names (common for Japanese games).
    nonisolated static func unzip(_ zip: URL, to dir: URL) throws {
        let archive = try Archive(url: zip, accessMode: .read)
        let base = dir.standardizedFileURL.path
        for entry in archive {
            let utf = entry.path(using: .utf8)
            var name = (utf.isEmpty || utf.contains("\u{FFFD}")) ? entry.path(using: .shiftJIS) : utf
            if name.isEmpty { name = entry.path }
            name = name.replacingOccurrences(of: "\\", with: "/")
            let comps = name.split(separator: "/").filter { $0 != ".." && $0 != "." && !$0.isEmpty }
            guard !comps.isEmpty else { continue }
            let target = dir.appendingPathComponent(comps.joined(separator: "/")).standardizedFileURL
            guard target.path.hasPrefix(base) else { continue }
            if entry.type == .directory {
                try FileManager.default.createDirectory(at: target, withIntermediateDirectories: true)
            } else if entry.type == .file {
                try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
                if FileManager.default.fileExists(atPath: target.path) { try FileManager.default.removeItem(at: target) }
                _ = try archive.extract(entry, to: target, skipCRC32: true)
            }
        }
    }

    // MARK: - RTP / SoundFont

    /// Import an RTP folder (the folder containing Graphics/ and Audio/).
    func importRTP(at url: URL, engine: Int) {
        guard let name = Self.rtpNames[engine] else { return }
        let scoped = url.startAccessingSecurityScopedResource()
        importing = "RTP を読み込み中…"
        Task.detached(priority: .userInitiated) {
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            let fm = FileManager.default
            var error: String?
            var src = url
            let staging = fm.temporaryDirectory.appendingPathComponent("rtp-" + UUID().uuidString)
            defer { try? fm.removeItem(at: staging) }
            do {
                if url.pathExtension.lowercased() == "zip" {
                    try fm.createDirectory(at: staging, withIntermediateDirectories: true)
                    try Self.unzip(url, to: staging)
                    src = staging
                }
                guard let root = Self.findRTPRoot(src) else {
                    throw NSError(domain: "RTP", code: 1, userInfo: [NSLocalizedDescriptionKey: "Graphics / Audio フォルダが見つかりません"])
                }
                let dest = Self.rtpDir.appendingPathComponent(name, isDirectory: true)
                try? fm.removeItem(at: dest)
                try fm.createDirectory(at: dest, withIntermediateDirectories: true)
                for sub in (try fm.contentsOfDirectory(at: root, includingPropertiesForKeys: nil)) {
                    if ["graphics", "audio", "fonts"].contains(sub.lastPathComponent.lowercased()) {
                        try fm.copyItem(at: sub, to: dest.appendingPathComponent(sub.lastPathComponent))
                    }
                }
            } catch let e {
                error = "RTP の読み込みに失敗しました: \(e.localizedDescription)"
            }
            await MainActor.run {
                self.importing = nil
                if let error { self.lastError = error }
                self.objectWillChange.send()
            }
        }
    }

    nonisolated static func findRTPRoot(_ dir: URL, depth: Int = 0) -> URL? {
        let names = (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []
        if names.contains(where: { $0.lowercased() == "graphics" }) { return dir }
        guard depth < 3 else { return nil }
        for n in names {
            let u = dir.appendingPathComponent(n)
            if (try? u.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true,
               let r = findRTPRoot(u, depth: depth + 1) { return r }
        }
        return nil
    }

    func importSoundFont(at url: URL) {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        let fm = FileManager.default
        do {
            for old in (try? fm.contentsOfDirectory(at: Self.soundFontDir, includingPropertiesForKeys: nil)) ?? [] {
                try? fm.removeItem(at: old)
            }
            try fm.copyItem(at: url, to: Self.soundFontDir.appendingPathComponent(url.lastPathComponent))
        } catch {
            lastError = "SoundFont の読み込みに失敗しました: \(error.localizedDescription)"
        }
        objectWillChange.send()
    }
}
