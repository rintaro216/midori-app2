'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

export default function BulkRegisterPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [extractedItems, setExtractedItems] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [invoiceUrl, setInvoiceUrl] = useState('');

  const convertPdfToImage = async (pdfFile) => {
    try {
      // Load PDF.js from CDN
      if (!window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });

        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(new File([blob], 'converted.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.85); // JPEG with 85% quality for smaller file size
      });
    } catch (error) {
      console.error('PDF conversion error:', error);
      throw new Error('PDFの変換に失敗しました');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview('');
      setError('');

      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(selectedFile);
      } else if (selectedFile.type === 'application/pdf') {
        setPreview('pdf');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('ファイルを選択してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // 1. 元のファイルをStorageに保存
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}-${randomString}.${fileExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoice-pdfs')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('invoice-pdfs')
        .getPublicUrl(fileName);

      setInvoiceUrl(publicUrl);

      // 2. AI解析用にファイルを準備
      let fileToUpload = file;

      // PDFの場合は画像に変換
      if (file.type === 'application/pdf') {
        fileToUpload = await convertPdfToImage(file);
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await fetch('/api/extract-invoice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI解析に失敗しました');
      }

      const result = await response.json();
      setExtractedItems(result.items || []);
      setStep(2);
    } catch (err) {
      setError(err.message || 'ファイルの処理に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditForm({ ...extractedItems[index] });
  };

  const handleSaveEdit = () => {
    const newItems = [...extractedItems];
    newItems[editingIndex] = editForm;
    setExtractedItems(newItems);
    setEditingIndex(null);
    setEditForm({});
  };

  const handleDeleteItem = (index) => {
    if (confirm('この商品を削除しますか？')) {
      const newItems = extractedItems.filter((_, i) => i !== index);
      setExtractedItems(newItems);
    }
  };

  const handleAddNewItem = () => {
    const newItem = {
      category: '',
      product_name: '',
      manufacturer: '',
      model_number: '',
      color: '',
      retail_price: null,
      purchase_price: null,
      purchase_date: new Date().toISOString().split('T')[0],
      supplier_name: '',
    };
    setExtractedItems([...extractedItems, newItem]);
    setEditingIndex(extractedItems.length);
    setEditForm(newItem);
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしてください');

      // 1. 請求書情報を保存
      if (invoiceUrl) {
        const totalAmount = extractedItems.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
        const supplierName = extractedItems[0]?.supplier_name || '';
        const purchaseDate = extractedItems[0]?.purchase_date || null;

        const { error: invoiceError } = await supabase.from('invoices').insert([{
          supplier_name: supplierName,
          invoice_date: purchaseDate,
          total_amount: totalAmount,
          pdf_url: invoiceUrl,
          pdf_filename: file.name,
          status: 'processed',
          created_by: user.id,
        }]);

        if (invoiceError) console.error('Invoice save error:', invoiceError);
      }

      // 2. 商品を登録
      const itemsToInsert = extractedItems.map(item => ({
        category: item.category || '',
        product_name: item.product_name || '',
        manufacturer: item.manufacturer || null,
        model_number: item.model_number || null,
        color: item.color || null,
        serial_number: item.serial_number || null,
        retail_price: item.retail_price || null,
        purchase_price: item.purchase_price || null,
        purchase_date: item.purchase_date || null,
        supplier_name: item.supplier_name || null,
        status: 'available',
        created_by: user.id,
      }));

      const { error } = await supabase.from('inventory').insert(itemsToInsert);
      if (error) throw error;

      alert(`${extractedItems.length}件の商品を登録しました！`);
      router.push('/inventory');
    } catch (err) {
      setError(err.message || '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getItemStatus = (item) => {
    const missingFields = [];
    if (!item.product_name) missingFields.push('商品名');
    if (!item.category) missingFields.push('カテゴリ');
    if (!item.purchase_price && !item.retail_price) missingFields.push('価格');

    if (missingFields.length === 0) return { type: 'success', label: '✅ 読取成功', missing: [] };
    if (missingFields.length <= 2) return { type: 'warning', label: '⚠️ 要確認', missing: missingFields };
    return { type: 'error', label: '❌ 読取失敗', missing: missingFields };
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-700 mb-4">
            ← 戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">📷 一括登録（AI読取）</h1>
          <p className="mt-2 text-sm text-gray-600">請求書をアップロードして自動読取</p>
        </div>

        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">ステップ1: ファイルアップロード</h2>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {preview === 'pdf' ? (
                <div className="mb-4">
                  <div className="text-6xl mb-2">📄</div>
                  <p className="text-sm text-gray-600">PDF選択中</p>
                </div>
              ) : preview ? (
                <div className="mb-4">
                  <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded" />
                </div>
              ) : (
                <div className="text-6xl mb-4">📄</div>
              )}

              <label className="cursor-pointer inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                📁 ファイルを選択
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>

              {file && (
                <p className="mt-4 text-sm text-gray-600">
                  選択中: {file.name}
                </p>
              )}

              <p className="mt-2 text-xs text-gray-500">
                画像ファイル（JPEG、PNG、WebP）またはPDFに対応しています
              </p>
              <p className="mt-1 text-xs text-gray-500">
                スマホカメラでも撮影可能 | PDFは自動で画像に変換されます
              </p>
            </div>

            <div className="mt-6">
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium"
              >
                {loading ? '🤖 AI解析中...' : '次へ（AI解析）'}
              </button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-medium mb-2">💡 使い方</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• スマホの場合：カメラボタンで直接撮影できます</li>
                <li>• PCの場合：請求書のPDFや画像をアップロード</li>
                <li>• AI解析は約20秒程度かかります</li>
                <li>• 次の画面で内容を確認・修正できます</li>
              </ul>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">ステップ2: 確認・編集</h2>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {extractedItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">商品が検出されませんでした</p>
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    戻る
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-sm text-blue-900">
                        <span className="font-semibold">検出された商品: {extractedItems.length}件</span>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="text-green-700">✅ {extractedItems.filter(item => getItemStatus(item).type === 'success').length}件</span>
                        <span className="text-yellow-700">⚠️ {extractedItems.filter(item => getItemStatus(item).type === 'warning').length}件</span>
                        <span className="text-red-700">❌ {extractedItems.filter(item => getItemStatus(item).type === 'error').length}件</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <button
                      onClick={handleAddNewItem}
                      className="w-full py-3 px-4 border-2 border-dashed border-blue-400 text-blue-600 rounded-lg hover:bg-blue-50 text-base font-medium flex items-center justify-center gap-2"
                    >
                      ➕ 商品を手動で追加
                    </button>
                  </div>

                  <div className="space-y-3 mb-6 max-h-[500px] overflow-y-auto">
                    {extractedItems.map((item, index) => {
                      const status = getItemStatus(item);
                      return (
                        <div key={index} className={`border rounded-lg p-4 ${
                          status.type === 'success' ? 'border-green-200 bg-green-50' :
                          status.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                          'border-red-200 bg-red-50'
                        }`}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900">商品 {index + 1}</h3>
                              <span className={`text-xs px-2 py-1 rounded ${
                                status.type === 'success' ? 'bg-green-100 text-green-800' :
                                status.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(index)}
                                className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => handleDeleteItem(index)}
                                className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                削除
                              </button>
                            </div>
                          </div>

                          {status.missing.length > 0 && (
                            <div className="mb-2 text-xs text-gray-600">
                              未入力: {status.missing.join(', ')}
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="truncate">
                              <span className="text-gray-600">商品名:</span> {item.product_name || <span className="text-red-600">未入力</span>}
                            </div>
                            <div className="truncate">
                              <span className="text-gray-600">カテゴリ:</span> {item.category || <span className="text-red-600">未入力</span>}
                            </div>
                            <div className="truncate">
                              <span className="text-gray-600">メーカー:</span> {item.manufacturer || <span className="text-gray-400">-</span>}
                            </div>
                            <div className="truncate">
                              <span className="text-gray-600">型番:</span> {item.model_number || <span className="text-gray-400">-</span>}
                            </div>
                            <div className="truncate">
                              <span className="text-gray-600">仕入価格:</span> {item.purchase_price ? `¥${item.purchase_price.toLocaleString()}` : <span className="text-gray-400">-</span>}
                            </div>
                            <div className="truncate">
                              <span className="text-gray-600">販売価格:</span> {item.retail_price ? `¥${item.retail_price.toLocaleString()}` : <span className="text-gray-400">-</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                    >
                      戻る
                    </button>
                    <button
                      onClick={handleSaveAll}
                      disabled={loading || extractedItems.length === 0}
                      className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                      {loading ? '保存中...' : `${extractedItems.length}件を保存`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {editingIndex !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setEditingIndex(null)}>
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold mb-4">商品 {editingIndex + 1} を編集</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">商品名 *</label>
                  <input
                    type="text"
                    value={editForm.product_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例: ST-62"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ *</label>
                  <select
                    value={editForm.category || ''}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メーカー</label>
                    <input
                      type="text"
                      value={editForm.manufacturer || ''}
                      onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例: フェンダー"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">型番</label>
                    <input
                      type="text"
                      value={editForm.model_number || ''}
                      onChange={(e) => setEditForm({ ...editForm, model_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例: ST62-VS"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">色</label>
                  <input
                    type="text"
                    value={editForm.color || ''}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例: サンバースト"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">仕入価格</label>
                    <input
                      type="number"
                      value={editForm.purchase_price || ''}
                      onChange={(e) => setEditForm({ ...editForm, purchase_price: parseFloat(e.target.value) || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="80000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">販売価格</label>
                    <input
                      type="number"
                      value={editForm.retail_price || ''}
                      onChange={(e) => setEditForm({ ...editForm, retail_price: parseFloat(e.target.value) || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="100000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">仕入日</label>
                    <input
                      type="date"
                      value={editForm.purchase_date || ''}
                      onChange={(e) => setEditForm({ ...editForm, purchase_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">仕入先</label>
                    <input
                      type="text"
                      value={editForm.supplier_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例: ヤマハ"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => setEditingIndex(null)}
                  className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
