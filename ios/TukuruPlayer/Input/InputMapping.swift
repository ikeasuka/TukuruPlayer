import Foundation

/// RGSS input buttons. Raw values are the bit indexes used by the web runtime (web/src/input.js).
enum RGSSButton: Int, CaseIterable, Codable, Identifiable {
    case down = 0, left, right, up
    case a, b, c, x, y, z, l, r
    case shift, ctrl, alt, f5, f6, f7, f8, f9

    var id: Int { rawValue }
    var bit: UInt32 { 1 << UInt32(rawValue) }

    var label: String {
        switch self {
        case .down: return "↓"
        case .left: return "←"
        case .right: return "→"
        case .up: return "↑"
        case .a: return "A（ダッシュ / Shift）"
        case .b: return "B（キャンセル / メニュー）"
        case .c: return "C（決定）"
        case .x: return "X"
        case .y: return "Y"
        case .z: return "Z"
        case .l: return "L（前ページ）"
        case .r: return "R（次ページ）"
        case .shift: return "SHIFT"
        case .ctrl: return "CTRL"
        case .alt: return "ALT"
        case .f5: return "F5"
        case .f6: return "F6"
        case .f7: return "F7"
        case .f8: return "F8"
        case .f9: return "F9"
        }
    }

    /// Buttons that make sense to assign to a physical controller button.
    static var assignable: [RGSSButton] { [.c, .b, .a, .x, .y, .z, .l, .r, .shift, .ctrl, .alt, .f5, .f6, .f7, .f8, .f9] }
}

/// Physical buttons of an extended gamepad (positions follow the Xbox layout as reported by GameController).
enum PadButton: String, CaseIterable, Codable, Identifiable {
    case south, east, west, north
    case leftShoulder, rightShoulder, leftTrigger, rightTrigger
    case leftThumb, rightThumb, menu

    var id: String { rawValue }

    var label: String {
        switch self {
        case .south: return "下ボタン（Xbox: A / PS: ✕ / Switch: B）"
        case .east: return "右ボタン（Xbox: B / PS: ○ / Switch: A）"
        case .west: return "左ボタン（Xbox: X / PS: □ / Switch: Y）"
        case .north: return "上ボタン（Xbox: Y / PS: △ / Switch: X）"
        case .leftShoulder: return "L1 / LB"
        case .rightShoulder: return "R1 / RB"
        case .leftTrigger: return "L2 / LT"
        case .rightTrigger: return "R2 / RT"
        case .leftThumb: return "左スティック押し込み"
        case .rightThumb: return "右スティック押し込み"
        case .menu: return "メニュー（Start / Options / +）"
        }
    }
}

/// Mapping from physical controller buttons to RGSS buttons (several RGSS buttons per physical button allowed).
struct ControllerMapping: Codable, Equatable {
    var buttons: [PadButton: [RGSSButton]]

    /// Western layout: bottom button confirms.
    static let standard = ControllerMapping(buttons: [
        .south: [.c], .east: [.b], .west: [.a, .shift], .north: [.x],
        .leftShoulder: [.l], .rightShoulder: [.r], .leftTrigger: [.y], .rightTrigger: [.z],
        .leftThumb: [], .rightThumb: [], .menu: [.b],
    ])

    /// Japanese layout: right button confirms, bottom button cancels.
    static let japanese = ControllerMapping(buttons: [
        .south: [.b], .east: [.c], .west: [.a, .shift], .north: [.x],
        .leftShoulder: [.l], .rightShoulder: [.r], .leftTrigger: [.y], .rightTrigger: [.z],
        .leftThumb: [], .rightThumb: [], .menu: [.b],
    ])

    func mask(for pad: PadButton) -> UInt32 {
        (buttons[pad] ?? []).reduce(0) { $0 | $1.bit }
    }
}

/// App-wide settings stored in UserDefaults.
enum AppSettings {
    static let defaults = UserDefaults.standard

    enum Key {
        static let padMode = "pad.mode"            // "auto" | "always" | "never"
        static let padOpacity = "pad.opacity"      // Double
        static let padHaptics = "pad.haptics"      // Bool
        static let padScale = "pad.scale"          // Double
        static let smooth = "display.smooth"       // Bool
        static let scaleMode = "display.scale"     // "fit" | "integer"
        static let showFPS = "display.fps"         // Bool
        static let ignoreSilent = "audio.ignoreSilent" // Bool
        static let gameFonts = "display.gameFonts"  // Bool: load fonts shipped in the game's Fonts folder
        static let mapping = "controller.mapping"  // JSON
    }

    static func registerDefaults() {
        defaults.register(defaults: [
            Key.padMode: "auto",
            Key.padOpacity: 0.55,
            Key.padHaptics: true,
            Key.padScale: 1.0,
            Key.smooth: false,
            Key.scaleMode: "fit",
            Key.showFPS: false,
            Key.ignoreSilent: false,
            Key.gameFonts: true,
        ])
    }

    static var mapping: ControllerMapping {
        get {
            if let data = defaults.data(forKey: Key.mapping),
               let m = try? JSONDecoder().decode(ControllerMapping.self, from: data) {
                return m
            }
            return .standard
        }
        set {
            if let data = try? JSONEncoder().encode(newValue) {
                defaults.set(data, forKey: Key.mapping)
            }
        }
    }

    /// e.g. "1.0.0 (build 16)"
    static var versionString: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
        return "\(v) (build \(b))"
    }

    /// Settings passed to the web runtime.
    static var webSettings: [String: Any] {
        [
            "smooth": defaults.bool(forKey: Key.smooth),
            "scale": defaults.string(forKey: Key.scaleMode) ?? "fit",
            "showFPS": defaults.bool(forKey: Key.showFPS),
            "gameFonts": defaults.bool(forKey: Key.gameFonts),
        ]
    }
}
