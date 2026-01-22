'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { getProductHistory, deleteMovement } from './actions';

type InventoryItem = {
  product_id: number;
  stock_raw: number;
  stock_finished: number;
  stock_defective: number;
  last_updated_at: string;
  products: {
    name: string;
    product_code: string;
    color_text: string | null;
    partners: { name: string } | null;
  } | null;
};

type Movement = {
  id: string;
  movement_type: string;
  quantity_change: number;
  created_at: string;
  reason: string | null;
  defect_reason: string | null;
  due_date: string | null;
  profiles: { email: string } | null;
};

export default function InventoryList({
  inventory,
}: {
  inventory: InventoryItem[];
}) {
  // 在庫ゼロ表示フラグ (デフォルトOFF)
  const [showZeroStock, setShowZeroStock] = useState(false);

  const groupedData = useMemo(() => {
    const groups = new Map<string, InventoryItem[]>();
    inventory.forEach((item) => {
      // フィルタリング処理
      const totalStock =
        item.stock_raw + item.stock_finished + item.stock_defective;
      if (!showZeroStock && totalStock === 0) return;

      const partnerName = item.products?.partners?.name || 'その他';
      if (!groups.has(partnerName)) groups.set(partnerName, []);
      groups.get(partnerName)?.push(item);
    });
    return groups;
  }, [inventory, showZeroStock]);

  return (
    <div className="space-y-4">
      {/* 表示切替スイッチ */}
      <div className="flex justify-end mb-2">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={showZeroStock}
            onChange={(e) => setShowZeroStock(e.target.checked)}
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          <span className="ms-3 text-sm font-medium text-gray-700">
            在庫ゼロも含めて表示
          </span>
        </label>
      </div>

      {Array.from(groupedData.entries()).map(([partnerName, items]) => (
        <InventoryAccordion
          key={partnerName}
          partnerName={partnerName}
          items={items}
        />
      ))}

      {inventory.length === 0 && (
        <div className="p-8 text-center bg-gray-50 rounded-lg text-gray-500">
          データがありません
        </div>
      )}
    </div>
  );
}

function InventoryAccordion({
  partnerName,
  items,
}: {
  partnerName: string;
  items: InventoryItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const totalRaw = items.reduce((sum, i) => sum + i.stock_raw, 0);
  const totalFinished = items.reduce((sum, i) => sum + i.stock_finished, 0);
  const totalDefective = items.reduce((sum, i) => sum + i.stock_defective, 0);

  // 履歴モーダル管理
  const [historyTarget, setHistoryTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className={`transform transition-transform text-gray-400 ${isOpen ? 'rotate-90' : ''}`}
          >
            ▶
          </span>
          <span className="font-bold text-lg text-gray-800">{partnerName}</span>
          <span className="text-sm text-gray-500">({items.length}製品)</span>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500">生地</span>
            <span className="font-bold">{totalRaw.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-end border-l pl-4 border-gray-300">
            <span className="text-xs text-gray-500">完成</span>
            <span className="font-bold text-blue-700">
              {totalFinished.toLocaleString()}
            </span>
          </div>
          {totalDefective > 0 && (
            <div className="flex flex-col items-end border-l pl-4 border-gray-300">
              <span className="text-xs text-gray-500">不良</span>
              <span className="font-bold text-red-600">
                {totalDefective.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 w-32">
                  型番
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500">
                  品名
                </th>
                <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 w-20 bg-yellow-50/50">
                  生地
                </th>
                <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 w-20 bg-blue-50/50">
                  完成
                </th>
                <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 w-20 bg-red-50/50">
                  不良
                </th>
                <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 w-20">
                  履歴
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((item) => (
                <tr key={item.product_id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-mono text-gray-900">
                    {item.products?.product_code}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {item.products?.name}{' '}
                    <span className="text-xs text-gray-400">
                      {item.products?.color_text}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold bg-yellow-50/30">
                    {item.stock_raw > 0 ? item.stock_raw.toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-blue-700 bg-blue-50/30">
                    {item.stock_finished > 0
                      ? item.stock_finished.toLocaleString()
                      : '-'}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-red-600 bg-red-50/30">
                    {item.stock_defective > 0
                      ? item.stock_defective.toLocaleString()
                      : '-'}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() =>
                        setHistoryTarget({
                          id: item.product_id,
                          name: `${item.products?.product_code} ${item.products?.name}`,
                        })
                      }
                      className="text-gray-400 hover:text-indigo-600"
                      title="履歴を確認・修正"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historyTarget && (
        <HistoryModal
          productId={historyTarget.id}
          productName={historyTarget.name}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}

function HistoryModal({
  productId,
  productName,
  onClose,
}: {
  productId: number;
  productName: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    const data = await getProductHistory(productId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setHistory(data as any[]);
    setIsLoading(false);
  }, [productId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
  }, [loadHistory]);

  const handleDelete = async (id: string, type: string) => {
    if (!confirm('この操作を取り消しますか？\n在庫数が元に戻ります。')) return;
    // 出荷の削除は注意喚起
    if (type === 'shipping') {
      if (
        !confirm(
          '警告: 出荷データを取り消すと在庫は戻りますが、納品書(売上)データは別途削除が必要です。\n続行しますか？'
        )
      )
        return;
    }

    const res = await deleteMovement(id);
    if (res.success) {
      alert('取り消しました');
      loadHistory(); // リロード
    } else {
      alert('エラー: ' + res.message);
    }
  };

  // 表示名変換ヘルパー
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'receiving':
        return (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">
            受入
          </span>
        );
      case 'production_raw':
        return (
          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">
            消費
          </span>
        );
      case 'production_finished':
        return (
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
            完成
          </span>
        );
      case 'production_defective':
        return (
          <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">
            不良
          </span>
        );
      case 'shipping':
        return (
          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
            出荷
          </span>
        );
      case 'repair':
        return (
          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs border border-blue-200">
            手直し
          </span>
        );
      case 'return_defective':
        return (
          <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs border border-gray-300">
            返却
          </span>
        );
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h3 className="font-bold text-gray-800">履歴・修正: {productName}</h3>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">読み込み中...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              履歴がありません
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-500">日時</th>
                  <th className="px-4 py-2 text-left text-gray-500">操作</th>
                  <th className="px-4 py-2 text-right text-gray-500">数量</th>
                  <th className="px-4 py-2 text-left text-gray-500">
                    詳細・理由
                  </th>
                  <th className="px-4 py-2 text-center text-gray-500">取消</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(h.created_at).toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {getTypeLabel(h.movement_type)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${h.quantity_change > 0 ? 'text-blue-600' : 'text-red-600'}`}
                    >
                      {h.quantity_change > 0 ? '+' : ''}
                      {h.quantity_change}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {h.reason && <div>{h.reason}</div>}
                      {h.defect_reason && (
                        <div className="text-red-500">{h.defect_reason}</div>
                      )}
                      {h.due_date && <div>納期: {h.due_date}</div>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(h.id, h.movement_type)}
                        className="text-gray-400 hover:text-red-600"
                        title="この操作を取り消す"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
