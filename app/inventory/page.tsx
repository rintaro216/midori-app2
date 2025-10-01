'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

export default function InventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, categoryFilter]);

  const loadInventory = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }
    setFilteredItems(filtered);
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedItem || !confirm('本当に削除しますか？')) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;
      alert('削除しました');
      setShowModal(false);
      loadInventory();
    } catch (err) {
      alert('削除に失敗しました: ' + err.message);
    }
  };

  const exportCSV = () => {
    const headers = [
      '種類',
      '商品名',
      'メーカー',
      '販売価格',
      '仕入価格',
      '仕入先',
      '仕入日',
      '状態',
      'ステータス',
    ];
    const rows = filteredItems.map((item) => [
      item.category || '',
      item.product_name || '',
      item.manufacturer || '',
      item.retail_price || 0,
      item.purchase_price || 0,
      item.supplier_name || '',
      item.purchase_date || '',
      item.condition || '',
      item.status || '',
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
    link.download =
      '在庫一覧_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
  };

  const categories = [
    ...new Set(items.map((i) => i.category).filter(Boolean)),
  ];

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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                📋 商品一覧
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                全 {items.length} 件 | 表示 {filteredItems.length} 件
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={exportCSV}
                className="px-4 py-3 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-base font-medium min-h-[44px]"
              >
                📥 CSV出力
              </button>
              <button
                onClick={() => router.push('/inventory/add')}
                className="px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-base font-medium min-h-[44px]"
              >
                ＋ 新規登録
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                検索
              </label>
              <input
                type="text"
                placeholder="🔍 商品名・メーカーで検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリ
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              >
                <option value="">すべて</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Mode Toggle (Desktop only) */}
          <div className="mt-4 hidden md:flex gap-2">
            <button
              onClick={() => setViewMode('card')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'card'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              カード表示
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              テーブル表示
            </button>
          </div>
        </div>

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 text-base">商品が見つかりません</p>
          </div>
        ) : (
          <>
            {/* Card View (Mobile + Desktop) */}
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${
                viewMode === 'table' ? 'hidden md:hidden' : ''
              }`}
            >
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4 min-h-[120px]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-base mb-1">
                        {item.product_name}
                      </h3>
                      <p className="text-sm text-gray-600">{item.category}</p>
                    </div>
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-16 h-16 object-cover rounded ml-2"
                      />
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="text-gray-600">
                      メーカー: {item.manufacturer || '-'}
                    </div>
                    <div className="font-medium text-gray-900">
                      {item.retail_price
                        ? `¥${item.retail_price.toLocaleString()}`
                        : '価格未設定'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Table View (Desktop only) */}
            <div
              className={`bg-white rounded-lg shadow overflow-hidden ${
                viewMode === 'card' ? 'hidden' : 'hidden md:block'
              }`}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        種類
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        商品名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        メーカー
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        販売価格
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => handleRowClick(item)}
                        className="hover:bg-blue-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.manufacturer || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.retail_price
                            ? `¥${item.retail_price.toLocaleString()}`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showModal && selectedItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                {selectedItem.product_name}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {selectedItem.image_url && (
              <div className="mb-4">
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.product_name}
                  className="max-h-64 mx-auto rounded"
                />
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-base">
                <div>
                  <span className="font-semibold text-gray-700">種類:</span>{' '}
                  <span className="text-gray-900">{selectedItem.category}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    メーカー:
                  </span>{' '}
                  <span className="text-gray-900">
                    {selectedItem.manufacturer || '-'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    販売価格:
                  </span>{' '}
                  <span className="text-gray-900">
                    {selectedItem.retail_price
                      ? `¥${selectedItem.retail_price.toLocaleString()}`
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    仕入価格:
                  </span>{' '}
                  <span className="text-gray-900">
                    {selectedItem.purchase_price
                      ? `¥${selectedItem.purchase_price.toLocaleString()}`
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">仕入先:</span>{' '}
                  <span className="text-gray-900">
                    {selectedItem.supplier_name || '-'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">仕入日:</span>{' '}
                  <span className="text-gray-900">
                    {selectedItem.purchase_date || '-'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">状態:</span>{' '}
                  <span className="text-gray-900">
                    {selectedItem.condition || '-'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    ステータス:
                  </span>{' '}
                  <span className="text-gray-900">
                    {selectedItem.status || '-'}
                  </span>
                </div>
              </div>

              {selectedItem.condition_notes && (
                <div>
                  <span className="font-semibold text-gray-700">備考:</span>
                  <p className="mt-1 text-gray-900 text-base">
                    {selectedItem.condition_notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-3 pt-4 border-t">
              <button
                onClick={() =>
                  router.push('/inventory/edit/' + selectedItem.id)
                }
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-base font-medium min-h-[44px]"
              >
                編集
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-base font-medium min-h-[44px]"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
