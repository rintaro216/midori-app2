'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter, useParams } from 'next/navigation';

export default function EditInventoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    product_name: '',
    manufacturer: '',
    model_number: '',
    color: '',
    serial_number: '',
    retail_price: '',
    purchase_price: '',
    purchase_discount_rate: '',
    purchase_date: '',
    supplier_name: '',
    status: 'available',
    item_condition: '',
    notes: ''
  });

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('inventory').select('*').eq('id', id).single();
      if (error) throw error;
      setFormData({
        category: data.category || '',
        product_name: data.product_name || '',
        manufacturer: data.manufacturer || '',
        model_number: data.model_number || '',
        color: data.color || '',
        serial_number: data.serial_number || '',
        retail_price: data.retail_price || '',
        purchase_price: data.purchase_price || '',
        purchase_discount_rate: data.purchase_discount_rate || '',
        purchase_date: data.purchase_date || '',
        supplier_name: data.supplier_name || '',
        status: data.status || 'available',
        item_condition: data.item_condition || '',
        notes: data.notes || ''
      });
    } catch (err) {
      setError('商品の読み込みに失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.from('inventory').update({
        category: formData.category,
        product_name: formData.product_name,
        manufacturer: formData.manufacturer || null,
        model_number: formData.model_number || null,
        color: formData.color || null,
        serial_number: formData.serial_number || null,
        retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        purchase_discount_rate: formData.purchase_discount_rate ? parseFloat(formData.purchase_discount_rate) : null,
        purchase_date: formData.purchase_date || null,
        supplier_name: formData.supplier_name || null,
        status: formData.status,
        item_condition: formData.item_condition || null,
        notes: formData.notes || null
      }).eq('id', id);
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => router.push('/inventory'), 2000);
    } catch (err) {
      setError(err.message || '商品の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>読み込み中...</p></div>);
  if (success) return (<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"><div className="text-6xl mb-4">✅</div><h2 className="text-2xl font-bold text-gray-900 mb-2">更新完了！</h2><p className="text-gray-600">商品を更新しました</p></div></div>);

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium mb-4">← 戻る</button>
          <h1 className="text-3xl font-bold text-gray-900">✏️ 商品編集</h1>
        </div>
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-800">{error}</p></div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">種類 <span className="text-red-500">*</span></label>
            <select name="category" required value={formData.category} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
              <option value="">選択してください</option>
              <option value="エレキギター">エレキギター</option>
              <option value="ベース">ベース</option>
              <option value="アンプ">アンプ</option>
              <option value="アコギ">アコギ</option>
              <option value="エフェクター">エフェクター</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">商品名 <span className="text-red-500">*</span></label>
            <input type="text" name="product_name" required value={formData.product_name} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">メーカー</label>
            <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">販売価格</label>
              <input type="number" name="retail_price" value={formData.retail_price} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">仕入価格</label>
              <input type="number" name="purchase_price" value={formData.purchase_price} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">仕入先</label>
              <input type="text" name="supplier_name" value={formData.supplier_name} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">仕入日</label>
              <input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
              <option value="available">在庫あり</option>
              <option value="sold">売却済み</option>
              <option value="reserved">予約中</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">状態</label>
            <input type="text" name="item_condition" value={formData.item_condition} placeholder="例: 新品、中古美品" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">備考</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg"></textarea>
          </div>

          <button type="submit" disabled={saving} className="w-full py-4 px-4 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
            {saving ? '更新中...' : '更新する'}
          </button>
        </form>
      </div>
    </div>
  );
}