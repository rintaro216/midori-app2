export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold">
          🎵 みどり楽器 商品整理アプリ v2.0
        </h1>
        <p className="text-xl text-gray-600">
          在庫管理・請求書管理システム
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="p-6 border rounded-lg hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">📊 ダッシュボード</h2>
            <p className="text-gray-600">総資産額・在庫状況を確認</p>
          </div>
          <div className="p-6 border rounded-lg hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">📦 一括登録</h2>
            <p className="text-gray-600">AI/PDF/OCR読取</p>
          </div>
          <div className="p-6 border rounded-lg hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">✍️ 手動入力</h2>
            <p className="text-gray-600">単品登録</p>
          </div>
          <div className="p-6 border rounded-lg hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">📋 商品一覧</h2>
            <p className="text-gray-600">検索・編集・削除</p>
          </div>
        </div>
        <div className="mt-8 text-sm text-gray-500">
          <p>開発中 - ポート: 3005</p>
        </div>
      </div>
    </div>
  );
}