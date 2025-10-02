'use client'

import { useState } from 'react'

interface AIProduct {
  category?: string
  product_name?: string
  manufacturer?: string
  model_number?: string
  color?: string
  retail_price?: number | null
  purchase_price?: number | null
  quantity?: number
  purchase_date?: string
  supplier_name?: string
  confidence?: {
    category?: number
    product_name?: number
    manufacturer?: number
    model_number?: number
    color?: number
    retail_price?: number
    purchase_price?: number
  }
}

interface AIProductConfirmationTableProps {
  products: AIProduct[]
  onProductsChange: (products: AIProduct[]) => void
  onRegister: () => void
  onCancel: () => void
  isRegistering: boolean
}

export default function AIProductConfirmationTable({
  products,
  onProductsChange,
  onRegister,
  onCancel,
  isRegistering
}: AIProductConfirmationTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingProduct, setEditingProduct] = useState<AIProduct | null>(null)

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditingProduct({ ...products[index] })
  }

  const handleSave = () => {
    if (editingIndex !== null && editingProduct) {
      const updatedProducts = [...products]
      updatedProducts[editingIndex] = editingProduct
      onProductsChange(updatedProducts)
      setEditingIndex(null)
      setEditingProduct(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditingProduct(null)
  }

  const handleDelete = (index: number) => {
    if (confirm('この商品を削除しますか？')) {
      const updatedProducts = products.filter((_, i) => i !== index)
      onProductsChange(updatedProducts)
    }
  }

  const handleFieldChange = (field: keyof AIProduct, value: string | number) => {
    if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        [field]: value
      })
    }
  }

  const getItemStatus = (item: AIProduct) => {
    const missingFields = []
    if (!item.product_name) missingFields.push('商品名')
    if (!item.category) missingFields.push('カテゴリ')
    if (!item.purchase_price && !item.retail_price) missingFields.push('価格')

    if (item.confidence) {
      const confidenceValues = Object.values(item.confidence).filter(v => v !== undefined) as number[]
      const avgConfidence = confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length

      if (missingFields.length === 0 && avgConfidence >= 0.8) {
        return { type: 'success', label: '✅ 読取成功', missing: [], confidence: avgConfidence }
      }
      if (avgConfidence >= 0.5 || missingFields.length <= 2) {
        return { type: 'warning', label: '⚠️ 要確認', missing: missingFields, confidence: avgConfidence }
      }
      return { type: 'error', label: '❌ 読取失敗', missing: missingFields, confidence: avgConfidence }
    }

    if (missingFields.length === 0) return { type: 'success', label: '✅ 読取成功', missing: [] }
    if (missingFields.length <= 2) return { type: 'warning', label: '⚠️ 要確認', missing: missingFields }
    return { type: 'error', label: '❌ 読取失敗', missing: missingFields }
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー情報 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-medium text-blue-900">
              📋 AI解析結果の確認・編集
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              {products.length}件の商品が検出されました
            </p>
            <div className="flex gap-3 text-xs mt-2">
              <span className="text-green-700">
                ✅ {products.filter(p => getItemStatus(p).type === 'success').length}件
              </span>
              <span className="text-yellow-700">
                ⚠️ {products.filter(p => getItemStatus(p).type === 'warning').length}件
              </span>
              <span className="text-red-700">
                ❌ {products.filter(p => getItemStatus(p).type === 'error').length}件
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isRegistering}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              onClick={onRegister}
              disabled={isRegistering || products.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isRegistering ? '登録中...' : `${products.length}件を一括登録`}
            </button>
          </div>
        </div>
      </div>

      {/* スマホ表示: カード形式 */}
      <div className="block md:hidden space-y-4">
        {products.map((product, index) => {
          const status = getItemStatus(product)
          return (
            <div
              key={index}
              className={`border rounded-lg p-4 shadow-sm ${
                status.type === 'success' ? 'border-green-200 bg-green-50' :
                status.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                'border-red-200 bg-red-50'
              }`}
            >
              {editingIndex === index ? (
                // 編集モード
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      カテゴリ
                    </label>
                    <select
                      value={editingProduct?.category || ''}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">選択してください</option>
                      <option value="エレキギター">エレキギター</option>
                      <option value="アコースティックギター">アコースティックギター</option>
                      <option value="ベース">ベース</option>
                      <option value="ドラム">ドラム</option>
                      <option value="キーボード・ピアノ">キーボード・ピアノ</option>
                      <option value="エフェクター">エフェクター</option>
                      <option value="アンプ">アンプ</option>
                      <option value="その他">その他</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      商品名 *
                    </label>
                    <input
                      type="text"
                      value={editingProduct?.product_name || ''}
                      onChange={(e) => handleFieldChange('product_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      メーカー
                    </label>
                    <input
                      type="text"
                      value={editingProduct?.manufacturer || ''}
                      onChange={(e) => handleFieldChange('manufacturer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      型番
                    </label>
                    <input
                      type="text"
                      value={editingProduct?.model_number || ''}
                      onChange={(e) => handleFieldChange('model_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      販売価格
                    </label>
                    <input
                      type="number"
                      value={editingProduct?.retail_price || ''}
                      onChange={(e) => handleFieldChange('retail_price', parseFloat(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      仕入価格
                    </label>
                    <input
                      type="number"
                      value={editingProduct?.purchase_price || ''}
                      onChange={(e) => handleFieldChange('purchase_price', parseFloat(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                // 表示モード
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          status.type === 'success' ? 'bg-green-100 text-green-800' :
                          status.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {status.label}
                        </span>
                        {status.confidence !== undefined && (
                          <span className="text-xs text-gray-600">
                            信頼度: {(status.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <div className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded mb-1">
                        {product.category || '未分類'}
                      </div>
                      <h4 className="font-medium text-gray-900">{product.product_name || '商品名未設定'}</h4>
                      <p className="text-sm text-gray-600">
                        {product.manufacturer || '-'} / {product.model_number || '-'}
                      </p>
                      {product.retail_price && (
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          販売: ¥{Number(product.retail_price).toLocaleString()}
                        </p>
                      )}
                      {product.purchase_price && (
                        <p className="text-sm font-medium text-gray-900">
                          仕入: ¥{Number(product.purchase_price).toLocaleString()}
                        </p>
                      )}
                      {status.missing.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          未入力: {status.missing.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      onClick={() => handleEdit(index)}
                      className="flex-1 px-3 py-1.5 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="flex-1 px-3 py-1.5 text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* PC表示: テーブル形式 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                カテゴリ
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                商品名
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                メーカー/型番
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                販売価格
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                仕入価格
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product, index) => {
              const status = getItemStatus(product)
              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        status.type === 'success' ? 'bg-green-100 text-green-800' :
                        status.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {status.label}
                      </span>
                      {status.confidence !== undefined && (
                        <span className="text-xs text-gray-600">
                          {(status.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      {product.category || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {product.product_name || <span className="text-red-600">未入力</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div>{product.manufacturer || '-'}</div>
                    <div className="text-xs text-gray-500">{product.model_number || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {product.retail_price ? `¥${Number(product.retail_price).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {product.purchase_price ? `¥${Number(product.purchase_price).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right space-x-2">
                    <button
                      onClick={() => handleEdit(index)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 編集モーダル (PC用) */}
      {editingIndex !== null && editingProduct && (
        <div className="hidden md:block fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setEditingIndex(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">商品 {editingIndex + 1} を編集</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ *</label>
                <select
                  value={editingProduct?.category || ''}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  <option value="エレキギター">エレキギター</option>
                  <option value="アコースティックギター">アコースティックギター</option>
                  <option value="ベース">ベース</option>
                  <option value="ドラム">ドラム</option>
                  <option value="キーボード・ピアノ">キーボード・ピアノ</option>
                  <option value="エフェクター">エフェクター</option>
                  <option value="アンプ">アンプ</option>
                  <option value="その他">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">商品名 *</label>
                <input
                  type="text"
                  value={editingProduct?.product_name || ''}
                  onChange={(e) => handleFieldChange('product_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メーカー</label>
                  <input
                    type="text"
                    value={editingProduct?.manufacturer || ''}
                    onChange={(e) => handleFieldChange('manufacturer', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">型番</label>
                  <input
                    type="text"
                    value={editingProduct?.model_number || ''}
                    onChange={(e) => handleFieldChange('model_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">販売価格</label>
                  <input
                    type="number"
                    value={editingProduct?.retail_price || ''}
                    onChange={(e) => handleFieldChange('retail_price', parseFloat(e.target.value) || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">仕入価格</label>
                  <input
                    type="number"
                    value={editingProduct?.purchase_price || ''}
                    onChange={(e) => handleFieldChange('purchase_price', parseFloat(e.target.value) || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={handleCancelEdit}
                className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 空の場合 */}
      {products.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">検出された商品がありません</p>
        </div>
      )}
    </div>
  )
}
