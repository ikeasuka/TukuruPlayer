import AVFoundation
import Foundation

/// MIDI playback with AVMIDIPlayer. Requires a SoundFont (.sf2) or DLS file placed in
/// Documents/SoundFont/. Supports the RPG Maker loop marker (CC#111) and volume via velocity scaling.
final class MIDIChannel {
    private var player: AVMIDIPlayer?
    private let original: Data
    private let loop: Bool
    private var loopSeconds: TimeInterval = 0
    private var token = 0
    private(set) var started = false
    private var isPaused = false
    var onFinish: (() -> Void)?
    /// Queue on which callbacks run (the audio queue of GameAudio).
    let callbackQueue: DispatchQueue

    static var soundBankURL: URL? {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("SoundFont", isDirectory: true)
        let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? []
        return files.sorted { $0.lastPathComponent < $1.lastPathComponent }
            .first { ["sf2", "dls"].contains($0.pathExtension.lowercased()) }
    }

    init(data: Data, volume: Int, pitch: Int, loop: Bool, queue: DispatchQueue) {
        callbackQueue = queue
        original = data
        self.loop = loop
        build(volume: volume, pitch: pitch)
    }

    private func build(volume: Int, pitch: Int) {
        guard let bank = Self.soundBankURL else {
            NSLog("[TukuruPlayer] MIDI skipped: no SoundFont in Documents/SoundFont")
            return
        }
        let info = MIDIFileInfo(data: original, velocityScale: Double(max(0, min(100, volume))) / 100)
        loopSeconds = info.loopSeconds ?? 0
        do {
            let p = try AVMIDIPlayer(data: info.data, soundBankURL: bank)
            p.rate = Float(max(50, min(150, pitch))) / 100
            p.prepareToPlay()
            player = p
        } catch {
            NSLog("[TukuruPlayer] MIDI player error: \(error)")
        }
    }

    func start(at position: TimeInterval = 0) {
        guard let p = player else { return }
        started = true
        isPaused = false
        token += 1
        let t = token
        p.currentPosition = position
        p.play { [weak self] in
            self?.callbackQueue.async {
                guard let self, self.token == t, !self.isPaused else { return }
                if self.loop {
                    self.start(at: self.loopSeconds)
                } else {
                    self.onFinish?()
                }
            }
        }
    }

    func set(volume: Int, pitch: Int) {
        let pos = player?.currentPosition ?? 0
        let wasPlaying = player?.isPlaying ?? false
        token += 1
        player?.stop()
        build(volume: volume, pitch: pitch)
        if wasPlaying { start(at: pos) }
    }

    func pause() {
        isPaused = true
        token += 1
        player?.stop()
    }

    func resume() {
        guard started, let p = player else { return }
        start(at: p.currentPosition)
    }

    func stop() {
        token += 1
        isPaused = false
        player?.stop()
        player = nil
    }

    func fadeOut(ms: Int) {
        // AVMIDIPlayer has no volume control; stop after the fade time.
        let t = token
        callbackQueue.asyncAfter(deadline: .now() + .milliseconds(max(0, ms))) { [weak self] in
            guard let self, self.token == t else { return }
            self.stop()
        }
    }
}

/// Minimal Standard MIDI File scanner: finds the CC#111 loop point, converts it to seconds
/// using the tempo map, and scales note-on velocities.
struct MIDIFileInfo {
    var data: Data
    var loopSeconds: TimeInterval?

    init(data input: Data, velocityScale: Double) {
        var bytes = [UInt8](input)
        data = input
        loopSeconds = nil
        guard bytes.count > 14, bytes[0] == 0x4D, bytes[1] == 0x54, bytes[2] == 0x68, bytes[3] == 0x64 else { return }
        func be32(_ i: Int) -> Int { Int(bytes[i]) << 24 | Int(bytes[i + 1]) << 16 | Int(bytes[i + 2]) << 8 | Int(bytes[i + 3]) }
        func be16(_ i: Int) -> Int { Int(bytes[i]) << 8 | Int(bytes[i + 1]) }
        let headerLen = be32(4)
        let ntrks = be16(10)
        let division = be16(12)
        var pos = 8 + headerLen
        var tempos: [(tick: Int, us: Int)] = []
        var loopTick: Int?
        for _ in 0..<ntrks {
            guard pos + 8 <= bytes.count, bytes[pos] == 0x4D, bytes[pos + 1] == 0x54 else { break }
            let len = be32(pos + 4)
            var i = pos + 8
            let end = min(bytes.count, i + len)
            var tick = 0
            var status: UInt8 = 0
            while i < end {
                var delta = 0
                while i < end {
                    let b = bytes[i]; i += 1
                    delta = (delta << 7) | Int(b & 0x7F)
                    if b & 0x80 == 0 { break }
                }
                tick += delta
                guard i < end else { break }
                var b = bytes[i]
                if b & 0x80 != 0 { status = b; i += 1 } else { b = status }
                if status == 0xFF {
                    guard i + 1 < end else { break }
                    let type = bytes[i]; i += 1
                    var l = 0
                    while i < end {
                        let c = bytes[i]; i += 1
                        l = (l << 7) | Int(c & 0x7F)
                        if c & 0x80 == 0 { break }
                    }
                    if type == 0x51 && l == 3 && i + 2 < end {
                        tempos.append((tick, Int(bytes[i]) << 16 | Int(bytes[i + 1]) << 8 | Int(bytes[i + 2])))
                    }
                    i += l
                    status = 0
                } else if status == 0xF0 || status == 0xF7 {
                    var l = 0
                    while i < end {
                        let c = bytes[i]; i += 1
                        l = (l << 7) | Int(c & 0x7F)
                        if c & 0x80 == 0 { break }
                    }
                    i += l
                    status = 0
                } else {
                    let hi = status & 0xF0
                    let n = (hi == 0xC0 || hi == 0xD0) ? 1 : 2
                    guard i + n <= end else { break }
                    if hi == 0x90 && n == 2 && bytes[i + 1] > 0 {
                        let v = Int((Double(bytes[i + 1]) * velocityScale).rounded())
                        bytes[i + 1] = UInt8(max(1, min(127, v)))
                    }
                    if hi == 0xB0 && bytes[i] == 111 && loopTick == nil {
                        loopTick = tick
                    }
                    i += n
                }
            }
            pos = 8 + pos + len
        }
        data = Data(bytes)
        if let lt = loopTick, division > 0, division & 0x8000 == 0 {
            tempos.sort { $0.tick < $1.tick }
            var sec = 0.0
            var lastTick = 0
            var us = 500_000
            for t in tempos where t.tick < lt {
                sec += Double(t.tick - lastTick) * Double(us) / 1_000_000 / Double(division)
                lastTick = t.tick
                us = t.us
            }
            sec += Double(lt - lastTick) * Double(us) / 1_000_000 / Double(division)
            loopSeconds = sec
        }
    }
}
