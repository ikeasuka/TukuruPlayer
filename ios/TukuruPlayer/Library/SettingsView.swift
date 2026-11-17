import GameController
import SwiftUI
import UniformTypeIdentifiers

struct SettingsView: View {
    @EnvironmentObject private var library: GameLibrary
    @Environment(\.dismiss) private var dismiss

    @AppStorage(Settings.Key.padMode) private var padMode = "auto"
    @AppStorage(Settings.Key.padOpacity) private var padOpacity = 0.55
    @AppStorage(Settings.Key.padScale) private var padScale = 1.0
    @AppStorage(Settings.Key.padHaptics) private var padHaptics = true
    @AppStorage(Settings.Key.smooth) private var smooth = false
    @AppStorage(Settings.Key.scaleMode) private var scaleMode = "fit"
    @AppStorage(Settings.Key.showFPS) private var showFPS = false
    @AppStorage(Settings.Key.ignoreSilent) private var ignoreSilent = false

    @State private var mapping = Settings.mapping
    @State private var rtpTarget: Int?
    @State private var showRTPImporter = false
    @State private var showSoundFontImporter = false
    @State private var controllerNames: [String] = []

    var body: some View {
        NavigationStack {
            Form {
                Section("コントローラー") {
                    if controllerNames.isEmpty {
                        Text("接続されていません").foregroundStyle(.secondary)
                    } else {
                        ForEach(controllerNames, id: \.self) { Label($0, systemImage: "gamecontroller.fill") }
                    }
                    HStack {
                        Text("ボタン配置")
                        Spacer()
                        Button("下で決定") { mapping = .standard; Settings.mapping = mapping }
                            .buttonStyle(.bordered)
                        Button("右で決定") { mapping = .japanese; Settings.mapping = mapping }
                            .buttonStyle(.bordered)
                    }
                    NavigationLink("ボタン割り当てを編集") { MappingEditor(mapping: $mapping) }
                    Text("十字キー / 左スティックで移動。Options（Select / −）ボタンでメニュー。キーボード（Z/X/Shift/矢印）にも対応。")
                        .font(.footnote).foregroundStyle(.secondary)
                }

                Section("タッチパッド") {
                    Picker("表示", selection: $padMode) {
                        Text("自動（コントローラー接続時は隠す）").tag("auto")
                        Text("常に表示").tag("always")
                        Text("表示しない").tag("never")
                    }
                    VStack(alignment: .leading) {
                        Text("不透明度 \(Int(padOpacity * 100))%")
                        Slider(value: $padOpacity, in: 0.15...1.0)
                    }
                    VStack(alignment: .leading) {
                        Text("サイズ \(Int(padScale * 100))%")
                        Slider(value: $padScale, in: 0.7...1.4)
                    }
                    Toggle("触覚フィードバック", isOn: $padHaptics)
                }

                Section("画面") {
                    Toggle("なめらかに拡大（ぼかし）", isOn: $smooth)
                    Picker("拡大方法", selection: $scaleMode) {
                        Text("画面に合わせる").tag("fit")
                        Text("整数倍").tag("integer")
                    }
                    Toggle("FPS を表示", isOn: $showFPS)
                }

                Section {
                    Toggle("消音モードでも音を鳴らす", isOn: $ignoreSilent)
                    HStack {
                        Text("MIDI 用 SoundFont")
                        Spacer()
                        Text(GameLibrary.soundFontName ?? "未設定").foregroundStyle(.secondary).lineLimit(1)
                    }
                    Button("SoundFont（.sf2）を読み込む") { showSoundFontImporter = true }
                } header: {
                    Text("サウンド")
                } footer: {
                    Text("BGM が MIDI のゲームでは General MIDI 対応の SoundFont（.sf2）が必要です。Ogg / WAV / MP3 はそのまま再生できます。")
                }

                Section {
                    rtpRow(engine: 3, name: "RPGツクールVX Ace RTP")
                    rtpRow(engine: 2, name: "RPGツクールVX RTP")
                } header: {
                    Text("RTP（ランタイムパッケージ）")
                } footer: {
                    Text("RTP を必要とするゲームでは、PC にインストールされた RTP フォルダ（Graphics / Audio を含むフォルダ）を読み込んでください。")
                }

                Section("情報") {
                    LabeledContent("バージョン", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "-")
                    Text("RGSS2 / RGSS3 互換ランタイム（ruby.wasm + WebGL）。RPGツクールは株式会社 KADOKAWA の登録商標です。本アプリは公式製品ではありません。")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("設定")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("完了") { dismiss() } }
            }
            .fileImporter(isPresented: $showRTPImporter, allowedContentTypes: [.folder, .zip]) { r in
                if case .success(let url) = r, let e = rtpTarget { library.importRTP(at: url, engine: e) }
            }
            .fileImporter(isPresented: $showSoundFontImporter, allowedContentTypes: [.data]) { r in
                if case .success(let url) = r { library.importSoundFont(at: url) }
            }
            .onAppear(perform: refreshControllers)
            .onReceive(NotificationCenter.default.publisher(for: .GCControllerDidConnect)) { _ in refreshControllers() }
            .onReceive(NotificationCenter.default.publisher(for: .GCControllerDidDisconnect)) { _ in refreshControllers() }
        }
    }

    private func rtpRow(engine: Int, name: String) -> some View {
        HStack {
            VStack(alignment: .leading) {
                Text(name)
                Text(GameLibrary.rtpInstalled(engine: engine) ? "インストール済み" : "未インストール")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Button("読み込む") {
                rtpTarget = engine
                showRTPImporter = true
            }
            .buttonStyle(.bordered)
        }
    }

    private func refreshControllers() {
        controllerNames = GCController.controllers().map { $0.vendorName ?? "コントローラー" }
    }
}

private struct MappingEditor: View {
    @Binding var mapping: ControllerMapping

    var body: some View {
        Form {
            Section {
                ForEach(PadButton.allCases) { pad in
                    Picker(pad.label, selection: binding(for: pad)) {
                        Text("なし").tag(RGSSButton?.none)
                        ForEach(RGSSButton.assignable) { b in
                            Text(b.label).tag(RGSSButton?.some(b))
                        }
                    }
                }
            } footer: {
                Text("RGSS のボタン: C=決定、B=キャンセル/メニュー、A=ダッシュ（Shift）。L/R はメニューのページ切り替えに使われます。")
            }
            Section {
                Button("初期設定に戻す", role: .destructive) {
                    mapping = .standard
                    Settings.mapping = mapping
                }
            }
        }
        .navigationTitle("ボタン割り当て")
    }

    private func binding(for pad: PadButton) -> Binding<RGSSButton?> {
        Binding(
            get: { mapping.buttons[pad]?.first },
            set: { new in
                var list: [RGSSButton] = []
                if let n = new {
                    list = [n]
                    if n == .a { list.append(.shift) }
                }
                mapping.buttons[pad] = list
                Settings.mapping = mapping
            }
        )
    }
}
