'use client';

import { deleteProduct } from './actions';
import type { Product, Partner } from '@/types/models';

type Props = {
  initialProducts: Product[];
  masterPartners: Partner[];
};

export default function ProductList({ initialProducts }: Props) {
  const products = initialProducts.map((p) => ({
    ...p,
    partners: Array.isArray(p.partners) ? (p.partners[0] ?? null) : p.partners,
  }));
  const handleDelete = async (id: string | number) => {
    if (!confirm('本当に削除しますか？')) return;
    const res = await deleteProduct(String(id));
    alert(res.message);
  };

  return (
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
          {products.map((p) => (
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
                {p.partners?.name}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
