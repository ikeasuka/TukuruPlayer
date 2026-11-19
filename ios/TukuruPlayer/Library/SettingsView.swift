import GameController
import SwiftUI
import UniformTypeIdentifiers

struct SettingsView: View {
    @EnvironmentObject private var library: GameLibrary
    @Environment(\.dismiss) private var dismiss

    @AppStorage(AppSettings.Key.padMode) private var padMode = "auto"
    @AppStorage(AppSettings.Key.padOpacity) private var padOpacity = 0.55
    @AppStorage(AppSettings.Key.padScale) private var padScale = 1.0
    @AppStorage(AppSettings.Key.padHaptics) private var padHaptics = true
    @AppStorage(AppSettings.Key.smooth) private var smooth = false
    @AppStorage(AppSettings.Key.scaleMode) private var scaleMode = "fit"
    @AppStorage(AppSettings.Key.showFPS) private var showFPS = false
    @AppStorage(AppSettings.Key.ignoreSilent) private var ignoreSilent = false
    @AppStorage(AppSettings.Key.gameFonts) private var gameFonts = true
    @AppStorage(AppSettings.Key.noJIT) private var noJIT = true
    @AppStorage(AppSettings.Key.rubyVersion) private var rubyVersion = "3.4"
    @AppStorage(AppSettings.Key.nativeEngine) private var nativeEngine = true
    @AppStorage(AppSettings.Key.textScale) private var textScale = 0.75

    @State private var mapping = AppSettings.mapping
    @State private var rtpTarget: Int?
    // A single fileImporter: SwiftUI only honours one importer per view hierarchy.
    private enum ImportKind { case rtp, soundFont }
    @State private var importKind: ImportKind = .rtp
    @State private var showImporter = false
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
                        Button("下で決定") { mapping = .standard; AppSettings.mapping = mapping }
                            .buttonStyle(.bordered)
                        Button("右で決定") { mapping = .japanese; AppSettings.mapping = mapping }
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
                    Toggle("ゲーム付属のフォントを使う", isOn: $gameFonts)
                    VStack(alignment: .leading) {
                        Text("文字の大きさ \(Int((textScale * 100).rounded()))%")
                        Slider(value: $textScale, in: 0.5...1.1, step: 0.01)
                        Text("文字がウィンドウからはみ出す場合は小さくしてください（ネイティブエンジン、ゲーム中も反映）。")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }

                Section {
                    Toggle("消音モードでも音を鳴らす", isOn: $ignoreSilent)
                    HStack {
                        Text("MIDI 用 SoundFont")
                        Spacer()
                        Text(GameLibrary.soundFontName ?? "未設定").foregroundStyle(.secondary).lineLimit(1)
                    }
                    Button("SoundFont（.sf2）を読み込む") { importKind = .soundFont; showImporter = true }
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

                Section {
                    Toggle("ネイティブエンジンを使う（推奨）", isOn: $nativeEngine)
                } header: {
                    Text("エンジン")
                } footer: {
                    Text("オン: iPhone 上で直接 Ruby を動かします（高速・安定）。オフ: 以前の Web 版エンジンを使います（下の設定はこちら用）。")
                }

                Section {
                    Toggle("JIT（高速化）を使わない", isOn: $noJIT)
                    Picker("Ruby エンジン", selection: $rubyVersion) {
                        Text("3.4（標準）").tag("3.4")
                        Text("3.4 最適化版").tag("3.4-opt")
                        Text("3.3").tag("3.3")
                    }
                } header: {
                    Text("動作の安定性")
                } footer: {
                    Text("起動から10秒ほどでゲームが落ちる場合に試してください。表示エンジンの高速化機能を止めて動かします（動作は遅くなります）。JIT をオンにして落ちる場合は、Ruby エンジンを切り替えると落ちなくなることがあります。")
                }

                Section("情報") {
                    LabeledContent("バージョン", value: AppSettings.versionString)
                    Text("RGSS2 / RGSS3 互換ランタイム（ruby.wasm + WebGL）。RPGツクールは株式会社 KADOKAWA の登録商標です。本アプリは公式製品ではありません。")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("設定")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("完了") { dismiss() } }
            }
            .fileImporter(isPresented: $showImporter,
                          allowedContentTypes: importKind == .rtp ? [.folder, .zip] : [.data]) { r in
                guard case .success(let url) = r else { return }
                switch importKind {
                case .rtp: if let e = rtpTarget { library.importRTP(at: url, engine: e) }
                case .soundFont: library.importSoundFont(at: url)
                }
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
                importKind = .rtp
                showImporter = true
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
                    AppSettings.mapping = mapping
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
                AppSettings.mapping = mapping
            }
        )
    }
}
