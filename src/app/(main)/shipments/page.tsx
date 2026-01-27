'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getShipmentList,
  deleteShipment,
  updateShipmentRemarks,
  getShipmentDetail,
} from '@/app/(main)/inventory/actions';

type Shipment = {
  id: string;
  shipment_date: string;
  delivery_note_number: string | null;
  total_amount: number;
  remarks: string | null;
  partners: { name: string } | null;
  created_at: string;
};

type ShipmentDetail = {
  id: string;
  shipment_date: string;
  delivery_note_number: string | null;
  total_amount: number;
  remarks: string | null;
  partners: { name: string; address?: string; phone?: string } | null;
  items: {
    id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    products: { name: string; product_code: string; color_text?: string } | null;
  }[];
};

export default function ShipmentListPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewData, setPreviewData] = useState<ShipmentDetail | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [remarksText, setRemarksText] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const data = await getShipmentList();
    setShipments(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
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
      loadData();
    } else {
      alert(res.message);
    }
  };

  const handlePreview = async (id: string) => {
    const detail = await getShipmentDetail(id);
    setPreviewData(detail);
  };

  const handleEditRemarks = (shipment: Shipment) => {
    setEditingId(shipment.id);
    setRemarksText(shipment.remarks || '');
  };

  const handleSaveRemarks = async () => {
    if (!editingId) return;
    const res = await updateShipmentRemarks(editingId, remarksText);
    if (res.success) {
      setEditingId(null);
      loadData();
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  納品日
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  取引先
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  備考
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {new Date(shipment.shipment_date).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-500">
                    {shipment.delivery_note_number ||
                      shipment.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800">
                    {shipment.partners?.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                    ¥{shipment.total_amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px]">
                    {editingId === shipment.id ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={remarksText}
                          onChange={(e) => setRemarksText(e.target.value)}
                          className="border rounded px-2 py-1 text-sm w-full"
                          placeholder="備考を入力..."
                          autoFocus
                        />
                        <button
                          onClick={handleSaveRemarks}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleEditRemarks(shipment)}
                        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[28px] truncate"
                        title={shipment.remarks || 'クリックして備考を追加'}
                      >
                        {shipment.remarks || (
                          <span className="text-gray-400 text-xs">+ 備考追加</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center gap-2">
                      {/* プレビュー */}
                      <button
                        onClick={() => handlePreview(shipment.id)}
                        className="text-gray-600 hover:text-gray-900 p-1"
                        title="プレビュー"
                      >
                        📜
                      </button>
                      {/* 印刷 */}
                      <a
                        href={`/shipments/${shipment.id}/print`}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="印刷"
                      >
                        🖨️
                      </a>
                      {/* 取消 */}
                      <button
                        onClick={() => handleDelete(shipment.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="取消"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* プレビューモーダル */}
      {previewData && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewData(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                納品書プレビュー
              </h2>
              <div className="flex gap-2">
                <a
                  href={`/shipments/${previewData.id}/print`}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  印刷へ
                </a>
                <button
                  onClick={() => setPreviewData(null)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* モーダル内容 */}
            <div className="p-6 space-y-6">
              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">取引先:</span>
                  <span className="ml-2 font-bold">{previewData.partners?.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">納品日:</span>
                  <span className="ml-2">
                    {new Date(previewData.shipment_date).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">No.:</span>
                  <span className="ml-2 font-mono">
                    {previewData.delivery_note_number || previewData.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">合計金額:</span>
                  <span className="ml-2 font-bold text-lg">
                    ¥{previewData.total_amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 備考 */}
              {previewData.remarks && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                  <span className="text-yellow-800 font-bold">備考:</span>
                  <span className="ml-2">{previewData.remarks}</span>
                </div>
              )}

              {/* 明細テーブル */}
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-left">No.</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">品名 / 品番</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">数量</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">単価</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-center">{idx + 1}</td>
                      <td className="border border-gray-300 px-3 py-2">
                        <div className="font-bold">{item.products?.name}</div>
                        <div className="text-xs text-gray-500">
                          {item.products?.product_code}
                          {item.products?.color_text && ` / ${item.products.color_text}`}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right">{item.quantity}</td>
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        @{item.unit_price.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-bold">
                        ¥{item.line_total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="border border-gray-300 px-3 py-2 text-right font-bold">
                      税抜合計
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-bold">
                      ¥{previewData.total_amount.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="border border-gray-300 px-3 py-2 text-right">
                      消費税 (10%)
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      ¥{Math.floor(previewData.total_amount * 0.1).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="font-bold text-lg">
                    <td colSpan={4} className="border border-gray-300 px-3 py-3 text-right">
                      税込合計
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-right text-blue-600">
                      ¥{Math.floor(previewData.total_amount * 1.1).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
