'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getShipmentList,
  deleteShipment,
} from '@/app/(main)/inventory/actions';

type Shipment = {
  id: string;
  shipment_date: string;
  delivery_note_number: string | null;
  total_amount: number;
  partners: { name: string } | null;
  created_at: string;
};

export default function ShipmentListPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const data = await getShipmentList();
    setShipments(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'この納品書を削除してもよろしいですか？\n\n・出荷データが完全に取り消されます\n・製品在庫が元の数に戻ります'
      )
    )
      return;

    const res = await deleteShipment(id);
    if (res.success) {
      alert(res.message);
      loadData(); // リロード
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">納品書 管理</h1>
        <div className="flex gap-4">
          <Link
            href="/inventory"
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            ← 在庫・出荷登録へ戻る
          </Link>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
          >
            更新
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">読み込み中...</div>
        ) : shipments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            納品書データがありません
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  納品日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  取引先
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  合計金額
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shipments.map((shipment) => (
                <tr
                  key={shipment.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(shipment.shipment_date).toLocaleDateString(
                      'ja-JP'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {shipment.delivery_note_number ||
                      shipment.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                    {shipment.partners?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                    ¥ {shipment.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium flex justify-center gap-4">
                    {/* 印刷ボタン */}
                    <a
                      href={`/shipments/${shipment.id}/print`}
                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.5a.75.75 0 01-1.5 0v-2a.25.25 0 00-.25-.25h-6.5a.25.25 0 00-.25.25v2a.75.75 0 01-1.5 0v-3.5zm2.5 8.5a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75zm0 3a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75zM2 10a4 4 0 014-4h1.5a.75.75 0 010 1.5H6a2.5 2.5 0 00-2.5 2.5v5.5A2.5 2.5 0 006 18h1.5a.75.75 0 010 1.5H6a4 4 0 01-4-4v-5.5zm12 0a4 4 0 014-4h-1.5a.75.75 0 000 1.5H18a2.5 2.5 0 012.5 2.5v5.5a2.5 2.5 0 01-2.5 2.5h-1.5a.75.75 0 000 1.5H18a4 4 0 004-4v-5.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      印刷
                    </a>

                    {/* 削除ボタン */}
                    <button
                      onClick={() => handleDelete(shipment.id)}
                      className="text-red-600 hover:text-red-900 flex items-center gap-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      取消
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
