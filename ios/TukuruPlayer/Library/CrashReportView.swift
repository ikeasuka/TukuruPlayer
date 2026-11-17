import SwiftUI

/// Shown at launch when the previous game session ended abnormally (app crash / killed).
struct CrashReportView: View {
    let logURL: URL
    let onClose: () -> Void

    private var tail: String {
        guard let text = try? String(contentsOf: logURL, encoding: .utf8) else { return "（ログを読めませんでした）" }
        return text.components(separatedBy: "\n").suffix(40).joined(separator: "\n")
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text("前回のゲームが途中で強制終了しました。")
                        .font(.headline)
                    Text("下の「ログを共有」から記録を送っていただくと、原因の調査に使えます。")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                    Text(tail)
                        .font(.system(size: 11, design: .monospaced))
                        .textSelection(.enabled)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                }
                .padding()
            }
            .navigationTitle("異常終了の記録")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("閉じる", action: onClose) }
                ToolbarItem(placement: .confirmationAction) {
                    ShareLink(item: logURL) { Label("ログを共有", systemImage: "square.and.arrow.up") }
                }
            }
        }
    }
}
