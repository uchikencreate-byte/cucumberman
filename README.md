# CUCUMBERMAN: Toy Shelf Guardian

COBSANYA（須賀川市のアメリカントイ店）のオリジナルキャラクター「キュウカンバーマン」が主人公の、スマホ縦画面向け縦スクロールシューティングです。全5ステージ。

- ビルド不要の静的ファイル（HTML / CSS / JavaScript）だけで動きます
- 操作: 画面をドラッグで移動、ショットボタンを押しているあいだ弾が出る。PCは矢印キー / WASD で移動、Z / スペース=ショット、X=バリア、C=必殺技、P / Esc=ポーズ
- 自動連射に戻したいときは `js/config.js` の `autoFire` を `true` にする

## 遊び方（手元で確認する）

ブラウザの決まりで、`index.html` をダブルクリックして開くと一部の機能（ステージ5の目の色の変化）が動きません。フォルダでかんたんなサーバーを立てて開きます。

```bash
python3 -m http.server 8000
```

ブラウザで http://localhost:8000 を開きます。

## GitHub Pages で公開する

1. GitHub で新しいリポジトリを作り、このフォルダの中身をそのまま push する
2. リポジトリの Settings → Pages → Branch を `main` / `/(root)` にして Save
3. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で遊べる

`素材/`（元画像）と `曲/`（元の曲ファイル）はゲームでは使いません。リポジトリに入れるかどうかは任せます（入れなくても動きます）。

## BGM の差し込み

`assets/bgm/` に、決まった名前の mp3 を置くと鳴ります。曲がなければ無音で動きます。差し替えは同じ名前で上書きするだけです（m4a / ogg も可）。

| ファイル名 | シーン |
|---|---|
| `bgm_title.m4a` | タイトル・ステージ選択・オープニング（`曲/OP_Leathers_Motorcycle.mp3`） |
| `bgm_stage1.mp3` | ステージ1（`曲/1ステージ_開拓時代.mp3`） |
| `bgm_stage2.mp3` | ステージ2（`曲/2ステージ_Time_Travel .mp3`） |
| `bgm_stage3.m4a` | ステージ3（`曲/3ステージ_Malice_in_Wonderland.mp3`） |
| `bgm_stage4.mp3` | ステージ4（`曲/4ステージ_ピエロは暗闇で踊る.mp3`） |
| `bgm_stage5.m4a` | ステージ5 の道中（`曲/5ステージ_1.mp3`） |
| `bgm_stage5_boss.m4a` | ステージ5 のガラクタ大王戦（`曲/5ステージ_2.mp3`）。無ければ道中の曲のまま |
| `bgm_ending.m4a` | エンディング（`曲/ED_アメリカ･オン･マイ･マインド.mp3`） |

`.m4a` の曲は、元の mp3 が重かったので、スマホで読み込みやすいように AAC 128kbps に変換したものです（元の曲は `曲/` にあります）。Mac なら次のコマンドで同じように変換できます。同じスロットに `.mp3` と `.m4a` の両方を置くと `.mp3` が優先されるので、どちらか片方だけにしてください。

```bash
afconvert -f m4af -d aac -b 128000 "曲/元の曲.mp3" assets/bgm/bgm_xxx.m4a
```

曲を選んだら、[CREDITS.md](CREDITS.md) の使用素材リストに出どころと規約を記録してください。

## 数値の調整

弾の数・速さ、体力、スコア、バリアの時間などは、すべて [js/config.js](js/config.js) にまとまっています（すべて仮の値）。

調整用に、URL の後ろにオプションを付けられます。

| オプション | 内容 |
|---|---|
| `?speed=3` | 早送り（1〜8倍） |
| `?god=1` | 無敵 |
| `?clear=4` | クリア済みステージ数を上書き（仲間の力やステージ5の確認用。この値はブラウザに保存されます） |

例: `http://localhost:8000/?speed=3&god=1&clear=4`

ブラウザに保存された進み具合を消したいときは、ブラウザの開発者ツールで localStorage の `cucumberman_save_v1` を削除します。

## ファイル構成

```
index.html          画面の骨組み
css/style.css       見た目
js/config.js        数値の設定（ここを調整する）
js/stages.js        ステージごとの敵の出方（タイムライン）
js/enemies.js       ザコ敵の動き
js/bosses.js        ボスの攻撃パターン
js/story.js         会話シーンのセリフ
js/game.js          ゲーム本体（当たり判定・仲間の力・描画）
js/ui.js            画面の切りかえ・ゲーム全体の流れ
js/audio.js         効果音（コードで作る電子音）と BGM
js/assets.js        画像の読み込み
js/engine.js        画面・入力・描画の共通部品
assets/             ゲームで使う画像（tools/process_assets.py で 素材/ から作ったもの）
tools/process_assets.py  素材/ → assets/ の変換（背景の透過・切り出し・縮小・背景の調整）
```

### 画像を差し替えたいとき

`素材/` の元画像を差し替えて、次を実行すると `assets/` が作り直されます（Python の numpy / scipy / pillow が必要）。元画像と出力名の対応はスクリプトの先頭にあります。

```bash
python3 tools/process_assets.py
```

## 公開前の確認事項

- タイトルの「CUCUMBERMAN」の綴り（お客さんの公式表記が決まったら `index.html` と `js/story.js` を差し替え）
- キュウカンバーマンの使用について、店長の最終確認
- BGM の出どころと規約（[CREDITS.md](CREDITS.md)）
