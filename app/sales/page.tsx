'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

export default function SalesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [totalSales, setTotalSales] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [sales, searchTerm, dateFrom, dateTo]);

  const loadSales = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error('Error loading sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterSales = () => {
    let filtered = sales;

    if (searchTerm) {
      filtered = filtered.filter(
        (sale) =>
          sale.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFrom) {
      filtered = filtered.filter((sale) => sale.sale_date >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter((sale) => sale.sale_date <= dateTo);
    }

    setFilteredSales(filtered);

    // 合計計算
    const totalSalesAmount = filtered.reduce((sum, sale) => sum + (sale.sale_price || 0), 0);
    const totalProfitAmount = filtered.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    setTotalSales(totalSalesAmount);
    setTotalProfit(totalProfitAmount);
  };

  const exportCSV = () => {
    const headers = [
      '売却日',
      '商品名',
      'カテゴリ',
      'メーカー',
      '仕入価格',
      '売却価格',
      '利益',
      'お客様名',
      '備考',
    ];
    const rows = filteredSales.map((sale) => [
      sale.sale_date || '',
      sale.product_name || '',
      sale.category || '',
      sale.manufacturer || '',
      sale.purchase_price || 0,
      sale.sale_price || 0,
      sale.profit || 0,
      sale.customer_name || '',
      sale.notes || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => '"' + String(cell).replace(/"/g, '""') + '"')
          .join(',')
      )
      .join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '売上一覧_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 mb-4 text-base min-h-[44px] flex items-center"
          >
            ← 戻る
          </button>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">💰 売上管理</h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                全 {sales.length} 件 | 表示 {filteredSales.length} 件
              </p>
            </div>
            <button
              onClick={exportCSV}
              className="px-4 py-3 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-base font-medium min-h-[44px]"
            >
              📥 CSV出力
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-4xl">💵</span>
              </div>
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500">
                  総売上
                </dt>
                <dd className="text-2xl md:text-3xl font-semibold text-gray-900">
                  ¥{totalSales.toLocaleString()}
                </dd>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-4xl">📈</span>
              </div>
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500">
                  総利益
                </dt>
                <dd className={`text-2xl md:text-3xl font-semibold ${
                  totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {totalProfit >= 0 ? '+' : ''}¥{totalProfit.toLocaleString()}
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                検索
              </label>
              <input
                type="text"
                placeholder="🔍 商品名・お客様名"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                売却日（開始）
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                売却日（終了）
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>
          </div>
        </div>

        {/* Sales List */}
        {filteredSales.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">💰</div>
            <p className="text-gray-600 text-base mb-4">
              {searchTerm || dateFrom || dateTo
                ? '該当する売上が見つかりませんでした'
                : '売上記録がまだありません'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Mobile: Card View */}
            <div className="md:hidden space-y-4 p-4">
              {filteredSales.map((sale) => (
                <div key={sale.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-base">
                        {sale.product_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(sale.sale_date).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ¥{sale.sale_price?.toLocaleString()}
                      </p>
                      <p className={`text-sm font-medium ${
                        (sale.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(sale.profit || 0) >= 0 ? '+' : ''}¥{(sale.profit || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {sale.customer_name && (
                    <p className="text-sm text-gray-600">
                      お客様: {sale.customer_name}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      売却日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      商品名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      カテゴリ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      売却価格
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      利益
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      お客様
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(sale.sale_date).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sale.product_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.category || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ¥{sale.sale_price?.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        (sale.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(sale.profit || 0) >= 0 ? '+' : ''}¥{(sale.profit || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.customer_name || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
