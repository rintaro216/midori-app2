'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

export default function DisposalCandidatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .neq('status', 'sold')
        .order('purchase_date', { ascending: true });

      if (error) throw error;

      const now = new Date();
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

      const candidates = data.filter(item => {
        if (!item.purchase_date) return false;
        const purchaseDate = new Date(item.purchase_date);

        const isConsumable = item.category?.includes('弦') || item.category?.includes('ピック');

        if (isConsumable) {
          return purchaseDate < sixMonthsAgo;
        } else {
          return purchaseDate < twoYearsAgo;
        }
      });

      setItems(candidates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysOld = (purchaseDate) => {
    if (!purchaseDate) return 0;
    const now = new Date();
    const purchase = new Date(purchaseDate);
    const diffTime = Math.abs(now - purchase);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRecommendation = (item) => {
    const daysOld = getDaysOld(item.purchase_date);
    const isConsumable = item.category?.includes('弦') || item.category?.includes('ピック');

    if (isConsumable && daysOld > 365) return { level: 'danger', text: '即処分推奨' };
    if (isConsumable && daysOld > 180) return { level: 'warning', text: '処分検討' };
    if (!isConsumable && daysOld > 1095) return { level: 'danger', text: '即処分推奨' };
    if (!isConsumable && daysOld > 730) return { level: 'warning', text: '処分検討' };
    return { level: 'info', text: '様子見' };
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
          <h1 className="text-3xl font-bold">💡 AI処分候補</h1>
          <p className="text-sm text-gray-600 mt-2">
            本体もの：2年以上 | 消耗品：半年以上
          </p>
          <p className="text-lg font-semibold mt-4">
            該当商品: <span className="text-red-600">{items.length}件</span>
          </p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <span className="text-6xl mb-4 block">✅</span>
            <h2 className="text-xl font-semibold mb-2">処分候補はありません</h2>
            <p className="text-gray-600">在庫は適切に管理されています</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">商品名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">種類</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">仕入日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">経過日数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">仕入価格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">推奨</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => {
                  const rec = getRecommendation(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium">{item.product_name}</td>
                      <td className="px-6 py-4 text-sm">{item.category}</td>
                      <td className="px-6 py-4 text-sm">{item.purchase_date}</td>
                      <td className="px-6 py-4 text-sm">{getDaysOld(item.purchase_date)}日</td>
                      <td className="px-6 py-4 text-sm">
                        {item.purchase_price ? '¥' + item.purchase_price.toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          rec.level === 'danger' ? 'bg-red-100 text-red-800' :
                          rec.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}