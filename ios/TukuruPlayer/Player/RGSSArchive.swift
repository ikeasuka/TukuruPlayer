import Foundation

/// Reader for RGSS encrypted archives (Game.rgss2a = v1, Game.rgss3a = v3).
/// Used to play the user's own games that were distributed with "encrypt game data".
final class RGSSArchive {
    struct Entry {
        let name: String
        let offset: UInt64
        let size: Int
        let key: UInt32
    }

    let url: URL
    private(set) var entries: [String: Entry] = [:] // lowercased path -> entry
    private let lock = NSLock()
    private let handle: FileHandle

    init(url: URL) throws {
        self.url = url
        handle = try FileHandle(forReadingFrom: url)
        let head = try read(at: 0, count: 8)
        guard head.count == 8, String(decoding: head.prefix(6), as: UTF8.self) == "RGSSAD" else {
            throw NSError(domain: "RGSSArchive", code: 1, userInfo: [NSLocalizedDescriptionKey: "Not an RGSS archive"])
        }
        switch head[7] {
        case 1: try readV1()
        case 3: try readV3()
        default:
            throw NSError(domain: "RGSSArchive", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unsupported archive version"])
        }
    }

    deinit { try? handle.close() }

    private func read(at offset: UInt64, count: Int) throws -> Data {
        lock.lock(); defer { lock.unlock() }
        try handle.seek(toOffset: offset)
        return try handle.read(upToCount: count) ?? Data()
    }

    private static func u32(_ d: Data, _ i: Int) -> UInt32 {
        let b = d.startIndex + i
        return UInt32(d[b]) | UInt32(d[b + 1]) << 8 | UInt32(d[b + 2]) << 16 | UInt32(d[b + 3]) << 24
    }

    private static func decodeName(_ bytes: [UInt8]) -> String {
        let s = String(data: Data(bytes), encoding: .utf8)
            ?? String(data: Data(bytes), encoding: .shiftJIS)
            ?? String(decoding: bytes, as: UTF8.self)
        return s.replacingOccurrences(of: "\\", with: "/")
    }

    private func readV1() throws {
        let all = try Data(contentsOf: url, options: .alwaysMapped)
        var key: UInt32 = 0xDEADCAFE
        func adv() -> UInt32 { let k = key; key = key &* 7 &+ 3; return k }
        var pos = 8
        while pos + 4 <= all.count {
            let nameLen = Int(Self.u32(all, pos) ^ adv()); pos += 4
            guard nameLen > 0, nameLen < 4096, pos + nameLen + 4 <= all.count else { break }
            var nb = [UInt8](repeating: 0, count: nameLen)
            for i in 0..<nameLen {
                nb[i] = all[all.startIndex + pos + i] ^ UInt8(adv() & 0xFF)
            }
            pos += nameLen
            let size = Int(Self.u32(all, pos) ^ adv()); pos += 4
            let name = Self.decodeName(nb)
            entries[name.lowercased()] = Entry(name: name, offset: UInt64(pos), size: size, key: key)
            pos += size
        }
    }

    private func readV3() throws {
        let all = try Data(contentsOf: url, options: .alwaysMapped)
        guard all.count >= 12 else { return }
        let base = Self.u32(all, 8)
        let key = base &* 9 &+ 3
        var pos = 12
        while pos + 16 <= all.count {
            let off = Self.u32(all, pos) ^ key
            if off == 0 { break }
            let size = Int(Self.u32(all, pos + 4) ^ key)
            let ek = Self.u32(all, pos + 8) ^ key
            let nameLen = Int(Self.u32(all, pos + 12) ^ key)
            pos += 16
            guard nameLen > 0, pos + nameLen <= all.count else { break }
            var nb = [UInt8](repeating: 0, count: nameLen)
            for i in 0..<nameLen {
                nb[i] = all[all.startIndex + pos + i] ^ UInt8((key >> (UInt32(i % 4) * 8)) & 0xFF)
            }
            pos += nameLen
            let name = Self.decodeName(nb)
            entries[name.lowercased()] = Entry(name: name, offset: UInt64(off), size: size, key: ek)
        }
    }

    /// Read and decrypt an entry.
    func data(for e: Entry) throws -> Data {
        var d = try read(at: e.offset, count: e.size)
        var key = e.key
        d.withUnsafeMutableBytes { (raw: UnsafeMutableRawBufferPointer) in
            guard let p = raw.baseAddress?.assumingMemoryBound(to: UInt8.self) else { return }
            let n = raw.count
            var i = 0
            while i + 4 <= n {
                var v = UInt32(p[i]) | UInt32(p[i + 1]) << 8 | UInt32(p[i + 2]) << 16 | UInt32(p[i + 3]) << 24
                v ^= key
                p[i] = UInt8(v & 0xFF); p[i + 1] = UInt8((v >> 8) & 0xFF)
                p[i + 2] = UInt8((v >> 16) & 0xFF); p[i + 3] = UInt8(v >> 24)
                key = key &* 7 &+ 3
                i += 4
            }
            var j: UInt32 = 0
            while i < n {
                p[i] ^= UInt8((key >> (j * 8)) & 0xFF)
                i += 1; j += 1
            }
        }
        return d
    }
}
