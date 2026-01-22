'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getPartners,
  createPartner,
  updatePartner,
  deletePartner,
} from './actions';
import type { Partner } from '@/types/models';

export default function PartnersPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 編集モーダル用
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Partner>>({
    closing_date: 99,
  });

  // データロード
  const loadPartners = useCallback(async () => {
    setIsLoading(true);
    const data = await getPartners();
    setPartners(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPartners();
  }, [loadPartners]);

  // 新規登録ボタン
  const handleCreate = () => {
    setFormData({ closing_date: 99 }); // 初期値リセット
    setIsEditing(true);
  };

  // 編集ボタン
  const handleEdit = (p: Partner) => {
    setFormData({ ...p });
    setIsEditing(true);
  };

  // 削除ボタン
  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'この取引先を削除しますか？\n※関連する製品や履歴がある場合、エラーになる可能性があります。'
      )
    )
      return;

    const res = await deletePartner(id);
    if (res.success) {
      alert(res.message);
      loadPartners();
    } else {
      alert(res.message);
    }
  };

  // 保存処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert('取引先名は必須です');

    const fd = new FormData();
    fd.set('name', formData.name);
    fd.set('partner_code', formData.partner_code ?? '');
    fd.set('address', formData.address ?? '');
    fd.set('phone', formData.phone ?? '');
    fd.set('corporate_number', formData.corporate_number ?? '');
    fd.set('memo', formData.memo ?? '');
    fd.set('closing_date', String(formData.closing_date ?? 99));

    const res = formData.id
      ? await updatePartner(formData.id, fd)
      : await createPartner(fd);
    if (res.success) {
      alert(res.message);
      setIsEditing(false);
      loadPartners();
      router.refresh(); // Server Componentsのキャッシュをクリア
    } else {
      alert(res.message);
    }
  };

  // 締め日表示ヘルパー
  const getClosingLabel = (day: number | null) => {
    const value = day ?? 99;
    if (value === 99)
      return (
        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
          末締め
        </span>
      );
    return (
      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
        {value}日締め
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">取引先マスタ</h1>
        <button
          onClick={handleCreate}
          className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 transition-colors"
        >
          ＋ 新規登録
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">読み込み中...</div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            データがありません
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                  コード
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  取引先名
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">
                  請求締め日
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  連絡先 / メモ
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-32">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {partners.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">
                    {p.partner_code || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">
                    {p.name}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {getClosingLabel(p.closing_date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>{p.address}</div>
                    <div className="text-xs">{p.phone}</div>
                    {p.memo && (
                      <div className="text-xs text-gray-400 mt-1">
                        ※{p.memo}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-sm">
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 編集モーダル */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {formData.id ? '取引先を編集' : '新規取引先登録'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    取引先コード
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="C001"
                    value={formData.partner_code || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, partner_code: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    締め日設定
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.closing_date ?? 99}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        closing_date: Number(e.target.value),
                      })
                    }
                  >
                    <option value={99}>末締め (デフォルト)</option>
                    <option value={20}>20日締め</option>
                    <option value={15}>15日締め</option>
                    <option value={10}>10日締め</option>
                    <option value={25}>25日締め</option>
                    <option value={5}>5日締め</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  法人番号
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="1234567890123"
                  value={formData.corporate_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, corporate_number: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  取引先名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="株式会社〇〇"
                  value={formData.name || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  住所
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.address || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  電話番号
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.phone || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  メモ
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={2}
                  value={formData.memo || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, memo: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-white bg-indigo-600 rounded font-bold hover:bg-indigo-700 shadow"
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div >
      )
      }
    </div >
  );
}
