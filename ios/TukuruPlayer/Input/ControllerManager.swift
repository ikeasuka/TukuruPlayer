import Foundation
import GameController

/// Observes game controllers (MFi / Xbox / PlayStation / Switch Pro…) and hardware keyboards,
/// and converts their state into an RGSS button bitmask.
final class ControllerManager {
    /// Called on the main thread whenever the combined mask changes.
    var onMaskChange: ((UInt32) -> Void)?
    /// Called when the "Options/Select" button (pause menu) is pressed.
    var onPauseMenu: (() -> Void)?
    /// Called when controllers connect/disconnect (true = at least one gamepad connected).
    var onConnectionChange: ((Bool) -> Void)?
    /// When set, gamepad events are routed here instead of the game (used by the pause menu).
    var menuHandler: ((MenuEvent) -> Void)?

    enum MenuEvent { case up, down, confirm, cancel }

    private(set) var padMask: UInt32 = 0
    private(set) var keyboardMask: UInt32 = 0
    private var mapping = Settings.mapping
    private var pressedKeys = Set<GCKeyCode>()
    private var observers: [NSObjectProtocol] = []
    private var lastMenuMask: UInt32 = 0

    var hasGamepad: Bool { GCController.controllers().contains { $0.extendedGamepad != nil || $0.microGamepad != nil } }

    init() {
        let nc = NotificationCenter.default
        observers.append(nc.addObserver(forName: .GCControllerDidConnect, object: nil, queue: .main) { [weak self] n in
            if let c = n.object as? GCController { self?.setup(c) }
            self?.connectionChanged()
        })
        observers.append(nc.addObserver(forName: .GCControllerDidDisconnect, object: nil, queue: .main) { [weak self] _ in
            self?.recompute()
            self?.connectionChanged()
        })
        observers.append(nc.addObserver(forName: .GCKeyboardDidConnect, object: nil, queue: .main) { [weak self] n in
            if let k = n.object as? GCKeyboard { self?.setupKeyboard(k) }
        })
        GCController.controllers().forEach(setup)
        if let k = GCKeyboard.coalesced { setupKeyboard(k) }
        GCController.startWirelessControllerDiscovery(completionHandler: nil)
    }

    deinit {
        observers.forEach(NotificationCenter.default.removeObserver)
        GCController.stopWirelessControllerDiscovery()
        for c in GCController.controllers() {
            c.extendedGamepad?.valueChangedHandler = nil
            c.microGamepad?.valueChangedHandler = nil
        }
        GCKeyboard.coalesced?.keyboardInput?.keyChangedHandler = nil
    }

    func reloadMapping() {
        mapping = Settings.mapping
        recompute()
    }

    private func connectionChanged() {
        onConnectionChange?(hasGamepad)
    }

    private func setup(_ c: GCController) {
        c.handlerQueue = .main
        if let pad = c.extendedGamepad {
            pad.valueChangedHandler = { [weak self] _, _ in self?.recompute() }
            pad.buttonOptions?.pressedChangedHandler = { [weak self] _, _, pressed in
                if pressed { self?.onPauseMenu?() }
            }
            pad.buttonHome?.preferredSystemGestureState = .alwaysReceive
        } else if let micro = c.microGamepad {
            micro.reportsAbsoluteDpadValues = false
            micro.valueChangedHandler = { [weak self] _, _ in self?.recompute() }
        }
        if c.playerIndex == .indexUnset { c.playerIndex = .index1 }
    }

    private func setupKeyboard(_ k: GCKeyboard) {
        k.handlerQueue = .main
        k.keyboardInput?.keyChangedHandler = { [weak self] _, _, code, pressed in
            guard let self else { return }
            if pressed { self.pressedKeys.insert(code) } else { self.pressedKeys.remove(code) }
            self.recompute()
        }
    }

    private static let keyMap: [GCKeyCode: [RGSSButton]] = [
        .downArrow: [.down], .leftArrow: [.left], .rightArrow: [.right], .upArrow: [.up],
        .keyZ: [.c], .spacebar: [.c], .returnOrEnter: [.c], .keypadEnter: [.c],
        .keyX: [.b], .escape: [.b], .keypad0: [.b],
        .leftShift: [.a, .shift], .rightShift: [.a, .shift],
        .keyA: [.x], .keyS: [.y], .keyD: [.z],
        .keyQ: [.l], .pageUp: [.l], .keyW: [.r], .pageDown: [.r],
        .leftControl: [.ctrl], .rightControl: [.ctrl], .leftAlt: [.alt], .rightAlt: [.alt],
        .F5: [.f5], .F6: [.f6], .F7: [.f7], .F8: [.f8], .F9: [.f9],
        .keypad2: [.down], .keypad4: [.left], .keypad6: [.right], .keypad8: [.up],
    ]

    private func recompute() {
        var m: UInt32 = 0
        for c in GCController.controllers() {
            if let p = c.extendedGamepad {
                m |= directionMask(x: p.dpad.xAxis.value, y: p.dpad.yAxis.value)
                m |= directionMask(x: p.leftThumbstick.xAxis.value, y: p.leftThumbstick.yAxis.value)
                func add(_ pressed: Bool, _ b: PadButton) { if pressed { m |= mapping.mask(for: b) } }
                add(p.buttonA.isPressed, .south)
                add(p.buttonB.isPressed, .east)
                add(p.buttonX.isPressed, .west)
                add(p.buttonY.isPressed, .north)
                add(p.leftShoulder.isPressed, .leftShoulder)
                add(p.rightShoulder.isPressed, .rightShoulder)
                add(p.leftTrigger.isPressed, .leftTrigger)
                add(p.rightTrigger.isPressed, .rightTrigger)
                add(p.leftThumbstickButton?.isPressed ?? false, .leftThumb)
                add(p.rightThumbstickButton?.isPressed ?? false, .rightThumb)
                add(p.buttonMenu.isPressed, .menu)
            } else if let p = c.microGamepad {
                m |= directionMask(x: p.dpad.xAxis.value, y: p.dpad.yAxis.value)
                if p.buttonA.isPressed { m |= mapping.mask(for: .south) }
                if p.buttonX.isPressed { m |= mapping.mask(for: .west) }
            }
        }
        var k: UInt32 = 0
        for code in pressedKeys {
            for b in Self.keyMap[code] ?? [] { k |= b.bit }
        }
        keyboardMask = k
        if let handler = menuHandler {
            let all = m | k
            let newly = all & ~lastMenuMask
            lastMenuMask = all
            if newly & RGSSButton.up.bit != 0 { handler(.up) }
            if newly & RGSSButton.down.bit != 0 { handler(.down) }
            if newly & RGSSButton.c.bit != 0 { handler(.confirm) }
            if newly & RGSSButton.b.bit != 0 { handler(.cancel) }
            padMask = 0
            onMaskChange?(0)
            return
        }
        lastMenuMask = m | k
        padMask = m
        onMaskChange?(m | k)
    }

    private func directionMask(x: Float, y: Float) -> UInt32 {
        let dead: Float = 0.45
        var m: UInt32 = 0
        if x < -dead { m |= RGSSButton.left.bit }
        if x > dead { m |= RGSSButton.right.bit }
        if y < -dead { m |= RGSSButton.down.bit }
        if y > dead { m |= RGSSButton.up.bit }
        return m
    }
}
