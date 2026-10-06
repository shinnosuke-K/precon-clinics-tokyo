# プレコンセプションケア 検査費等助成 登録医療機関一覧

東京都のプレコンセプションケア（検査費等助成）に登録されている医療機関を、地域・条件で絞り込んで検索できる静的サイトです。

> [!NOTE]
> 本サイトは個人が作成した**非公式**のページであり、東京都・東京都福祉局が運営するものではありません。

**公開ページ:** https://shinnosuke-k.github.io/precon-clinics-tokyo/

## 機能

- 医療機関名・住所・電話番号のキーワード検索（全角・半角、カタカナ・ひらがなの表記ゆれを吸収）
- 地域（区市町村）での絞り込み
- 検査メニュー（AMH検査・精液検査など）での絞り込みと、選択した検査の料金順ソート
- 条件チップでの絞り込み（女性可 / 男性可 / オンライン相談 / web予約 / 専門医在籍 / 受付中のみ）
- 絞り込み条件はURLのクエリに保存され、そのままのURLで共有・再表示できる
- 各医療機関の詳細ページ（`/c/{登録番号}/`。受診方法、費用、必須検査・任意検査の項目と金額）
- Googleマップへの住所リンク
- ダークモード（ヘッダーのボタンで切替。初期状態はOS設定に追従し、切り替えた選択はブラウザに保存）

## ファイル構成

[Astro](https://astro.build/) で静的HTMLを生成しています。一覧ページの絞り込みだけがブラウザ側のJSで動き、詳細ページはJSなしの静的HTMLです。

| パス | 内容 |
| --- | --- |
| `data/*.xlsx` | 元データ（登録医療機関一覧）。名前順で最後のファイルが使われます |
| `scripts/build.py` | Excelから `src/data/clinics.json` を生成するスクリプト |
| `src/data/clinics.json` | ページが読み込むデータ（生成物。コミットしておくとローカル開発時にPythonが不要） |
| `src/pages/index.astro` | 一覧ページ |
| `src/pages/c/[n].astro` | 医療機関ごとの詳細ページ（183ページを静的生成） |
| `src/scripts/filter.ts` | 一覧の検索・絞り込み・並び替え（ブラウザ側） |
| `src/lib/` | データの集計、料金表示などの共通処理 |
| `src/components/`, `src/layouts/` | ヘッダー・フィルタ・詳細表示などの部品 |
| `src/styles/global.css` | スタイル |
| `public/asset/` | favicon・OGP画像 |

## データについて

東京都福祉局「[プレコンセプションケア](https://www.fukushi.metro.tokyo.lg.jp/kodomo/shussan/preconceptioncare)」ページで公開されている登録医療機関一覧（令和8年8月31日時点）を参照して作成しています。掲載内容（受付状況・費用等）は変わる可能性があるため、受診の際は各医療機関に直接ご確認ください。

## 更新方法

新しい一覧データが公開されたら、Excelファイルを `data/` に追加してmainにpushするだけです。

GitHub Actions（`.github/workflows/deploy.yml`）がpushを検知して次を自動で行います。

1. `scripts/build.py` を実行し、`data/` 内で名前順最後のExcelから `src/data/clinics.json` を再生成
2. `npm run build` で `dist/` に静的HTMLを生成
3. GitHub Pages へデプロイ

Excelのファイル名は `20270331tourokuiryoukikan.xlsx` のように日付始まりにすると、名前順で自動的に最新版が選ばれます。

## ローカルでの開発

Node.js 22（`.node-version`）と、データ再生成には [uv](https://docs.astral.sh/uv/) を使います。

```bash
uv run scripts/build.py    # data/ の Excel から src/data/clinics.json を再生成（引数でExcelの指定も可）
```

```bash
npm install && npm run dev    # http://localhost:4321/precon-clinics-tokyo/
```

```bash
npm run build && npm run preview    # 本番と同じ静的HTMLを dist/ に生成して確認
```
