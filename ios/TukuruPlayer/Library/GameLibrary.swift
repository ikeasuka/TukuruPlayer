import Foundation
import SwiftUI

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
        let t = AppSettings.defaults.double(forKey: "lastPlayed." + id)
        return t > 0 ? Date(timeIntervalSince1970: t) : nil
    }

    func markPlayed() {
        AppSettings.defaults.set(Date().timeIntervalSince1970, forKey: "lastPlayed." + id)
    }
}

@MainActor
final class GameLibrary: ObservableObject {
    @Published private(set) var games: [GameEntry] = []
    @Published var importing: String?
    @Published var lastError: String?

    nonisolated static var documents: URL { FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0] }
    nonisolated static var gamesDir: URL { documents.appendingPathComponent("Games", isDirectory: true) }
    nonisolated static var rtpDir: URL { documents.appendingPathComponent("RTP", isDirectory: true) }
    nonisolated static var soundFontDir: URL { documents.appendingPathComponent("SoundFont", isDirectory: true) }
    nonisolated static let rtpNames = [3: "RPGVXAce", 2: "RPGVX"]

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

    nonisolated static func rtpRoots(for game: GameEntry) -> [URL] {
        guard let n = rtpNames[game.engine] else { return [] }
        return [rtpDir.appendingPathComponent(n, isDirectory: true)]
    }

    nonisolated static func rtpInstalled(engine: Int) -> Bool {
        guard let n = rtpNames[engine] else { return false }
        let dir = rtpDir.appendingPathComponent(n).appendingPathComponent("Graphics")
        return (try? FileManager.default.contentsOfDirectory(atPath: dir.path).isEmpty == false) ?? false
    }

    nonisolated static var soundFontName: String? { MIDIChannel.soundBankURL?.lastPathComponent }

    func refresh() {
        let fm = FileManager.default
        // Game folders copied directly into Documents (e.g. via Finder/Files) are moved into Games/.
        if let top = try? fm.contentsOfDirectory(at: Self.documents, includingPropertiesForKeys: [.isDirectoryKey],
                                                 options: [.skipsHiddenFiles]) {
            for u in top where !["Games", "RTP", "SoundFont", "Inbox"].contains(u.lastPathComponent) {
                if (try? u.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true, GameImporter.isGameRoot(u) {
                    let dest = uniqueDestination(u.lastPathComponent)
                    try? fm.moveItem(at: u, to: dest)
                }
            }
        }
        var list: [GameEntry] = []
        let dirs = (try? fm.contentsOfDirectory(at: Self.gamesDir, includingPropertiesForKeys: [.isDirectoryKey],
                                                options: [.skipsHiddenFiles])) ?? []
        for d in dirs where (try? d.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true {
            let root = GameImporter.findGameRoot(d) ?? d
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
    func importItem(at url: URL, name: String? = nil) {
        let scoped = url.startAccessingSecurityScopedResource()
        importing = "読み込み中: \(url.lastPathComponent)"
        let destName = name ?? url.deletingPathExtension().lastPathComponent
        let dest = uniqueDestination(destName)
        Task.detached(priority: .userInitiated) {
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            var result: String?
            do {
                try GameImporter.importGame(from: url, to: dest)
            } catch {
                try? FileManager.default.removeItem(at: dest)
                result = (error as? LocalizedError)?.errorDescription ?? "読み込みに失敗しました: \(error.localizedDescription)"
            }
            let message = result
            await MainActor.run {
                self.importing = nil
                if let message { self.lastError = message }
                self.refresh()
            }
        }
    }

    /// Built-in tiny test game (web/dev/testgame) to check whether a problem depends on the game.
    func importSample() {
        guard let base = Bundle.main.resourceURL?.appendingPathComponent("WebRuntime/samples/testgame"),
              FileManager.default.fileExists(atPath: base.path) else {
            lastError = "動作テスト用ゲームが見つかりません"
            return
        }
        importItem(at: base, name: "動作テスト")
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
                    try GameImporter.unzip(url, to: staging)
                    src = staging
                }
                guard let root = GameImporter.findRTPRoot(src) else {
                    let installer = GameImporter.containsExecutable(src)
                    let msg = installer
                        ? "選ばれたのは RTP のインストーラー（Setup.exe）です。iPhone ではインストーラーを展開できないため、"
                          + "パソコンで一度 RTP をインストールし、できたフォルダ（Windows では "
                          + "C:\\Program Files (x86)\\Common Files\\Enterbrain\\RGSS3\\RPGVXAce、VX は RGSS2\\RPGVX）を "
                          + "ZIP にして読み込んでください。"
                        : "Graphics / Audio フォルダが見つかりません。RTP をインストールしたフォルダ（Graphics と Audio が入っているフォルダ）を選んでください。"
                    throw NSError(domain: "RTP", code: 1, userInfo: [NSLocalizedDescriptionKey: msg])
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
            let message = error
            await MainActor.run {
                self.importing = nil
                if let message { self.lastError = message }
                self.objectWillChange.send()
            }
        }
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
