'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import AIProductConfirmationTable from '@/components/AIProductConfirmationTable';

export default function BulkRegisterPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [extractedItems, setExtractedItems] = useState<any[]>([]);
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

      // 高解像度化: scale を 3.0 に増加 (OCR精度向上のため)
      const viewport = page.getViewport({ scale: 3.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(new File([blob], 'converted.png', { type: 'image/png' }));
        }, 'image/png'); // PNG形式で無劣化変換 (OCR精度向上)
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
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {extractedItems.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">商品が検出されませんでした</p>
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    戻る
                  </button>
                </div>
              </div>
            ) : (
              <AIProductConfirmationTable
                products={extractedItems}
                onProductsChange={setExtractedItems}
                onRegister={handleSaveAll}
                onCancel={() => setStep(1)}
                isRegistering={loading}
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
}
