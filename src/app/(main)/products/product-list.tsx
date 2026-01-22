'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createProduct, updateProduct, deleteProduct } from './actions';
import type { Product, Partner } from '@/types/models';

type Props = {
  initialProducts: Product[];
  masterPartners: Partner[];
};

type SortConfig = {
  key: keyof Product | 'partner_name';
  direction: 'asc' | 'desc';
};

const ALL_COLUMNS = [
  { key: 'product_code', label: '製品コード' },
  { key: 'name', label: '製品名' },
  { key: 'partner_name', label: '取引先' }, // derived
  { key: 'color_text', label: '色・仕様' },
  { key: 'unit_weight', label: '重量(kg)' },
  { key: 'surface_area', label: '表面積' },
  { key: 'material_memo', label: '材質メモ' },
  { key: 'process_memo', label: '加工メモ' },
  { key: 'memo', label: '備考' },
  { key: 'is_discontinued', label: '状態' },
] as const;

export default function ProductList({ initialProducts, masterPartners }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- State ---
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('q')?.toString() || ''
  );

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['product_code', 'name', 'partner_name', 'color_text', 'unit_weight', 'is_discontinued'])
  );

  // Sort
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'product_code', direction: 'asc' });

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});

  // --- Helpers ---
  const toggleColumn = (key: string) => {
    const newSet = new Set(visibleColumns);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setVisibleColumns(newSet);
  };

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery) params.set('q', searchQuery);
    else params.delete('q');
    router.push(`?${params.toString()}`);
  };

  // --- Filtering & Sorting ---
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...initialProducts];

    // Sorting
    result.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Product];
      let bValue: any = b[sortConfig.key as keyof Product];

      // Handle special cases
      if (sortConfig.key === 'partner_name') {
        aValue = a.partners?.name || '';
        bValue = b.partners?.name || '';
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [initialProducts, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: key as any, direction });
  };

  // --- CRUD Operations ---
  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      is_discontinued: false,
      unit_weight: 0,
      surface_area: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({ ...p });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('本当に削除しますか？')) return;
    const res = await deleteProduct(String(id));
    alert(res.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.partner_id) {
      alert('必須項目を入力してください');
      return;
    }

    const fd = new FormData();
    fd.set('partner_id', formData.partner_id);
    fd.set('name', formData.name);
    fd.set('product_code', formData.product_code || '');
    fd.set('color_text', formData.color_text || '');
    fd.set('unit_weight', String(formData.unit_weight || 0));
    fd.set('surface_area', String(formData.surface_area || 0));
    fd.set('memo', formData.memo || '');
    fd.set('material_memo', formData.material_memo || ''); // Type error expected if Product type not updated yet
    fd.set('process_memo', formData.process_memo || '');   // Type error expected
    fd.set('is_discontinued', String(formData.is_discontinued));

    const res = editingProduct
      ? await updateProduct(String(editingProduct.id), fd)
      : await createProduct(fd);

    if (res.success) {
      alert(res.message);
      setIsModalOpen(false);
      // router.refresh() handles list update
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            className="border p-2 rounded text-sm w-full md:w-64"
            placeholder="検索ワード..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            onBlur={handleSearch}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Column Selector */}
          <div className="relative group">
            <button className="bg-white border text-sm px-3 py-2 rounded hover:bg-gray-50">
              表示項目設定 ▼
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border shadow-lg rounded p-2 hidden group-hover:block z-10">
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-2 p-1 cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                  />
                  <span className="text-sm">{col.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold shadow hover:bg-indigo-700"
          >
            ＋ 新規登録
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {ALL_COLUMNS.filter(c => visibleColumns.has(c.key)).map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-bold text-gray-500 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {sortConfig.key === col.key && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 whitespace-nowrap">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSortedProducts.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.size + 1} className="px-6 py-8 text-center text-gray-400">
                  該当する製品がありません
                </td>
              </tr>
            ) : (
              filteredAndSortedProducts.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50 ${p.is_discontinued ? 'bg-gray-100 text-gray-500' : ''}`}>
                  {visibleColumns.has('product_code') && (
                    <td className="px-6 py-4 text-sm font-mono whitespace-nowrap">{p.product_code}</td>
                  )}
                  {visibleColumns.has('name') && (
                    <td className="px-6 py-4 text-sm font-bold whitespace-nowrap">{p.name}</td>
                  )}
                  {visibleColumns.has('partner_name') && (
                    <td className="px-6 py-4 text-sm whitespace-nowrap">{(p.partners as Partner)?.name || '-'}</td>
                  )}
                  {visibleColumns.has('color_text') && (
                    <td className="px-6 py-4 text-sm whitespace-nowrap">{p.color_text}</td>
                  )}
                  {visibleColumns.has('unit_weight') && (
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">{p.unit_weight}</td>
                  )}
                  {visibleColumns.has('surface_area') && (
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">{p.surface_area}</td>
                  )}
                  {visibleColumns.has('material_memo') && (
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{(p as any).material_memo}</td>
                  )}
                  {visibleColumns.has('process_memo') && (
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{(p as any).process_memo}</td>
                  )}
                  {visibleColumns.has('memo') && (
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{p.memo}</td>
                  )}
                  {visibleColumns.has('is_discontinued') && (
                    <td className="px-6 py-4 text-sm text-center whitespace-nowrap">
                      {p.is_discontinued ? (
                        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">廃盤</span>
                      ) : (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">稼働</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                    <button
                      onClick={() => openEditModal(p)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4 font-bold"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="text-right text-xs text-gray-400">
        {filteredAndSortedProducts.length} 件表示
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingProduct ? '製品情報を編集' : '新規製品登録'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">取引先 <span className="text-red-500">*</span></label>
                  <select
                    required
                    className="w-full border rounded p-2"
                    value={formData.partner_id || ''}
                    onChange={e => setFormData({ ...formData, partner_id: e.target.value })}
                  >
                    <option value="">選択してください</option>
                    {masterPartners.map(mp => (
                      <option key={mp.id} value={mp.id}>{mp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">製品コード</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2"
                    value={formData.product_code || ''}
                    onChange={e => setFormData({ ...formData, product_code: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">製品名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded p-2"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">色・仕様</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2"
                    value={formData.color_text || ''}
                    onChange={e => setFormData({ ...formData, color_text: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">重量 (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border rounded p-2"
                      value={formData.unit_weight || 0}
                      onChange={e => setFormData({ ...formData, unit_weight: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">表面積</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border rounded p-2"
                      value={formData.surface_area || 0}
                      onChange={e => setFormData({ ...formData, surface_area: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-bold text-gray-600">備考情報</h4>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">材質メモ</label>
                  <input
                    type="text"
                    placeholder="例: SPCC, SECC"
                    className="w-full border rounded p-2"
                    value={(formData as any).material_memo || ''}
                    onChange={e => setFormData({ ...formData, material_memo: e.target.value } as any)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">加工・塗装メモ</label>
                  <input
                    type="text"
                    placeholder="例: 両面塗装, 焼付条件..."
                    className="w-full border rounded p-2"
                    value={(formData as any).process_memo || ''}
                    onChange={e => setFormData({ ...formData, process_memo: e.target.value } as any)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">製品備考 (セット内容等)</label>
                  <textarea
                    rows={2}
                    className="w-full border rounded p-2"
                    value={formData.memo || ''}
                    onChange={e => setFormData({ ...formData, memo: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-indigo-600"
                    checked={formData.is_discontinued || false}
                    onChange={e => setFormData({ ...formData, is_discontinued: e.target.checked })}
                  />
                  <span className="font-bold text-gray-700">廃盤製品にする</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border rounded bg-gray-50 hover:bg-gray-100"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700"
                  >
                    保存
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
