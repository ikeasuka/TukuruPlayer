# 引き継ぎメモ（ローカル作業用）

このファイルは、クラウドのセッションからローカル PC のセッションへ作業を引き継ぐためのメモです。

## 現状

- iOS アプリ（ios/）と Web ランタイム（web/：ruby.wasm + WebGL2 で RGSS2/3 を実行）は動作し、CI（.github/workflows/ios.yml）で未署名 IPA を作成している。
- 実機テスト対象ゲーム: `C:\Users\tuku\Desktop\GANTZ ike`（VX Ace、スクリプト 136 本。サイドビュー戦闘、KMS_EnemyGuide、Screen_Size_Changer(LNX25)、Main に独自の `LPEX.d` / `load_data` 上書きあり）。
- 端末: iOS 26.6.2, RAM 約 3.7GB。

## 実機で起きていた問題と対応状況（ビルド #12 で修正、実機未確認）

1. 会話ウィンドウで顔グラフィックを描くと `drawImage` が例外 → Web プロセス終了。
   - 対応: 画像は読み込み時に 2D canvas に描き直して保持（ImageBitmap を保持しない）、canvas 操作を guard してログ化。
2. `ArgumentError: marshal data too short`（Main:26 `LPEX.d` ← `load_data`）。
   - 原因: プレースホルダ（未読込の 0 バイトファイル）を r+ / a モードで開くと空の内容が書き戻され、ゲームデータを破壊していた。
   - 対応: 切り詰めモード以外では先に実ファイルを読み込む（web/rgss/70_kernel.rb）。端末側のゲームは削除→再追加が必要。
3. タイトルの「つづきから」でアプリごと落ちる（ネイティブ側のクラッシュ）。
   - 推定: AVAudioEngine の実行中の再接続・停止中の play() による例外。
   - 対応: 全音声を 44.1kHz ステレオに変換し再接続しない、play() 前に engine.isRunning を確認。異常終了時は次回起動でログを表示（GameLog / CrashReportView）。
4. 公式 RTP の ZIP はインストーラーのため読み込み不可 → インストール済みフォルダを ZIP にするよう案内文を表示。

## ローカルでの確認方法（実ゲームをブラウザで動かす）

```
cd web
npm ci
node build.mjs
node dev\server.mjs "C:\Users\tuku\Desktop\GANTZ ike"
```

ブラウザで http://localhost:8765/ を開く（矢印 / Z=決定 / X=キャンセル / Shift=ダッシュ）。
サーバーのコンソールに `[game:...]`（Ruby の出力・エラー）、`[save]`（ファイル書き込み）、`[audio]` が出る。
ゲームのスクリプト本体は `Data/Scripts.rvdata2`（暗号化アーカイブ `Game.rgss3a` 内の場合あり）。dev/gamefs.mjs でアーカイブも読める。

自動テスト: `python dev/make_testgame.py` → `node dev/e2e.mjs dev/testgame shot`（Playwright が必要）。

## 次にやること

1. 上記の方法で GANTZ ike をブラウザで起動し、タイトル → ニューゲーム → 会話（顔グラフィック）→ つづきから を確認する。
2. エラーが出たら web/rgss（Ruby 側の RGSS 実装）または web/src（描画・入出力）を修正し、ブラウザで再確認。
3. iOS 固有の問題（音声・ファイル取り込み・レイアウト）は ios/TukuruPlayer の Swift を修正。iOS のビルドは Windows ではできないため、push して CI の IPA を使う。
