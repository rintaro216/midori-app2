-- みどり楽器 商品整理アプリ データベース設計
-- 作成日: 2025-09-30

-- ==========================================
-- 1. ユーザー拡張テーブル（profiles）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- プロファイルのRLSポリシー
CREATE POLICY "ユーザーは自分のプロファイルを閲覧可能"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "ユーザーは自分のプロファイルを更新可能"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "管理者は全てのプロファイルを閲覧可能"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 2. 仕入先マスタテーブル（suppliers）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- 全員が仕入先を閲覧可能
CREATE POLICY "全員が仕入先を閲覧可能"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (true);

-- 管理者のみ仕入先を編集可能
CREATE POLICY "管理者のみ仕入先を編集可能"
  ON public.suppliers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 3. 在庫テーブル（inventory）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 商品基本情報
  category TEXT NOT NULL, -- 種類（エレキギター、アコギ、ベース、アンプ等）
  product_name TEXT NOT NULL, -- 商品名
  manufacturer TEXT, -- メーカー（フェンダー、ギブソン等）
  model_number TEXT, -- 品番
  color TEXT, -- カラー（ヴィンテージサンバースト等）
  serial_number TEXT, -- シリアルナンバー

  -- 価格情報
  retail_price DECIMAL(10, 2), -- 販売価格（定価）
  purchase_price DECIMAL(10, 2), -- 仕入値段
  purchase_discount_rate DECIMAL(5, 2), -- 仕入掛け率（%）

  -- 仕入情報
  purchase_date DATE, -- 仕入日
  supplier_id UUID REFERENCES public.suppliers(id), -- 仕入先ID
  supplier_name TEXT, -- 仕入先名（非正規化：検索用）

  -- 状態管理
  status TEXT NOT NULL DEFAULT 'available' CHECK (
    status IN ('available', 'reserved', 'repair', 'display', 'sold')
  ), -- 販売中/取り置き/修理中/展示中/売却済み
  condition TEXT CHECK (
    condition IN ('new', 'used', 'display')
  ), -- 新品/中古/展示品
  condition_notes TEXT, -- コンディション詳細（傷、変色等）

  -- 画像
  image_url TEXT, -- 商品写真URL（Supabase Storage）

  -- メタデータ
  created_by UUID REFERENCES public.profiles(id), -- 登録者
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成（検索高速化）
CREATE INDEX idx_inventory_category ON public.inventory(category);
CREATE INDEX idx_inventory_manufacturer ON public.inventory(manufacturer);
CREATE INDEX idx_inventory_status ON public.inventory(status);
CREATE INDEX idx_inventory_purchase_date ON public.inventory(purchase_date);
CREATE INDEX idx_inventory_serial_number ON public.inventory(serial_number);
CREATE INDEX idx_inventory_model_number ON public.inventory(model_number);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- 全員が在庫を閲覧可能
CREATE POLICY "全員が在庫を閲覧可能"
  ON public.inventory FOR SELECT
  TO authenticated
  USING (true);

-- 全員が在庫を登録可能
CREATE POLICY "全員が在庫を登録可能"
  ON public.inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 全員が在庫を更新可能
CREATE POLICY "全員が在庫を更新可能"
  ON public.inventory FOR UPDATE
  TO authenticated
  USING (true);

-- 全員が在庫を削除可能
CREATE POLICY "全員が在庫を削除可能"
  ON public.inventory FOR DELETE
  TO authenticated
  USING (true);

-- ==========================================
-- 4. 仕入履歴テーブル（purchase_history）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 請求書情報
  invoice_number TEXT, -- 請求書番号
  invoice_date DATE NOT NULL, -- 請求書日付
  invoice_pdf_url TEXT, -- 請求書PDFのURL（Supabase Storage）

  -- 仕入先情報
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT NOT NULL, -- 仕入先名（非正規化）

  -- 商品情報（在庫テーブルと紐付け）
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,

  -- 商品詳細（請求書から読み取った情報）
  product_name TEXT NOT NULL,
  manufacturer TEXT,
  model_number TEXT,
  serial_number TEXT,
  color TEXT,

  -- 価格情報
  purchase_price DECIMAL(10, 2) NOT NULL, -- 仕入値
  purchase_discount_rate DECIMAL(5, 2), -- 掛け率
  retail_price DECIMAL(10, 2), -- 定価

  -- AI解析情報
  ai_confidence DECIMAL(5, 2), -- AI読み取り信頼度（0-100%）
  ai_status TEXT CHECK (
    ai_status IN ('success', 'needs_review', 'failed', 'manual')
  ), -- 読み取り成功/要確認/失敗/手動入力

  -- メタデータ
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_purchase_history_invoice_date ON public.purchase_history(invoice_date);
CREATE INDEX idx_purchase_history_supplier_id ON public.purchase_history(supplier_id);
CREATE INDEX idx_purchase_history_inventory_id ON public.purchase_history(inventory_id);
CREATE INDEX idx_purchase_history_serial_number ON public.purchase_history(serial_number);
CREATE INDEX idx_purchase_history_model_number ON public.purchase_history(model_number);

ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;

-- 全員が仕入履歴を閲覧可能
CREATE POLICY "全員が仕入履歴を閲覧可能"
  ON public.purchase_history FOR SELECT
  TO authenticated
  USING (true);

-- 全員が仕入履歴を登録可能
CREATE POLICY "全員が仕入履歴を登録可能"
  ON public.purchase_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 全員が仕入履歴を更新可能
CREATE POLICY "全員が仕入履歴を更新可能"
  ON public.purchase_history FOR UPDATE
  TO authenticated
  USING (true);

-- ==========================================
-- 5. 請求書テーブル（invoices）
-- ==========================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 請求書情報
  invoice_number TEXT,
  invoice_date DATE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT NOT NULL,

  -- ファイル情報
  pdf_url TEXT NOT NULL, -- Supabase StorageのURL
  pdf_file_name TEXT NOT NULL,
  pdf_file_size INTEGER, -- バイト単位

  -- 処理状態
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    processing_status IN ('pending', 'processing', 'completed', 'needs_review', 'failed')
  ),

  -- AI解析結果
  total_items INTEGER DEFAULT 0, -- 商品点数
  successful_reads INTEGER DEFAULT 0, -- 読み取り成功数
  needs_review_count INTEGER DEFAULT 0, -- 要確認数
  failed_reads INTEGER DEFAULT 0, -- 読み取り失敗数

  -- メタデータ
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_invoices_invoice_date ON public.invoices(invoice_date);
CREATE INDEX idx_invoices_supplier_id ON public.invoices(supplier_id);
CREATE INDEX idx_invoices_processing_status ON public.invoices(processing_status);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 全員が請求書を閲覧可能
CREATE POLICY "全員が請求書を閲覧可能"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (true);

-- 全員が請求書をアップロード可能
CREATE POLICY "全員が請求書をアップロード可能"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 全員が請求書を更新可能
CREATE POLICY "全員が請求書を更新可能"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (true);

-- ==========================================
-- 6. 関数: updated_atの自動更新
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー設定
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_purchase_history_updated_at
  BEFORE UPDATE ON public.purchase_history
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================
-- 7. Storage Buckets設定（Supabaseコンソールで実行）
-- ==========================================
-- 商品画像用バケット: product-images
-- 請求書PDF用バケット: invoices
-- 両方とも認証済みユーザーのみアクセス可能に設定