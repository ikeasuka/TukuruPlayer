import UIKit

/// On-screen touch controller: 8-way D-pad + action buttons. Supports multi-touch and sliding between buttons.
final class VirtualPadView: UIView {
    var onMaskChange: ((UInt32) -> Void)?
    var haptics = true
    var padScale: CGFloat = 1.0 { didSet { setNeedsLayout() } }

    private struct PadKey {
        let title: String
        let button: RGSSButton
        var center: CGPoint = .zero
        var radius: CGFloat = 0
        var pill = false
    }

    private var keys: [PadKey] = [
        PadKey(title: "決定", button: .c),
        PadKey(title: "取消", button: .b),
        PadKey(title: "ダッシュ", button: .a),
        PadKey(title: "X", button: .x),
        PadKey(title: "L", button: .l, pill: true),
        PadKey(title: "R", button: .r, pill: true),
    ]
    private var dpadCenter = CGPoint.zero
    private var dpadRadius: CGFloat = 70
    private var dpadTouches = Set<UITouch>()
    private var dpadMask: UInt32 = 0
    private var touchKeys: [UITouch: Int] = [:]
    private var padState: UInt32 = 0
    private let feedback = UIImpactFeedbackGenerator(style: .light)

    override init(frame: CGRect) {
        super.init(frame: frame)
        isMultipleTouchEnabled = true
        isOpaque = false
        backgroundColor = .clear
        contentMode = .redraw
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        let s = padScale * min(1.25, max(0.8, min(bounds.width, bounds.height) / 390))
        let inset = safeAreaInsets
        let bottom = bounds.height - max(inset.bottom, 12) - 24 * s
        dpadRadius = 66 * s
        dpadCenter = CGPoint(x: max(inset.left, 12) + 24 * s + dpadRadius, y: bottom - dpadRadius)
        let bc = CGPoint(x: bounds.width - max(inset.right, 12) - 24 * s - 70 * s, y: bottom - 70 * s)
        let off = 50 * s
        let r = 29 * s
        func place(_ i: Int, _ p: CGPoint, _ rad: CGFloat) { keys[i].center = p; keys[i].radius = rad }
        place(0, CGPoint(x: bc.x + off, y: bc.y), r)          // east: confirm
        place(1, CGPoint(x: bc.x, y: bc.y + off), r)          // south: cancel
        place(2, CGPoint(x: bc.x - off, y: bc.y), r)          // west: dash
        place(3, CGPoint(x: bc.x, y: bc.y - off), r * 0.85)   // north: X
        place(4, CGPoint(x: dpadCenter.x, y: dpadCenter.y - dpadRadius - 44 * s), 20 * s)
        place(5, CGPoint(x: bc.x, y: bc.y - off - 62 * s), 20 * s)
        setNeedsDisplay()
    }

    override func safeAreaInsetsDidChange() {
        super.safeAreaInsetsDidChange()
        setNeedsLayout()
    }

