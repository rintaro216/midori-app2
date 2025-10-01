'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalPurchaseValue: 0,
    totalRetailValue: 0,
    byCategory: {}
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .neq('status', 'sold')
        .order('category');

      if (error) throw error;

      const totalItems = data.length;
      const totalPurchaseValue = data.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
      const totalRetailValue = data.reduce((sum, item) => sum + (item.retail_price || 0), 0);

      const byCategory = {};
      data.forEach(item => {
        const cat = item.category || '未分類';
        if (!byCategory[cat]) {
          byCategory[cat] = { count: 0, purchaseValue: 0, retailValue: 0 };
        }
        byCategory[cat].count++;
        byCategory[cat].purchaseValue += item.purchase_price || 0;
        byCategory[cat].retailValue += item.retail_price || 0;
      });

      setStats({ totalItems, totalPurchaseValue, totalRetailValue, byCategory });
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const headers = ['カテゴリ', '商品数', '仕入総額', '販売総額', '粗利益'];
    const rows = Object.entries(stats.byCategory).map(([cat, data]) => [
      cat,
      data.count,
      data.purchaseValue,
      data.retailValue,
      data.retailValue - data.purchaseValue
    ]);

    const summaryRow = [
      '合計',
      stats.totalItems,
      stats.totalPurchaseValue,
      stats.totalRetailValue,
      stats.totalRetailValue - stats.totalPurchaseValue
    ];

    const allRows = [...rows, summaryRow];
    const csvContent = [headers, ...allRows]
      .map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(','))
      .join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `在庫レポート_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportDetailReport = () => {
    const headers = ['種類', '商品名', 'メーカー', '仕入価格', '販売価格', '仕入先', '仕入日', '状態'];
    const rows = items.map(item => [
      item.category || '',
      item.product_name || '',
      item.manufacturer || '',
      item.purchase_price || 0,
      item.retail_price || 0,
      item.supplier_name || '',
      item.purchase_date || '',
      item.status || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(','))
      .join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `在庫詳細_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p>読み込み中...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-blue-600 mb-4">
            ← 戻る
          </button>
          <h1 className="text-3xl font-bold">📈 銀行レポート</h1>
          <p className="text-sm text-gray-600 mt-2">決算用の在庫レポートを出力</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm text-gray-500 mb-2">総在庫点数</h3>
            <p className="text-3xl font-bold">{stats.totalItems}点</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm text-gray-500 mb-2">仕入総額</h3>
            <p className="text-3xl font-bold text-blue-600">¥{stats.totalPurchaseValue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm text-gray-500 mb-2">販売総額（定価）</h3>
            <p className="text-3xl font-bold text-green-600">¥{stats.totalRetailValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">カテゴリ別集計</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">カテゴリ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">商品数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">仕入総額</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">販売総額</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">粗利益</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(stats.byCategory).map(([cat, data]) => (
                  <tr key={cat}>
                    <td className="px-6 py-4 text-sm font-medium">{cat}</td>
                    <td className="px-6 py-4 text-sm">{data.count}点</td>
                    <td className="px-6 py-4 text-sm">¥{data.purchaseValue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">¥{data.retailValue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-green-600">
                      ¥{(data.retailValue - data.purchaseValue).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td className="px-6 py-4 text-sm">合計</td>
                  <td className="px-6 py-4 text-sm">{stats.totalItems}点</td>
                  <td className="px-6 py-4 text-sm">¥{stats.totalPurchaseValue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">¥{stats.totalRetailValue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-green-600">
                    ¥{(stats.totalRetailValue - stats.totalPurchaseValue).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={exportReport}
            className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            📊 カテゴリ別レポートをダウンロード
          </button>
          <button
            onClick={exportDetailReport}
            className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            📋 詳細レポートをダウンロード
          </button>
        </div>
      </div>
    </div>
  );
}