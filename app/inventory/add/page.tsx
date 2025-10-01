'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

export default function AddInventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');

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
    condition: '',
    condition_notes: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile) return null;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '画像のアップロードに失敗しました');
      }

      const result = await response.json();
      setImageUrl(result.url);
      return result.url;
    } catch (err) {
      console.error('Image upload error:', err);
      throw err;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしてください');

      // 画像をアップロード（ファイルが選択されている場合）
      let uploadedImageUrl = imageUrl;
      if (imageFile && !uploadedImageUrl) {
        uploadedImageUrl = await handleImageUpload();
      }

      const { error: insertError } = await supabase.from('inventory').insert([{
        category: formData.category,
        product_name: formData.product_name,
        manufacturer: formData.manufacturer || null,
        model_number: formData.model_number || null,
        color: formData.color || null,
        serial_number: formData.serial_number || null,
        retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        purchase_discount_rate: formData.purchase_discount_rate
          ? parseFloat(formData.purchase_discount_rate)
          : null,
        purchase_date: formData.purchase_date || null,
        supplier_name: formData.supplier_name || null,
        status: formData.status,
        condition: formData.condition || null,
        condition_notes: formData.condition_notes || null,
        image_url: uploadedImageUrl || null,
        created_by: user.id,
      }]);

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => router.push('/inventory'), 2000);
    } catch (err) {
      setError(err.message || '商品の登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">登録完了！</h2>
          <p className="text-gray-600">商品を登録しました</p>
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
            className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium mb-4"
          >
            ← 戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">✍️ 手動入力</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 商品写真 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商品写真（任意）
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {imagePreview ? (
                <div className="space-y-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview('');
                      setImageFile(null);
                      setImageUrl('');
                    }}
                    className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    削除
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center">
                  <div className="text-4xl mb-2">📷</div>
                  <span className="text-sm text-gray-600 mb-2">
                    写真を追加（タップまたはクリック）
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                  <span className="text-xs text-gray-500">
                    JPEG、PNG、WebP（最大5MB）
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* 種類 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              種類 <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              required
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              <option value="エレキギター">エレキギター</option>
              <option value="アコースティックギター">アコースティックギター</option>
              <option value="ベース">ベース</option>
              <option value="アンプ">アンプ</option>
              <option value="エフェクター">エフェクター</option>
              <option value="弦">弦</option>
              <option value="ピック">ピック</option>
              <option value="ケーブル">ケーブル</option>
              <option value="その他">その他</option>
            </select>
          </div>

          {/* 商品名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商品名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="product_name"
              required
              value={formData.product_name}
              onChange={handleChange}
              placeholder="例: ST-62"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* メーカー・型番 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メーカー
              </label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder="例: フェンダー"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                型番
              </label>
              <input
                type="text"
                name="model_number"
                value={formData.model_number}
                onChange={handleChange}
                placeholder="例: ST62-VS"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 色・シリアルナンバー */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                色
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="例: ヴィンテージサンバースト"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                シリアルナンバー
              </label>
              <input
                type="text"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                placeholder="例: US12345678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 販売価格・仕入値段 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                販売価格
              </label>
              <input
                type="number"
                name="retail_price"
                value={formData.retail_price}
                onChange={handleChange}
                placeholder="100000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                仕入値段
              </label>
              <input
                type="number"
                name="purchase_price"
                value={formData.purchase_price}
                onChange={handleChange}
                placeholder="80000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 仕入日・仕入先 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                仕入日
              </label>
              <input
                type="date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                仕入先
              </label>
              <input
                type="text"
                name="supplier_name"
                value={formData.supplier_name}
                onChange={handleChange}
                placeholder="例: ヤマハ"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* ステータス・状態 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="available">販売中</option>
                <option value="reserved">取り置き</option>
                <option value="in_repair">修理中</option>
                <option value="on_display">展示中</option>
                <option value="sold">売却済み</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状態
              </label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">選択してください</option>
                <option value="new">新品</option>
                <option value="used">中古</option>
                <option value="display">展示品</option>
              </select>
            </div>
          </div>

          {/* 状態備考 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              状態備考
            </label>
            <textarea
              name="condition_notes"
              value={formData.condition_notes}
              onChange={handleChange}
              placeholder="例: 軽微な傷あり、動作確認済み"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 登録ボタン */}
          <button
            type="submit"
            disabled={loading || uploadingImage}
            className="w-full py-4 px-4 rounded-lg text-white text-base font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登録中...' : uploadingImage ? '画像アップロード中...' : '登録する'}
          </button>
        </form>
      </div>
    </div>
  );
}
