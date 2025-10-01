-- RLSポリシーの無限ループを修正
-- 既存のポリシーを削除して、正しいポリシーを再作成

-- 既存のprofilesテーブルのポリシーを全て削除
DROP POLICY IF EXISTS "ユーザーは自分のプロファイルを閲覧可能" ON public.profiles;
DROP POLICY IF EXISTS "ユーザーは自分のプロファイルを更新可能" ON public.profiles;
DROP POLICY IF EXISTS "管理者は全てのプロファイルを閲覧可能" ON public.profiles;

-- 新しいポリシーを作成（無限ループを避けるため、シンプルな設計に変更）

-- 全ての認証済みユーザーは全てのプロファイルを閲覧可能
CREATE POLICY "認証済みユーザーは全プロファイルを閲覧可能"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- ユーザーは自分のプロファイルのみ更新可能
CREATE POLICY "ユーザーは自分のプロファイルを更新可能"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- プロファイルの挿入は認証後に自動で行われる（トリガーで処理）
CREATE POLICY "認証済みユーザーはプロファイル作成可能"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