    // Only intercept touches on controls; let others through.
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        if hypot(point.x - dpadCenter.x, point.y - dpadCenter.y) < dpadRadius * 1.5 { return true }
        return keyIndex(at: point, slop: 1.4) != nil
    }

    private func keyIndex(at p: CGPoint, slop: CGFloat = 1.15) -> Int? {
        var best: Int?
        var bestD = CGFloat.greatestFiniteMagnitude
        for (i, k) in keys.enumerated() {
            let d = hypot(p.x - k.center.x, p.y - k.center.y)
            let reach = k.pill ? k.radius * 2.0 : k.radius * slop
            if d < reach && d < bestD { best = i; bestD = d }
        }
        return best
    }

    // MARK: touches

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        for t in touches {
            let p = t.location(in: self)
            if hypot(p.x - dpadCenter.x, p.y - dpadCenter.y) < dpadRadius * 1.5 {
                dpadTouches.insert(t)
            } else if let i = keyIndex(at: p, slop: 1.4) {
                touchKeys[t] = i
            }
        }
        update()
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        for t in touches where touchKeys[t] != nil {
            if let i = keyIndex(at: t.location(in: self)) { touchKeys[t] = i }
        }
        update()
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        for t in touches {
            dpadTouches.remove(t)
            touchKeys.removeValue(forKey: t)
        }
        update()
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        touchesEnded(touches, with: event)
    }

    func releaseAll() {
        dpadTouches.removeAll()
        touchKeys.removeAll()
        update()
    }

    private func update() {
        var d: UInt32 = 0
        if let t = dpadTouches.first {
            let p = t.location(in: self)
            let dx = p.x - dpadCenter.x, dy = p.y - dpadCenter.y
            if hypot(dx, dy) > dpadRadius * 0.22 {
                let ang = atan2(-dy, dx) // radians, 0 = right, counter-clockwise
                let sector = Int(((ang + .pi * 2).truncatingRemainder(dividingBy: .pi * 2) + .pi / 8) / (.pi / 4)) % 8
                switch sector {
                case 0: d = RGSSButton.right.bit
                case 1: d = RGSSButton.right.bit | RGSSButton.up.bit
                case 2: d = RGSSButton.up.bit
                case 3: d = RGSSButton.up.bit | RGSSButton.left.bit
                case 4: d = RGSSButton.left.bit
                case 5: d = RGSSButton.left.bit | RGSSButton.down.bit
                case 6: d = RGSSButton.down.bit
                default: d = RGSSButton.down.bit | RGSSButton.right.bit
                }
            }
        }
        dpadMask = d
        var m = d
        for i in touchKeys.values {
            m |= keys[i].button.bit
            if keys[i].button == .a { m |= RGSSButton.shift.bit }
        }
        if m != padState {
            let newly = m & ~padState
            padState = m
            if haptics && newly != 0 { feedback.impactOccurred(intensity: 0.6) }
            onMaskChange?(m)
            setNeedsDisplay()
        }
    }

    // MARK: drawing

    override func draw(_ rect: CGRect) {
        guard let ctx = UIGraphicsGetCurrentContext() else { return }
        let base = UIColor(white: 1, alpha: 0.18)
        let edge = UIColor(white: 1, alpha: 0.55)
        let active = UIColor(white: 1, alpha: 0.45)

        // D-pad
        let dp = UIBezierPath(ovalIn: CGRect(x: dpadCenter.x - dpadRadius, y: dpadCenter.y - dpadRadius,
                                             width: dpadRadius * 2, height: dpadRadius * 2))
        base.setFill(); dp.fill()
        edge.setStroke(); dp.lineWidth = 1.5; dp.stroke()
        let arm = dpadRadius * 0.62
        let w = dpadRadius * 0.36
        let dirs: [(RGSSButton, CGFloat, CGFloat)] = [(.up, 0, -1), (.down, 0, 1), (.left, -1, 0), (.right, 1, 0)]
        for (b, dx, dy) in dirs {
            let on = dpadMask & b.bit != 0
            let c = CGPoint(x: dpadCenter.x + dx * arm, y: dpadCenter.y + dy * arm)
            let tri = UIBezierPath()
            tri.move(to: CGPoint(x: c.x + dx * w * 0.6, y: c.y + dy * w * 0.6))
            tri.addLine(to: CGPoint(x: c.x - dx * w * 0.4 + dy * w * 0.6, y: c.y - dy * w * 0.4 + dx * w * 0.6))
            tri.addLine(to: CGPoint(x: c.x - dx * w * 0.4 - dy * w * 0.6, y: c.y - dy * w * 0.4 - dx * w * 0.6))
            tri.close()
            (on ? UIColor.white : edge).setFill()
            tri.fill()
        }

        // Buttons
        for k in keys {
            let on = padState & k.button.bit != 0
            let path: UIBezierPath
            if k.pill {
                let r = CGRect(x: k.center.x - k.radius * 1.6, y: k.center.y - k.radius * 0.8,
                               width: k.radius * 3.2, height: k.radius * 1.6)
                path = UIBezierPath(roundedRect: r, cornerRadius: k.radius * 0.8)
            } else {
                path = UIBezierPath(ovalIn: CGRect(x: k.center.x - k.radius, y: k.center.y - k.radius,
                                                   width: k.radius * 2, height: k.radius * 2))
            }
            (on ? active : base).setFill(); path.fill()
            edge.setStroke(); path.lineWidth = 1.5; path.stroke()
            let fs = k.title.count > 2 ? k.radius * 0.42 : k.radius * 0.6
            let attrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: fs, weight: .bold),
                .foregroundColor: UIColor(white: 1, alpha: 0.9),
            ]
            let size = (k.title as NSString).size(withAttributes: attrs)
            (k.title as NSString).draw(at: CGPoint(x: k.center.x - size.width / 2, y: k.center.y - size.height / 2),
                                       withAttributes: attrs)
        }
        ctx.flush()
    }
}
