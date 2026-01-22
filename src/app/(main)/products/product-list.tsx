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
  { key: 'product_code', label: '製品コード', type: 'text' },
  { key: 'name', label: '製品名', type: 'text' },
  { key: 'partner_name', label: '取引先', type: 'select' },
  { key: 'color_text', label: '色・仕様', type: 'text' },
  { key: 'unit_weight', label: '重量(kg)', type: 'number' },
  { key: 'surface_area', label: '表面積', type: 'number' },
  { key: 'material_memo', label: '材質メモ', type: 'text' },
  { key: 'process_memo', label: '加工メモ', type: 'text' },
  { key: 'memo', label: '備考', type: 'text' },
  { key: 'is_discontinued', label: '状態', type: 'status' },
] as const;

export default function ProductList({ initialProducts, masterPartners }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- State ---
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    ALL_COLUMNS.forEach(col => {
      const paramKey = col.key === 'partner_name' ? 'partner_id' : col.key;
      const val = searchParams.get(paramKey);
      if (val) f[col.key] = val;
    });
    return f;
  });

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['product_code', 'name', 'partner_name', 'color_text', 'unit_weight', 'is_discontinued'])
  );

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'product_code', direction: 'asc' });

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

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) {
        const paramKey = key === 'partner_name' ? 'partner_id' : key;
        params.set(paramKey, val);
      }
    });
    router.push(`?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setFilters({});
    router.push('?');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  // --- Filtering & Sorting ---
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...initialProducts];

    // Filter
    Object.entries(filters).forEach(([key, val]) => {
      if (!val) return;
      if (!visibleColumns.has(key)) return;

      if (key === 'partner_name') {
        result = result.filter(p => String(p.partner_id) === val);
      } else if (key === 'is_discontinued') {
        if (val === 'true') {
          result = result.filter(p => p.is_discontinued);
        } else if (val === 'false') {
          result = result.filter(p => !p.is_discontinued);
        }
      } else {
        result = result.filter(p => {
          const v = (p as any)[key];
          return v != null && String(v).toLowerCase().includes(val.toLowerCase());
        });
      }
    });

    // Sort
    result.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Product];
      let bValue: any = b[sortConfig.key as keyof Product];

      if (sortConfig.key === 'partner_name') {
        aValue = a.partners?.name || '';
        bValue = b.partners?.name || '';
      }

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [initialProducts, sortConfig, filters, visibleColumns]);

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
    fd.set('material_memo', (formData as any).material_memo || '');
    fd.set('process_memo', (formData as any).process_memo || '');
    fd.set('is_discontinued', String(formData.is_discontinued));

    const res = editingProduct
      ? await updateProduct(String(editingProduct.id), fd)
      : await createProduct(fd);

    if (res.success) {
      alert(res.message);
      setIsModalOpen(false);
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Filters Area */}
      {visibleColumns.size > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-bold text-gray-700">絞り込み条件 (表示項目連動)</label>
            <div className="flex gap-2">
              <button onClick={applyFilters} className="text-xs bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700">検索</button>
              <button onClick={handleClearFilters} className="text-xs bg-white border text-gray-600 px-3 py-1 rounded hover:bg-gray-50">クリア</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {ALL_COLUMNS.filter(col => visibleColumns.has(col.key)).map(col => {
              if (col.key === 'partner_name') {
                return (
                  <div key={col.key} className="w-48">
                    <select
                      className="w-full border p-2 rounded text-sm"
                      value={filters[col.key] || ''}
                      onChange={e => handleFilterChange(col.key, e.target.value)}
                    >
                      <option value="">取引先: すべて</option>
                      {masterPartners.map(mp => (
                        <option key={mp.id} value={mp.id}>{mp.name}</option>
                      ))}
                    </select>
                  </div>
                );
              }
              if (col.key === 'is_discontinued') {
                return (
                  <div key={col.key} className="w-32">
                    <select
                      className="w-full border p-2 rounded text-sm"
                      value={filters[col.key] || ''}
                      onChange={e => handleFilterChange(col.key, e.target.value)}
                    >
                      <option value="">状態: すべて</option>
                      <option value="false">稼働中</option>
                      <option value="true">廃盤</option>
                    </select>
                  </div>
                );
              }
              return (
                <div key={col.key} className="w-40">
                  <input
                    type={col.type === 'number' ? 'number' : 'text'}
                    className="w-full border p-2 rounded text-sm"
                    placeholder={col.label}
                    value={filters[col.key] || ''}
                    onChange={e => handleFilterChange(col.key, e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls & Table */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          検索結果: {filteredAndSortedProducts.length} 件
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="bg-white border text-sm px-3 py-2 rounded hover:bg-gray-50 flex items-center gap-1">
              表示項目設定 <span className="text-[10px]">▼</span>
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
