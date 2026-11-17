# TukuruPlayer

iPhone / iPad で **RPGツクールVX（RGSS2）** と **RPGツクールVX Ace（RGSS3）** のゲームを遊ぶためのアプリです。
**ゲームコントローラー対応**（MFi / Xbox / PlayStation / Switch Pro など、iOS が対応するコントローラー）。

> RPGツクールは株式会社 KADOKAWA の登録商標です。本アプリは非公式のプレイヤーで、Enterbrain / KADOKAWA の素材やスクリプトは一切含みません。
> 遊ぶゲームと RTP は、正規に入手したものを各自で用意してください。

## 特徴

- RGSS2 / RGSS3 互換ランタイム
  - ゲームの Ruby スクリプト（`Data/Scripts.rvdata(2)`）を **ruby.wasm（CRuby 3.4）** でそのまま実行
  - Bitmap / Sprite / Plane / Window / Viewport / Tilemap（オートタイル A1〜A5, B〜E, 影, 卓上タイル）/ Graphics（トランジション・フェード・スナップショット）/ Input / Audio / RPG モジュールを実装
  - 描画は WebGL2（トーン・カラー・合成方法・茂み・波形・回転・拡大）
  - Ruby 1.8/1.9 時代のスクリプト向け互換レイヤ（`Fixnum`, `File.exists?`, `Hash#index`, `Win32API` スタブ など）
- 暗号化アーカイブ（`Game.rgss2a` / `Game.rgss3a`）に対応
- Windows と同様の大文字小文字を区別しないファイル検索、拡張子の自動補完、RTP からの素材読み込み
- セーブデータはゲームフォルダに保存（PC 版とセーブデータの相互コピーが可能）
- サウンド（ネイティブ再生）
  - Ogg Vorbis（`LOOPSTART` / `LOOPLENGTH` によるループ対応）, WAV, MP3, M4A
  - MIDI（General MIDI SoundFont `.sf2` を読み込むと再生。CC#111 ループ対応）
  - ME 再生中の BGM 一時停止・再開、フェード、ピッチ
- 入力
  - ゲームコントローラー（十字キー / 左スティック、ボタン割り当て変更可、「下で決定 / 右で決定」プリセット）
  - Bluetooth キーボード（矢印, Z/Space/Enter=決定, X/Esc=キャンセル, Shift=ダッシュ, A/S/D, Q/W）
  - タッチ操作用バーチャルパッド（コントローラー接続時は自動で非表示）
  - Options（Select / −）ボタン、または画面左上隅をタップすると現れる ≡ でポーズメニュー（リセット / パッド表示切替 / 終了）
- フォルダまたは ZIP からゲームを追加（Shift_JIS のファイル名にも対応）、iTunes / Finder のファイル共有にも対応

## 構成

```
project.yml                 XcodeGen のプロジェクト定義
ios/TukuruPlayer/
  App/                      アプリのエントリポイント
  Library/                  ゲーム一覧・取り込み・設定画面（SwiftUI）
  Player/                   ゲーム画面（WKWebView）、tkr:// スキームハンドラ、仮想ファイルシステム、RGSSAD 復号
  Input/                    GameController / キーボード / バーチャルパッド
  Audio/                    AVAudioEngine による BGM/BGS/ME/SE、stb_vorbis、MIDI
  WebRuntime/               ビルド済みの Web ランタイム（web/ から生成）
web/
  src/                      JavaScript ランタイム（WebGL2 レンダラー、Bitmap、Tilemap、入力、起動処理）
  rgss/                     Ruby で書かれた RGSS クラス群と RPG モジュール
  dev/                      デスクトップ用開発サーバー、自作テストゲーム、E2E テスト
```

ゲームスクリプトは WebAssembly 上の Ruby で動き、`Graphics.update` や画像読み込みのような
「同期的な」RGSS API は ruby.wasm の `JS::Object#await`（Fiber ベース）で JavaScript の非同期処理を待つことで実現しています。

## ビルド方法

必要なもの: macOS, Xcode 16 以降, [XcodeGen](https://github.com/yonaskolb/XcodeGen), Node.js 20 以降

```sh
brew install xcodegen node
cd web && npm ci && node build.mjs && cd ..   # Web ランタイムをビルド（Xcode のビルド時にも自動実行）
xcodegen generate
open TukuruPlayer.xcodeproj
```

Xcode で「Signing & Capabilities」の Team を設定し、iPhone を選んで実行してください。

GitHub Actions（`.github/workflows/ios.yml`）でもビルドされ、未署名の `TukuruPlayer-unsigned.ipa` が成果物として出力されます
（実機に入れるには AltStore / Sideloadly などで署名が必要です）。

## 使い方

1. ゲームフォルダ（`Game.ini` と `Data` フォルダ、または `Game.rgss3a` を含むフォルダ）を iPhone の「ファイル」アプリなどに置く
2. アプリ右上の ＋ →「フォルダから追加」または「ZIP から追加」
3. RTP が必要なゲームは、設定 → RTP から PC の RTP フォルダ（`Graphics` / `Audio` を含むフォルダ）を読み込む
   - Windows の既定の場所: `C:\Program Files (x86)\Common Files\Enterbrain\RGSS3\RPGVXAce`（VX は `RGSS2\RPGVX`）
4. MIDI の BGM を使うゲームは、設定 → サウンドから General MIDI SoundFont（`.sf2`）を読み込む

### コントローラーの既定の割り当て

| コントローラー | RGSS | 用途 |
| --- | --- | --- |
| 十字キー / 左スティック | ↑↓←→ | 移動・選択 |
| 下ボタン（Xbox A） | C | 決定 |
| 右ボタン（Xbox B） | B | キャンセル / メニュー |
| 左ボタン（Xbox X） | A + SHIFT | ダッシュ |
| 上ボタン（Xbox Y） | X | |
| L1 / R1 | L / R | ページ切り替え |
| L2 / R2 | Y / Z | |
| Menu（Start） | B | メニュー |
| Options（Select） | — | ポーズメニュー |

設定画面で「右で決定」（日本式）への切り替えや、ボタンごとの割り当て変更ができます。

## PC での開発・テスト

```sh
cd web
npm ci && node build.mjs
python3 dev/make_testgame.py            # 自作素材のテストゲームを dev/testgame に生成（--archive で .rgss3a 化）
node dev/server.mjs dev/testgame        # http://localhost:8765/ をブラウザで開く
node dev/server.mjs /path/to/YourGame   # 手持ちのゲームも動作確認できます（TKR_RTP=RTPフォルダ で RTP 指定）
```

## 既知の制限

- RPGツクールXP（RGSS1）は未対応です
- `Graphics.play_movie`（Ogg Theora 動画）は未対応です
- `Win32API` / DLL を使う外部スクリプト（マウス・独自キー入力など）はダミー動作になります
- `Thread` は即時実行で代替しています
- WebAssembly 上で Ruby を実行するため、処理の重いスクリプトを多用するゲームでは PC より遅くなる場合があります

## ライセンス

同梱している第三者ソフトウェア（各ライセンスに従います）:
ruby.wasm（MIT / Ruby License）、browser_wasi_shim（MIT / Apache-2.0）、stb_vorbis（Public Domain / MIT）、ZIPFoundation（MIT）。
