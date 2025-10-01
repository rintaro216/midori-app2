# みどり楽器 商品整理アプリ v2.0

在庫管理・請求書管理システム

## 🎯 プロジェクト概要

英生さんの30年の苦労を解決し、チーム全員で協力して店舗運営を行うための在庫管理システムです。

### 主な機能
- 📦 **AI一括登録**: 請求書をカメラ撮影 → AI自動読取 → 確認・編集 → 登録
- ✍️ **手動入力**: スマホでも快適な単品登録
- 📋 **商品一覧**: 検索・フィルタ・編集・削除
- 🔍 **在庫×請求書突合せ**: いつ、いくらで仕入れたか即座に確認
- 💡 **AI処分候補レコメンド**: 2年以上滞留の不良在庫を可視化
- 📄 **請求書管理**: PDFアップロード・再ダウンロード
- 🔐 **権限管理**: 管理者/スタッフで表示内容を分離

## 🛠️ 技術構成

- **フロントエンド**: Next.js 15.5.3 (App Router) + React 19.1.0 + TypeScript 5.7.2
- **スタイリング**: Tailwind CSS 4.1.13（レスポンシブ対応）
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **AI/OCR**: OpenAI API、Azure Computer Vision、Tesseract.js（フォールバック）
- **PDF処理**: pdf-parse、pdf-lib、pdfjs-dist
- **デプロイ**: Vercel

## 📦 セットアップ

### 1. 依存パッケージのインストール

\`\`\`bash
npm install
\`\`\`

### 2. Supabaseプロジェクト設定

詳細は `DATABASE_SETUP.md` を参照してください。

1. https://supabase.com/ でプロジェクト作成
2. SQL Editorで `supabase/migrations/001_create_tables.sql` を実行
3. Storage Bucketsを作成（product-images、invoices）
4. 環境変数を設定

### 3. 環境変数

\`.env.local\` ファイルを作成:

\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Azure Computer Vision（オプション）
AZURE_COMPUTER_VISION_ENDPOINT=your_azure_endpoint
AZURE_COMPUTER_VISION_KEY=your_azure_key
\`\`\`

### 4. 開発サーバー起動

\`\`\`bash
npm run dev
\`\`\`

→ http://localhost:3005 でアプリが起動します

### 5. 本番ビルド

\`\`\`bash
npm run build
npm start
\`\`\`

## 📊 データベース構造

### テーブル一覧
- \`profiles\`: ユーザー情報（管理者/スタッフ）
- \`suppliers\`: 仕入先マスタ
- \`inventory\`: 在庫テーブル（商品の現在の状態）
- \`purchase_history\`: 仕入履歴テーブル
- \`invoices\`: 請求書テーブル

### 主要な関係性

\`\`\`
inventory（在庫）
  ↓ model_number / serial_number で紐付け
purchase_history（仕入履歴）
  → いつ、いくらで仕入れたか確認可能
  → 同じ商品の複数回の仕入れ履歴を全て記録

invoices（請求書）
  → PDFファイル保存
  → AI解析結果を記録
\`\`\`

## 🎨 画面構成

### 公開ページ
- \`/login\`: ログイン画面

### 認証必須ページ
- \`/dashboard\`: ダッシュボード（権限別表示）
- \`/inventory/add\`: 手動入力（スマホ対応）
- \`/inventory/bulk-register\`: 一括登録（AI読取）
- \`/inventory\`: 商品一覧
- \`/invoices\`: 請求書管理（管理者のみ）
- \`/disposal-candidates\`: 処分候補（管理者のみ）

## 👥 権限管理

### 管理者（admin）
- 総資産額、利益率を閲覧
- AI処分候補レコメンド
- 請求書管理
- 銀行レポート出力
- 全ての商品操作

### スタッフ（staff）
- 商品一覧閲覧（仕入値は非表示）
- 商品登録・更新
- 自分の貢献度確認
- クイックアクション

## 🚀 デプロイ（Vercel）

### 初回デプロイ

1. GitHubにプッシュ
2. Vercelで「New Project」
3. リポジトリを選択
4. 環境変数を設定
5. 「Deploy」をクリック

### 環境変数設定

Vercelダッシュボード → Settings → Environment Variables

- \`NEXT_PUBLIC_SUPABASE_URL\`
- \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`
- \`OPENAI_API_KEY\`

## 📱 スマホ対応

- **モバイルファースト設計**
- タッチ操作に最適化（ボタンサイズ44px以上）
- レスポンシブUI（Tailwind CSS）
- 一括登録: カメラで請求書を撮影 → そのままアップロード
- 手動入力: 片手操作、大きめの入力欄、縦1列表示

## 🎯 今後の実装予定

現在完成している機能:
- ✅ プロジェクトセットアップ
- ✅ データベース設計
- ✅ 認証システム
- ✅ ダッシュボード（権限別表示）
- ✅ 手動入力画面（スマホ対応）

今後実装する機能:
- 📋 商品一覧画面（検索・フィルタ・削除）
- 📦 AI一括登録機能
- 🔍 在庫×請求書突合せ
- 💡 AI処分候補レコメンド
- 📄 請求書管理
- 📈 CSVエクスポート
- 📊 銀行レポート

## 💪 このプロジェクトで実現すること

### 英生さんの30年の苦労を解決
- 「一人でいっぱいいっぱい」→ 全員参加の店舗運営へ
- 「適当な棚卸」→ データに基づいた正確な在庫管理へ
- 「請求書の山」→ デジタル化で即座に検索・確認

### チーム全体の力で店を盛り上げる
- 水口さん・法亢さんの手書き作業 → スマホで簡単デジタル入力
- スタッフの貢献度を見える化 → モチベーション向上
- 全員が経営状況を理解 → 改善提案できる環境

### 銀行・決算対応もバッチリ
- 「ちゃんとした適正在庫ありますか？」→ 即座に資料提出
- 今年の決算（12月31日）→ きっちり出せる準備
- 6000-7000万円の借入金 → データで返済計画を立てる

---

**みどり楽器チーム全体で成功させる。英生さんを支え、みんなで店を盛り上げる。**