import { getUserProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase-server';
import Navbar from '@/components/Navbar';
import DashboardCharts from '@/components/DashboardCharts';
import Link from 'next/link';

export default async function DashboardPage() {
  const profile = await getUserProfile();
  const supabase = await createClient();

  // 在庫データ取得
  const { data: inventoryData, count: totalItems } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: false })
    .neq('status', 'sold');

  // 総資産額計算（管理者のみ）
  let totalAssetValue = 0;
  if (profile?.role === 'admin' && inventoryData) {
    totalAssetValue = inventoryData.reduce((sum, item) => {
      return sum + (item.purchase_price || 0);
    }, 0);
  }

  // カテゴリ別統計
  const categoryStats = new Map<string, { count: number; amount: number }>();
  if (inventoryData) {
    inventoryData.forEach((item) => {
      const category = item.category || 'その他';
      const existing = categoryStats.get(category) || { count: 0, amount: 0 };
      categoryStats.set(category, {
        count: existing.count + 1,
        amount: existing.amount + (item.purchase_price || 0),
      });
    });
  }

  const categoryData = Array.from(categoryStats.entries())
    .map(([name, stats]) => ({
      name,
      value: stats.count,
      amount: stats.amount,
    }))
    .sort((a, b) => b.value - a.value);

  // 売上データ取得（管理者のみ・過去12ヶ月）
  let monthlySalesData: { month: string; sales: number; profit: number }[] = [];
  let totalSales = 0;
  let totalProfit = 0;

  if (profile?.role === 'admin') {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: salesData } = await supabase
      .from('sales')
      .select('sale_date, sale_price, profit')
      .gte('sale_date', oneYearAgo.toISOString().split('T')[0])
      .order('sale_date', { ascending: true });

    if (salesData && salesData.length > 0) {
      const monthlyStats = new Map<string, { sales: number; profit: number }>();

      salesData.forEach((sale) => {
        const date = new Date(sale.sale_date);
        const monthKey = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthlyStats.get(monthKey) || { sales: 0, profit: 0 };
        monthlyStats.set(monthKey, {
          sales: existing.sales + (sale.sale_price || 0),
          profit: existing.profit + (sale.profit || 0),
        });
      });

      monthlySalesData = Array.from(monthlyStats.entries())
        .map(([month, stats]) => ({
          month,
          sales: stats.sales,
          profit: stats.profit,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }

    // 売上合計
    const { data: allSales } = await supabase
      .from('sales')
      .select('sale_price, profit');

    if (allSales) {
      totalSales = allSales.reduce((sum, sale) => sum + (sale.sale_price || 0), 0);
      totalProfit = allSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    }
  }

  // 処分候補数（本体もの2年以上 + 消耗品半年以上）
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { count: disposalCandidatesCount } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'sold')
    .or(
      `and(purchase_date.lte.${twoYearsAgo.toISOString().split('T')[0]},category.not.ilike.%弦%,category.not.ilike.%ピック%),and(purchase_date.lte.${sixMonthsAgo.toISOString().split('T')[0]},category.ilike.%弦%)`
    );

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar profile={profile} />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* ヘッダー */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {isAdmin ? '📊 ダッシュボード' : `こんにちは、${profile?.full_name || 'スタッフ'}さん 👋`}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {isAdmin
                ? '店舗全体の在庫状況と売上を確認'
                : '今日も在庫チェックお疲れ様です！'}
            </p>
          </div>

          {/* 管理者用ダッシュボード */}
          {isAdmin && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* 総資産額 */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-4xl">💰</span>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            総資産額
                          </dt>
                          <dd className="text-2xl font-semibold text-gray-900">
                            ¥{totalAssetValue.toLocaleString()}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 在庫点数 */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-4xl">📦</span>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            在庫点数
                          </dt>
                          <dd className="text-2xl font-semibold text-gray-900">
                            {totalItems || 0}点
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 総売上 */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-4xl">💵</span>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            総売上
                          </dt>
                          <dd className="text-2xl font-semibold text-gray-900">
                            ¥{totalSales.toLocaleString()}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 総利益 */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-4xl">📈</span>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            総利益
                          </dt>
                          <dd className={`text-2xl font-semibold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {totalProfit >= 0 ? '+' : ''}¥{totalProfit.toLocaleString()}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* グラフ */}
              {categoryData.length > 0 && (
                <DashboardCharts
                  categoryData={categoryData}
                  monthlySalesData={monthlySalesData}
                />
              )}
            </>
          )}

          {/* スタッフ用ダッシュボード */}
          {!isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* 在庫点数 */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-4xl">📦</span>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          現在の在庫点数
                        </dt>
                        <dd className="text-3xl font-semibold text-gray-900">
                          {totalItems || 0}点
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* チーム貢献度 */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-4xl">🤝</span>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          あなたの登録数
                        </dt>
                        <dd className="text-3xl font-semibold text-green-600">
                          0件
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* クイックアクション */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              クイックアクション
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/inventory/bulk-register"
                className="block p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
              >
                <div className="text-center">
                  <span className="text-4xl mb-2 block">📷</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    一括登録
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    請求書をAI読取
                  </p>
                </div>
              </Link>

              <Link
                href="/inventory/add"
                className="block p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
              >
                <div className="text-center">
                  <span className="text-4xl mb-2 block">✍️</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    手動入力
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    単品登録
                  </p>
                </div>
              </Link>

              <Link
                href="/inventory"
                className="block p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
              >
                <div className="text-center">
                  <span className="text-4xl mb-2 block">📋</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    商品一覧
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    検索・編集
                  </p>
                </div>
              </Link>

              <Link
                href="/inventory/csv-import"
                className="block p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all"
              >
                <div className="text-center">
                  <span className="text-4xl mb-2 block">📄</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    CSV一括登録
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    CSVファイル
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* 管理者専用機能 */}
          {isAdmin && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                管理者機能
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/disposal-candidates"
                  className="block p-6 bg-white rounded-lg border-2 border-red-200 hover:border-red-500 hover:shadow-lg transition-all"
                >
                  <div className="text-center">
                    <span className="text-4xl mb-2 block">💡</span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      処分候補
                    </h3>
                    <p className="text-sm text-red-600 mt-1">
                      {disposalCandidatesCount || 0}件の候補
                    </p>
                  </div>
                </Link>

                <Link
                  href="/invoices"
                  className="block p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
                >
                  <div className="text-center">
                    <span className="text-4xl mb-2 block">📄</span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      請求書管理
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      PDF一覧・再確認
                    </p>
                  </div>
                </Link>

                <Link
                  href="/sales"
                  className="block p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
                >
                  <div className="text-center">
                    <span className="text-4xl mb-2 block">💰</span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      売上管理
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      売上一覧・分析
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
