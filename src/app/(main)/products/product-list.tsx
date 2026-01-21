'use client';

import { useState } from 'react';
import { deleteProduct } from './actions';
import type { Product, Partner } from '@/types/models';

type Props = {
  initialProducts: Product[];
  masterPartners: Partner[];
};

export default function ProductList({ initialProducts, masterPartners }: Props) {
  // フィルタリング用ステート
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPartnerId, setFilterPartnerId] = useState('');

  // 製品データ正規化
  const normalizedProducts = initialProducts.map((p) => ({
    ...p,
    partners: Array.isArray(p.partners) ? (p.partners[0] ?? null) : p.partners,
  }));

  // フィルタリング処理
  const filteredProducts = normalizedProducts.filter((p) => {
    // 1. テキスト検索 (製品名 or コード)
    const lowerQuery = searchQuery.toLowerCase();
    const matchText =
      !searchQuery ||
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.product_code || '').toLowerCase().includes(lowerQuery);

    // 2. 取引先フィルタ
    // (p.partners は normalize されているので単一オブジェクトまたはnull)
    const pPartner = p.partners as Partner | null;
    const matchPartner =
      !filterPartnerId || (pPartner && pPartner.id === filterPartnerId);

    return matchText && matchPartner;
  });

  const handleDelete = async (id: string | number) => {
    if (!confirm('本当に削除しますか？')) return;
    const res = await deleteProduct(String(id));
    alert(res.message);
  };

  return (
    <div className="space-y-4">
      {/* フィルタUI */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 block mb-1">
            検索 (製品名・コード)
          </label>
          <input
            type="text"
            className="w-full border p-2 rounded text-sm"
            placeholder="キーワードを入力..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">
            取引先で絞り込み
          </label>
          <select
            className="w-full sm:w-48 border p-2 rounded text-sm bg-white"
            value={filterPartnerId}
            onChange={(e) => setFilterPartnerId(e.target.value)}
          >
            <option value="">すべて</option>
            {masterPartners.map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 一覧テーブル */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500">
                コード
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500">
                製品名
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500">
                取引先
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  該当する製品がありません
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">
                    {p.product_code}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">
                    {p.name}{' '}
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      {p.color}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {(p.partners as Partner | null)?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
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
        {filteredProducts.length} 件表示 / 全 {initialProducts.length} 件
      </div>
    </div>
  );
}
