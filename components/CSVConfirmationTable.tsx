'use client'

import { useState } from 'react'
import type { CSVProduct } from '@/lib/csvParser'

interface CSVConfirmationTableProps {
  products: CSVProduct[]
  onProductsChange: (products: CSVProduct[]) => void
  onRegister: () => void
  onCancel: () => void
  isRegistering: boolean
}

export default function CSVConfirmationTable({
  products,
  onProductsChange,
  onRegister,
  onCancel,
  isRegistering
}: CSVConfirmationTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingProduct, setEditingProduct] = useState<CSVProduct | null>(null)

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

  const handleCancel = () => {
    setEditingIndex(null)
    setEditingProduct(null)
  }

  const handleDelete = (index: number) => {
    if (confirm('この商品を削除しますか？')) {
      const updatedProducts = products.filter((_, i) => i !== index)
      onProductsChange(updatedProducts)
    }
  }

  const handleFieldChange = (field: keyof CSVProduct, value: string) => {
    if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        [field]: value
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー情報 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-medium text-blue-900">
              📋 登録内容の確認・編集
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              {products.length}件の商品が登録されます
            </p>
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
        {products.map((product, index) => (
          <div key={index} className="bg-white border rounded-lg p-4 shadow-sm">
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
                    <option value="ギター">ギター</option>
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
                    品番
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
                    カラー
                  </label>
                  <input
                    type="text"
                    value={editingProduct?.color || ''}
                    onChange={(e) => handleFieldChange('color', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    販売価格
                  </label>
                  <input
                    type="number"
                    value={editingProduct?.price || ''}
                    onChange={(e) => handleFieldChange('price', e.target.value)}
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
                    onClick={handleCancel}
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
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {product.category}
                      </span>
                      <span className="text-xs text-gray-500">#{index + 1}</span>
                    </div>
                    <h4 className="font-medium text-gray-900">{product.product_name}</h4>
                    <p className="text-sm text-gray-600">
                      {product.manufacturer} / {product.model_number}
                    </p>
                    {product.color && (
                      <p className="text-sm text-gray-600">カラー: {product.color}</p>
                    )}
                    {product.price && (
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        ¥{Number(product.price).toLocaleString()}
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
        ))}
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
                カテゴリ
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                商品名
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                メーカー
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                品番
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                カラー
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                価格
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500">
                  {index + 1}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {product.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {product.product_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {product.manufacturer}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {product.model_number}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {product.color || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {product.price ? `¥${Number(product.price).toLocaleString()}` : '-'}
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
            ))}
          </tbody>
        </table>
      </div>

      {/* 空の場合 */}
      {products.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">登録する商品がありません</p>
        </div>
      )}
    </div>
  )
}
