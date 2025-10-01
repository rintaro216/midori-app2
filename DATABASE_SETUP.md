# データベースセットアップ手順

## Supabaseプロジェクトの準備

### 1. Supabaseプロジェクト作成
1. https://supabase.com/ にアクセス
2. 「New Project」をクリック
3. プロジェクト名: `midori-inventory-v2`
4. Database Password を設定（強力なパスワードを推奨）
5. Region: `Northeast Asia (Tokyo)` を選択
6. 「Create new project」をクリック

### 2. データベーステーブル作成
1. Supabaseダッシュボードの左メニューから「SQL Editor」を選択
2. 「New Query」をクリック
3. `supabase/migrations/001_create_tables.sql` の内容をコピー&ペースト
4. 「Run」をクリックして実行

### 3. Storage Buckets作成

#### 商品画像用バケット
1. 左メニューから「Storage」を選択
2. 「New bucket」をクリック
3. Name: `product-images`
4. Public bucket: ✅ オン（公開バケット）
5. 「Create bucket」をクリック

#### 請求書PDF用バケット
1. 「New bucket」をクリック
2. Name: `invoices`
3. Public bucket: ❌ オフ（非公開・認証済みユーザーのみ）
4. 「Create bucket」をクリック

### 4. Storage Policies設定

#### product-images バケット
```sql
-- 認証済みユーザーは画像アップロード可能
CREATE POLICY "認証済みユーザーは画像アップロード可能"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- 認証済みユーザーは画像更新可能
CREATE POLICY "認証済みユーザーは画像更新可能"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- 認証済みユーザーは画像削除可能
CREATE POLICY "認証済みユーザーは画像削除可能"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- 全員が画像閲覧可能（公開バケット）
CREATE POLICY "全員が画像閲覧可能"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');
```

#### invoices バケット
```sql
-- 認証済みユーザーは請求書アップロード可能
CREATE POLICY "認証済みユーザーは請求書アップロード可能"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoices');

-- 認証済みユーザーは請求書閲覧可能
CREATE POLICY "認証済みユーザーは請求書閲覧可能"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'invoices');

-- 認証済みユーザーは請求書更新可能
CREATE POLICY "認証済みユーザーは請求書更新可能"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'invoices');
```

### 5. 環境変数設定
1. Supabaseダッシュボードの「Settings」→「API」を選択
2. 以下の値をコピー:
   - Project URL
   - anon public key

3. `.env.local` ファイルを編集:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
```

### 6. 初期ユーザー作成（管理者）
1. Supabaseダッシュボードの「Authentication」→「Users」を選択
2. 「Add user」→「Create new user」をクリック
3. Email: 英生さんのメールアドレス
4. Password: 強力なパスワードを設定
5. 「Create user」をクリック

6. SQL Editorで以下を実行（管理者権限を付与）:
```sql
-- ユーザーIDを確認
SELECT id, email FROM auth.users;

-- 管理者プロファイル作成
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'ユーザーID', -- 上記で確認したID
  'hideki@midorigakki.com', -- メールアドレス
  '英生',
  'admin'
);
```

### 7. スタッフユーザー作成
同様の手順で水口さん、法亢さんのアカウントを作成し、
roleは `'staff'` に設定します。

## データベース構造

### テーブル一覧
- `profiles`: ユーザー情報（管理者/スタッフ）
- `suppliers`: 仕入先マスタ
- `inventory`: 在庫テーブル（商品の現在の状態）
- `purchase_history`: 仕入履歴テーブル
- `invoices`: 請求書テーブル

### 主要なカラム説明

#### inventory（在庫）
- 商品の**現在の状態**を管理
- 水口さん・法亢さんの手書き在庫チェック → ここに入力
- 1商品1レコード（同じ商品でも仕入れ時が違えば別レコード）

#### purchase_history（仕入履歴）
- 請求書から読み取った**仕入れ情報**を管理
- AI一括登録機能で自動入力
- inventory_idで在庫テーブルと紐付け
- 同じ商品の複数回の仕入れ履歴を全て記録

#### 突合せ機能の仕組み
```
商品（inventory）
  ↓
  model_number / serial_number で検索
  ↓
仕入履歴（purchase_history）
  → いつ、いくらで仕入れたか確認可能
```

## セットアップ完了後の確認

### 開発サーバー起動
```bash
cd "D:\claude\midori-app-v2"
npm run dev
```

http://localhost:3005 にアクセスして動作確認

### 接続テスト
以下のコマンドでSupabase接続をテスト:
```bash
# まだ実装していないため後で確認
```

## トラブルシューティング

### エラー: "Failed to fetch"
- `.env.local` のSupabase URLとAPIキーを確認
- Supabaseプロジェクトが起動しているか確認

### エラー: "RLS policy violation"
- RLSポリシーが正しく設定されているか確認
- ユーザーが認証されているか確認

### Storage Uploadエラー
- Storage Bucketsが作成されているか確認
- Storage Policiesが設定されているか確認