'use client';

import { useState } from 'react';
import { updatePartner, deletePartner } from './actions'; // 修正: 正しい名前でインポート

import { useRouter } from 'next/navigation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PartnerList({ partners }: { partners: any[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;
    const res = await deletePartner(id);
    alert(res.message);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;
    const formData = new FormData(e.currentTarget);
    const res = await updatePartner(editingId, formData);
    alert(res.message);
    if (res.success) {
      setEditingId(null);
      router.refresh();
    }
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
              取引先名
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500">
              締め日
            </th>
            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {partners.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              {editingId === p.id ? (
                <td colSpan={4} className="p-4 bg-blue-50">
                  <form
                    onSubmit={handleUpdate}
                    className="flex gap-2 items-center"
                  >
                    <input
                      name="code"
                      defaultValue={p.code}
                      className="border p-1 w-20 rounded"
                      placeholder="コード"
                      required
                    />
                    <input
                      name="name"
                      defaultValue={p.name}
                      className="border p-1 flex-1 rounded"
                      placeholder="取引先名"
                      required
                    />
                    <select
                      name="closing_date"
                      defaultValue={p.closing_date}
                      className="border p-1 w-24 rounded"
                    >
                      <option value="99">末締め</option>
                      <option value="20">20日</option>
                      <option value="15">15日</option>
                      <option value="10">10日</option>
                    </select>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="bg-gray-400 text-white px-3 py-1 rounded text-sm"
                    >
                      中止
                    </button>
                  </form>
                </td>
              ) : (
                <>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">
                    {p.code}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">
                    {p.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {p.closing_date === 99
                      ? '末締め'
                      : `${p.closing_date}日締め`}
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-2">
                    <button
                      onClick={() => setEditingId(p.id)}
                      className="text-indigo-600 hover:text-indigo-900 font-bold"
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
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
