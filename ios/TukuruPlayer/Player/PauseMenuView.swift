import UIKit

/// Overlay menu shown with the ≡ button or the controller's Options/Select button.
/// Operable by touch and by game controller (D-pad + confirm/cancel).
final class PauseMenuView: UIView {
    enum Action: CaseIterable { case resume, reset, togglePad, shareLog, quit }

    var onSelect: ((Action) -> Void)?
    var padVisible = true { didSet { refreshTitles() } }

    private let stack = UIStackView()
    private var buttons: [UIButton] = []
    private var selected = 0
    private let actions = Action.allCases

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = UIColor(white: 0, alpha: 0.6)
        let panel = UIView()
        panel.backgroundColor = UIColor(red: 0.11, green: 0.12, blue: 0.16, alpha: 0.96)
        panel.layer.cornerRadius = 16
        panel.layer.borderColor = UIColor(white: 1, alpha: 0.15).cgColor
        panel.layer.borderWidth = 1
        panel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(panel)

        let title = UILabel()
        title.text = "メニュー"
        title.font = .boldSystemFont(ofSize: 17)
        title.textColor = .white
        title.textAlignment = .center

        stack.axis = .vertical
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.addArrangedSubview(title)
        for (i, _) in actions.enumerated() {
            let b = UIButton(type: .system)
            b.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
            b.setTitleColor(.white, for: .normal)
            b.layer.cornerRadius = 10
            b.heightAnchor.constraint(equalToConstant: 44).isActive = true
            b.tag = i
            b.addTarget(self, action: #selector(tapped(_:)), for: .touchUpInside)
            buttons.append(b)
            stack.addArrangedSubview(b)
        }
        let hint = UILabel()
        hint.text = "コントローラー: 十字キーで選択 / 決定 / キャンセルで閉じる"
        hint.font = .systemFont(ofSize: 11)
        hint.textColor = UIColor(white: 1, alpha: 0.5)
        hint.textAlignment = .center
        hint.numberOfLines = 0
        stack.addArrangedSubview(hint)
        panel.addSubview(stack)
        NSLayoutConstraint.activate([
            panel.centerXAnchor.constraint(equalTo: centerXAnchor),
            panel.centerYAnchor.constraint(equalTo: centerYAnchor),
            panel.widthAnchor.constraint(equalToConstant: 300),
            stack.topAnchor.constraint(equalTo: panel.topAnchor, constant: 18),
            stack.bottomAnchor.constraint(equalTo: panel.bottomAnchor, constant: -16),
            stack.leadingAnchor.constraint(equalTo: panel.leadingAnchor, constant: 18),
            stack.trailingAnchor.constraint(equalTo: panel.trailingAnchor, constant: -18),
        ])
        refreshTitles()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func title(for a: Action) -> String {
        switch a {
        case .resume: return "ゲームに戻る"
        case .reset: return "タイトルに戻る（リセット / F12）"
        case .togglePad: return padVisible ? "タッチパッドを隠す" : "タッチパッドを表示"
        case .shareLog: return "ログを共有"
        case .quit: return "ゲームを終了してライブラリへ"
        }
    }

    private func refreshTitles() {
        for (i, b) in buttons.enumerated() {
            b.setTitle(title(for: actions[i]), for: .normal)
            b.backgroundColor = i == selected ? UIColor.systemBlue.withAlphaComponent(0.85) : UIColor(white: 1, alpha: 0.08)
        }
    }

    func show() {
        selected = 0
        refreshTitles()
        isHidden = false
    }

    func move(_ d: Int) {
        selected = (selected + d + actions.count) % actions.count
        refreshTitles()
    }

    func confirm() {
        onSelect?(actions[selected])
    }

    @objc private func tapped(_ b: UIButton) {
        selected = b.tag
        refreshTitles()
        onSelect?(actions[b.tag])
    }
}
