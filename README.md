# まなびラボ — 勉強法実験アプリ

自分に合う勉強法を、英単語の暗記実験で見つけるWebアプリです。

## ドキュメント

- [プロダクト定義書 v1.0](docs/プロダクト定義書_v1.0.txt)
- [技術選定書 v1.0](docs/技術選定書_v1.0.txt)
- [2週間開発スケジュール v2.0](docs/2週間開発スケジュール_v2.0.md)

## 開発環境

Node.js 24 を使用します。依存パッケージを入れたあと、`npm run dev` で開発サーバー、`npm run build` で本番ビルドを実行できます。Vercelのビルド先は `vercel.json` に設定しています。

```bash
npm install
npm run dev
```

## 採用技術

React、TypeScript、Vite、Tailwind CSS、React Router、Recharts、localStorageを使用します。英単語セットは `src/data/wordSets.json`、共通の型と保存処理は `src/domain`、`src/data` にあります。

## 実装済みの体験

- ホームから実験設定へ進む
- 3種類から比較する勉強法を2つ選ぶ
- 選んだ2種類のうち、実験前の予想を選ぶ
- 学習、自己採点テスト、結果比較、履歴表示
- バージョン付きlocalStorage保存と旧形式の履歴移行
- PC・スマートフォン向けレイアウト

翌日テストは後続の開発項目です。現在の単語データは初期デモ用です。
