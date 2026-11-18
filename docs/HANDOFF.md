# 引き継ぎメモ

クラウドのセッションから、ローカル PC（Windows）での作業へ引き継ぐためのメモです。
新しい会話では、まずこのファイルを読ませてください。

- リポジトリ: `ikeasuka/TukuruPlayer`、作業ブランチ `claude/exciting-babbage-lxx40h`
- 最新コミット時点で「stack level too deep 対策」と「横画面の拡大」が入っています（実機では未確認）。

## アプリの概要

iPhone で RPG ツクール VX（RGSS2）/ VX Ace（RGSS3）のゲームを遊ぶアプリです。ゲームコントローラーとタッチパッドに対応しています。

| 場所 | 内容 |
|---|---|
| `ios/TukuruPlayer/` | Swift（SwiftUI + UIKit）のアプリ本体 |
| `ios/.../Library/` | ゲームの取り込み（ZIP / フォルダ、SJIS ファイル名、RTP）、ライブラリ画面、設定画面 |
| `ios/.../Player/` | WKWebView でランタイムを実行（`tkr://local/` スキーム）、`GameFileSystem`（大文字小文字無視、RGSSAD v1/v3、RTP）、セーブ、ログ（`GameLog`、`Documents/Logs/<id>.log`）、Web プロセス終了の検知 |
| `ios/.../Audio/` | AVAudioEngine。Ogg（stb_vorbis、ループ）、WAV / MP3、MIDI（SoundFont） |
| `ios/.../Input/` | GameController（ボタン割り当て）、仮想パッド、設定 |
| `ios/.../WebRuntime/` | `web/` のビルド結果（**コミット対象**。`app.js`、`index.html`、`ruby.wasm`） |
| `web/rgss/*.rb` | Ruby による RGSS 実装（Bitmap / Sprite / Window / Tilemap / Graphics / Input / Audio / RPG::*、Ruby 1.8/1.9 互換、ファイル入出力フック） |
| `web/src/*.js` | JS 側。WebGL2 描画（`gl.js`、`scene.js`、`tilemap.js`）、Bitmap（`bitmap.js`、canvas）、入力、起動処理（`main.js`） |
| `web/dev/` | 開発用。`server.mjs`（実ゲームをブラウザで動かす）、`e2e.mjs`（自動テスト）、`make_testgame.py`、`e2e_ace.mjs` |
| `tools/ImportTests/` | ZIP 取り込みのテスト（SwiftPM、macOS 用） |
| `.github/workflows/ios.yml` | CI。Ubuntu で Web の自動テスト（Chromium と WebKit）、macOS で IPA 作成とシミュレーターでの起動テスト |

仕組みは次のとおりです。

- Ruby（ruby.wasm、CRuby 3.4）がゲームのスクリプトを実行し、毎フレーム表示物の一覧を数値列にして JS に渡します。JS はそれを WebGL2 で描画します。
- `Graphics.update` などの待ち処理は `JS::Object#await` で実現しています。このため、ゲームは `evalAsync` の Fiber の中で動きます。
- 組み込みクラスの内部状態はすべて `@__` で始まるインスタンス変数に持たせています。ゲームのスクリプトがサブクラスで同じ名前の変数を使っても衝突しないようにするためです。

## 重要：Windows では iPhone 用アプリ（IPA）を作れない

- `web/`（ランタイム）の修正、ビルド、テストは Windows で問題なくできます。Node.js と Playwright を使い、Chromium と WebKit（Safari と同じエンジン）で実際のゲームを動かせます。
- `ios/`（Swift）のビルドと IPA の作成には **macOS と Xcode が必須**です。Windows ではできません。
- iPhone で試すための IPA を作る方法は次の 2 つです。
  1. GitHub Actions（CI）でビルドする。2026-11-18 時点では**無料枠を使い切ったため止まっています**。リポジトリを Public にすれば無料・無制限になり、Billing で上限を上げれば有料で再開できます。
  2. Mac（Xcode 16 以上）で `xcodegen` → `xcodebuild` を実行する（手順は下記）。

## Windows でのセットアップと確認方法

```
cd web
npm ci
npm i --no-save playwright
npx playwright install chromium webkit
node build.mjs                      # web/ → ios/TukuruPlayer/WebRuntime/ に出力
node dev\server.mjs "C:\Users\tuku\Desktop\GANTZ ike"
```

- ブラウザで http://localhost:8765/ を開きます。操作は 矢印 / Z=決定 / X=キャンセル / Shift=ダッシュ です。
- サーバーのコンソールには、Ruby の出力とエラー（`[game:...]`）、ファイル書き込み（`[save]`）、音声（`[audio]`）、段階ログ（`[stage]`）が出ます。
- iPhone に近い条件で試すときは、Safari と同じエンジンの WebKit を使います。手順は次のとおりです。
  1. Playwright の WebKit で上記の URL を開きます。
  2. `TKR_BROWSER=webkit` を指定して自動テストを実行します。

自動テスト:

```
python dev\make_testgame.py          # dev\testgame を生成（Pillow が必要）
node dev\e2e.mjs                     # Chromium
set TKR_BROWSER=webkit && node dev\e2e.mjs
```

`TEST OK` / `FLOW DONE` が出れば成功です。`TEST NG`、`PAGEERROR`、`FLOW` が途中で止まる場合は失敗です。

