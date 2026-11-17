import SwiftUI
import UniformTypeIdentifiers

struct LibraryView: View {
    @EnvironmentObject private var library: GameLibrary
    @State private var showFolderImporter = false
    @State private var showZipImporter = false
    @State private var showSettings = false
    @State private var pendingDelete: GameEntry?

    var body: some View {
        NavigationStack {
            Group {
                if library.games.isEmpty {
                    emptyState
                } else {
                    List {
                        Section {
                            ForEach(library.games) { game in
                                row(game)
                            }
                            .onDelete { idx in
                                if let i = idx.first { pendingDelete = library.games[i] }
                            }
                        } footer: {
                            Text("ゲームコントローラー対応。ゲーム中は Options / Select ボタン、または右上の ≡ でメニューを開きます。")
                        }
                    }
                    .refreshable { library.refresh() }
                }
            }
            .navigationTitle("TukuruPlayer")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { showSettings = true } label: { Image(systemName: "gearshape") }
                        .accessibilityLabel("設定")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button { showFolderImporter = true } label: { Label("フォルダから追加", systemImage: "folder") }
                        Button { showZipImporter = true } label: { Label("ZIP から追加", systemImage: "doc.zipper") }
                    } label: { Image(systemName: "plus") }
                    .accessibilityLabel("ゲームを追加")
                }
            }
            .fileImporter(isPresented: $showFolderImporter, allowedContentTypes: [.folder]) { r in
                if case .success(let url) = r { library.importItem(at: url) }
            }
            .fileImporter(isPresented: $showZipImporter, allowedContentTypes: [.zip]) { r in
                if case .success(let url) = r { library.importItem(at: url) }
            }
            .sheet(isPresented: $showSettings) { SettingsView().environmentObject(library) }
            .alert("ゲームを削除しますか？", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })) {
                Button("削除", role: .destructive) {
                    if let g = pendingDelete { library.delete(g) }
                    pendingDelete = nil
                }
                Button("キャンセル", role: .cancel) { pendingDelete = nil }
            } message: {
                Text("\(pendingDelete?.title ?? "") のフォルダ（セーブデータを含む）を削除します。")
            }
            .alert("エラー", isPresented: Binding(get: { library.lastError != nil }, set: { if !$0 { library.lastError = nil } })) {
                Button("OK") { library.lastError = nil }
            } message: {
                Text(library.lastError ?? "")
            }
            .overlay {
                if let msg = library.importing {
                    ZStack {
                        Color.black.opacity(0.4).ignoresSafeArea()
                        VStack(spacing: 12) {
                            ProgressView()
                            Text(msg).font(.callout)
                        }
                        .padding(24)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
                    }
                }
            }
        }
        .onOpenURL { url in library.importItem(at: url) }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
            library.refresh()
        }
    }

    private func row(_ game: GameEntry) -> some View {
        Button {
            launch(game)
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(game.engine == 3 ? Color.indigo.gradient : (game.engine == 2 ? Color.teal.gradient : Color.gray.gradient))
                        .frame(width: 52, height: 52)
                    Image(systemName: "gamecontroller.fill")
                        .foregroundStyle(.white)
                        .font(.title3)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text(game.title).font(.headline).foregroundStyle(.primary).lineLimit(2)
                    HStack(spacing: 6) {
                        Text(game.engineLabel)
                            .font(.caption2.bold())
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(Color.secondary.opacity(0.15), in: Capsule())
                        if let d = game.lastPlayed {
                            Text(d, style: .relative).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
                Spacer()
                if game.playable {
                    Image(systemName: "play.circle.fill").font(.title2).foregroundStyle(.tint)
                }
            }
            .padding(.vertical, 4)
            .contentShape(Rectangle())
        }
        .disabled(!game.playable)
        .contextMenu {
            Button(role: .destructive) { pendingDelete = game } label: { Label("削除", systemImage: "trash") }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 18) {
            Image(systemName: "gamecontroller")
                .font(.system(size: 54))
                .foregroundStyle(.secondary)
            Text("ゲームがありません").font(.title3.bold())
            Text("右上の ＋ から RPGツクールVX / VX Ace のゲームフォルダ、または ZIP を追加してください。\nパソコンの Finder / iTunes の「ファイル共有」や「ファイル」アプリで TukuruPlayer フォルダにコピーすることもできます。")
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            HStack {
                Button { showFolderImporter = true } label: { Label("フォルダ", systemImage: "folder") }
                    .buttonStyle(.borderedProminent)
                Button { showZipImporter = true } label: { Label("ZIP", systemImage: "doc.zipper") }
                    .buttonStyle(.bordered)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func launch(_ game: GameEntry) {
        guard game.playable else { return }
        let vc = PlayerViewController(game: game)
        vc.onClose = { library.refresh() }
        guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first,
              var top = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else { return }
        while let p = top.presentedViewController { top = p }
        top.present(vc, animated: true)
    }
}
