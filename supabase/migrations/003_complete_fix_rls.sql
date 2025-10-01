-- RLSを完全に修正（全ポリシーを削除して再作成）

-- Step 1: RLSを一時的に無効化
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: 全てのポリシーを削除
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Step 3: RLSを再度有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: シンプルな新しいポリシーを作成

-- 全ての認証済みユーザーは全てのプロファイルを閲覧可能
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- ユーザーは自分のプロファイルのみ更新可能
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 認証済みユーザーはプロファイル作成可能
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