実ゲームのスクリプトを使うテスト（`make_acegame.py` + `e2e_ace.mjs`）もあります。`Scripts.rvdata2` はゲーム作者の著作物なので、リポジトリには入れていません。`python dev\make_acegame.py <Scripts.rvdata2> <出力先>` でゲームを作り、`node dev\e2e_ace.mjs <出力先>` で実行します。

修正したら `node build.mjs` を実行し、`ios/TukuruPlayer/WebRuntime/` も含めてコミットします。

## Mac で IPA を作る場合

```
brew install xcodegen
xcodegen generate
xcodebuild -project TukuruPlayer.xcodeproj -scheme TukuruPlayer -sdk iphoneos -configuration Release \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
mkdir Payload && cp -R build/Build/Products/Release-iphoneos/TukuruPlayer.app Payload/ && zip -qr TukuruPlayer.ipa Payload
```

できた IPA を Sideloadly で iPhone に入れます（無料の Apple ID の場合は 7 日で期限切れ）。Mac があれば、Xcode から実機に直接インストールすることもできます。

## 実機で確認済みのこと（GANTZ ike、iOS 26.6.2）

- 取り込み、タイトル画面、ニューゲーム、マップ移動、会話は動きます。
- 以前は起動後 12 秒ほどで WebKit のプロセスが落ちていました（理由 3 = Crash）。イベント命令のトレースを入れた版では落ちずに先へ進むようになりました。原因ははっきりしていません。
- 直近の不具合は `SystemStackError: stack level too deep`（マップ上で発生、バックトレースなし）でした。
  - 原因と考えられること: ランタイムは `evalAsync` の Fiber の中で動いています。Fiber の VM スタックの既定値では、Ruby のメソッドの入れ子が約 1,000 段までしかできませんでした（Windows のツクールは 1 万段以上）。
  - 対応: `web/src/main.js` で WASI の環境変数 `RUBY_FIBER_VM_STACK_SIZE=1048576` を渡すようにしました（約 2 万段）。`01_Test.rb` にテストを追加済みです。**実機では未確認**です。
  - それでも出る場合は、エラー画面に表示される「実行中のイベント: マップN イベントN N行目 (コードN)」とログを確認してください。
- 横画面ではゲームが小さく表示されていました。高さいっぱいまで拡大するよう修正済みです（`PlayerViewController.viewDidLayoutSubviews`）。**実機では未確認**です。

## ruby.wasm の制限（調査結果）

| 状況 | 結果 |
|---|---|
| Ruby メソッドの入れ子（VM スタック 1MB） | 約 2 万段まで。超えると `SystemStackError`（rescue 可能） |
| C 関数をまたぐ入れ子（`each { }` の中で再帰など） | 約 500 段まで。超えるとランタイムが落ちる（`unreachable`）。VM スタックを増やしても変わらない |
| C をまたぐ入れ子が **約 60 段を超えた状態で** `Graphics.update`（await）や `puts` を呼ぶ | ランタイムが落ちる（Asyncify のバッファ不足。ruby.wasm のビルド時定数で、実行時には変更できない） |

通常の RGSS のコードでは、`Graphics.update` を呼ぶ時点の入れ子は 15 段程度なので問題になりません。もし該当するゲームがあれば、ruby.wasm を Asyncify のバッファを大きくしてビルドし直す必要があります。

## 診断の仕組み

- `web/rgss/70_kernel.rb` の `TKRTrace` は、イベント命令（マップ・イベント・行・コード・パラメータ）とシーンの切り替えをログに出します（同じ命令は 600 フレームに 1 回まで）。
- `web/src/bitmap.js` の `crumb()` は、画像の読み込み、Bitmap のサイズ、blt、フォント、スプライトの機能（回転・波形・色調など）、テクスチャのアップロードについて、それぞれ初回だけを記録します。
- 実機のログは、アプリのクラッシュ画面または一時停止メニューの「ログを共有」で取り出せます。
- 設定 →「ゲーム付属のフォントを使う」で、ゲームの `Fonts` フォルダの読み込みを切り替えられます（診断用）。

## 対応していないもの

- `wfPcrypt.dll` などの Win32API で暗号化データを復号するゲーム（例：処女クエスト！）は動かせません。専用のメッセージを表示します。
- 公式 RTP の ZIP はインストーラーなので読み込めません。PC にインストールした RTP のフォルダを ZIP にしてもらいます。RTP をアプリに同梱することはライセンス上できません。

## 次にやること

1. IPA を作れるようにする（CI を再開するか Mac を用意する）。
2. GANTZ ike で次の点を実機確認する。
   - stack level too deep が直ったか
   - 横画面で大きく表示されるか
   - 戦闘（サイドビュー）、メニュー、セーブ / ロードが動くか
3. エラーが出たらログを見て、`TKRTrace` の「実行中のイベント」と `[stage]` の記録から原因を特定する。可能ならゲームの `Data` フォルダを使い、Windows のブラウザ（WebKit）で同じ場面を再現して直す。
4. 細かい点: アプリのビルド番号が常に「build 1」と表示される（`project.yml` / Info.plist の `CFBundleVersion` を `$(CURRENT_PROJECT_VERSION)` にする）。

## 新しい会話の最初に貼る文の例

```
docs/HANDOFF.md を読んで、TukuruPlayer（iPhone で RPG ツクール VX / VX Ace を遊ぶアプリ）の作業を引き継いでください。
作業フォルダは C:\Users\tuku\Documents\workspace\TukuruPlayer です（ブランチ claude/exciting-babbage-lxx40h）。
返答は日本語でお願いします。
```
