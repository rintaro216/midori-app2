'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AddSalePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inventoryId = searchParams.get('inventory_id');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inventoryItem, setInventoryItem] = useState(null);
  const [formData, setFormData] = useState({
    sale_price: '',
    sale_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    notes: '',
  });

  useEffect(() => {
    if (inventoryId) {
      loadInventoryItem();
    }
  }, [inventoryId]);

  const loadInventoryItem = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('id', inventoryId)
        .single();

      if (error) throw error;
      setInventoryItem(data);

      // 販売価格をデフォルトでセット
      if (data.retail_price) {
        setFormData(prev => ({ ...prev, sale_price: data.retail_price.toString() }));
      }
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('商品情報の読み込みに失敗しました');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしてください');

      const saleData = {
        inventory_id: inventoryId,
        product_name: inventoryItem.product_name,
        category: inventoryItem.category,
        manufacturer: inventoryItem.manufacturer,
        purchase_price: inventoryItem.purchase_price,
        sale_price: parseFloat(formData.sale_price),
        sale_date: formData.sale_date,
        customer_name: formData.customer_name || null,
        notes: formData.notes || null,
        created_by: user.id,
      };

      // 売上を記録
      const { error: saleError } = await supabase.from('sales').insert([saleData]);
      if (saleError) throw saleError;

      // 在庫のステータスを「売却済み」に更新
      if (inventoryId) {
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ status: 'sold' })
          .eq('id', inventoryId);

        if (updateError) throw updateError;
      }

      setSuccess(true);
      setTimeout(() => router.push('/sales'), 2000);
    } catch (err) {
      setError(err.message || '売上の登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const profit = parseFloat(formData.sale_price) - (inventoryItem?.purchase_price || 0);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">売上登録完了！</h2>
          <div className="text-gray-600 mb-4">
            <p>売上価格: ¥{parseFloat(formData.sale_price).toLocaleString()}</p>
            <p className={`text-lg font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              利益: {profit >= 0 ? '+' : ''}¥{profit.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 flex items-center text-base font-medium mb-4 min-h-[44px]"
          >
            ← 戻る
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">💰 売上登録</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 商品情報表示 */}
          {inventoryItem && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-2">販売商品</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">商品名:</span> {inventoryItem.product_name}</p>
                <p><span className="font-medium">カテゴリ:</span> {inventoryItem.category}</p>
                {inventoryItem.manufacturer && (
                  <p><span className="font-medium">メーカー:</span> {inventoryItem.manufacturer}</p>
                )}
                <p><span className="font-medium">仕入価格:</span> ¥{inventoryItem.purchase_price?.toLocaleString() || 0}</p>
                <p><span className="font-medium">定価:</span> ¥{inventoryItem.retail_price?.toLocaleString() || '-'}</p>
              </div>
            </div>
          )}

          {/* 売却価格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              売却価格 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="sale_price"
              required
              value={formData.sale_price}
              onChange={handleChange}
              placeholder="100000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
            {inventoryItem?.purchase_price && formData.sale_price && (
              <p className={`mt-2 text-sm font-medium ${
                parseFloat(formData.sale_price) >= inventoryItem.purchase_price
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                予想利益: {parseFloat(formData.sale_price) >= inventoryItem.purchase_price ? '+' : ''}
                ¥{(parseFloat(formData.sale_price) - inventoryItem.purchase_price).toLocaleString()}
              </p>
            )}
          </div>

          {/* 売却日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              売却日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="sale_date"
              required
              value={formData.sale_date}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          {/* お客様名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              お客様名（任意）
            </label>
            <input
              type="text"
              name="customer_name"
              value={formData.customer_name}
              onChange={handleChange}
              placeholder="例: 山田太郎"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          {/* 備考 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              備考（任意）
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="例: オンライン販売、値引きあり"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          {/* 登録ボタン */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 rounded-lg text-white text-base font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {loading ? '登録中...' : '売上を登録'}
          </button>
        </form>
      </div>
    </div>
  );
}
