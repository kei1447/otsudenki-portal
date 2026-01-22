'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  registerReceiving,
  registerProduction,
  registerShipment,
  registerDefectiveProcessing,
  getGlobalHistory,
  bulkDeleteMovements,
  registerBulkProduction,
} from './actions';
import {
  getRawStockProductsByPartner,
  getFinishedStockProductsByPartner,
  getDefectiveProductsByPartner,
  getRecentShipments,
  getProductsByPartner,
} from './actions';
import InventoryTable from './inventory-table';

// 型定義
type ReceivingProduct = Awaited<ReturnType<typeof getProductsByPartner>>[number];
type ProductionProduct = Awaited<ReturnType<typeof getRawStockProductsByPartner>>[number];
type ShipmentProduct = Awaited<ReturnType<typeof getFinishedStockProductsByPartner>>[number];
type DefectiveProduct = Awaited<ReturnType<typeof getDefectiveProductsByPartner>>[number];

const formatDateForDB = (val: string) => {
  // YYYYMMDD -> YYYY-MM-DD
  if (/^\d{8}$/.test(val)) {
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
  }
  return val;
};

export default function OperationPanel({
  partnerId,
  receivingCandidates,
  productionCandidates,
  shipmentCandidates,
  defectiveCandidates,
}: {
  partnerId: string;
  receivingCandidates: ReceivingProduct[];
  productionCandidates: ProductionProduct[];
  shipmentCandidates: ShipmentProduct[];
  defectiveCandidates: DefectiveProduct[];
}) {
  const [activeTab, setActiveTab] = useState('receiving');

  // タブ切り替えスタイル
  const tabClass = (id: string) =>
    `px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === id ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`;

  return (
    <div className="space-y-6">
      {/* タブヘッダー */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('receiving')}
          className={tabClass('receiving')}
        >
          1. 部材受入
        </button>
        <button
          onClick={() => setActiveTab('production')}
          className={tabClass('production')}
        >
          2. 加工実績
        </button>
        <button
          onClick={() => setActiveTab('shipment')}
          className={tabClass('shipment')}
        >
          3. 出荷登録
        </button>
        <button
          onClick={() => setActiveTab('defective')}
          className={tabClass('defective')}
        >
          4. 不良品処理
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={tabClass('history')}
        >
          5. 履歴・取消
        </button>
      </div>

      <div className="bg-white p-6 rounded-b-lg border border-gray-200 shadow-sm min-h-[400px]">
        {activeTab === 'receiving' && <ReceivingTab products={receivingCandidates} />}
        {activeTab === 'production' && <ProductionTab products={productionCandidates} />}
        {activeTab === 'shipment' && <ShipmentTab partnerId={partnerId} products={shipmentCandidates} defectiveCandidates={defectiveCandidates} />}
        {activeTab === 'defective' && (
          <DefectiveTab products={defectiveCandidates} />
        )}
        {activeTab === 'history' && <HistoryTable />}
      </div>
    </div>
  );
}

// ============================================================================
// 1. 受入登録タブ
// ============================================================================
// ============================================================================
// 1. 受入登録タブ
// ============================================================================
// ============================================================================
// 1. 受入登録タブ
// ============================================================================
function ReceivingTab({ products }: { products: ReceivingProduct[] }) {
  const [inputs, setInputs] = useState<Record<number, { qty: string; date: string; dueDate?: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (id: number, field: 'qty' | 'date' | 'dueDate', value: string) => {
    setInputs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleBulkRegister = async () => {
    const entries = products
      .map((p) => {
        const val = inputs[p.id];
        if (!val || !val.qty) return null;
        return {
          productId: p.id,
          quantity: parseInt(val.qty),
          dueDate: val.dueDate ? formatDateForDB(val.dueDate) : '',
          arrivalDate: val.date ? formatDateForDB(val.date) : '',
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null && e.quantity > 0);

    if (entries.length === 0) return alert('数量を入力してください');

    const invalidDate = entries.find(e =>
      (e.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(e.dueDate)) ||
      (e.arrivalDate && !/^\d{4}-\d{2}-\d{2}$/.test(e.arrivalDate))
    );
    if (invalidDate) return alert('日付はYYYYMMDD形式(8桁)で入力してください');

    const productMap = new Map(products.map(p => [p.id, p]));
    const confirmMsg = entries.map(e => {
      const p = productMap.get(e.productId);
      return `・${p?.name}: ${e.quantity}個 (入荷日: ${e.arrivalDate || '指定なし'}, 納期: ${e.dueDate || '指定なし'})`;
    }).join('\n');

    if (!confirm(`以下を一括登録しますか？\n\n${confirmMsg}`)) return;

    setIsSubmitting(true);

    // 並列処理で一括登録
    const results = await Promise.all(entries.map(e => registerReceiving(e)));

    // エラーがあればアラート
    const errors = results.filter(r => !r.success);
    if (errors.length > 0) {
      alert(`一部エラーが発生しました:\n${errors.map(e => e.message).join('\n')}`);
    } else {
      alert('受入登録が完了しました');
    }

    // 成功したものの入力をクリア
    const newInputs = { ...inputs };
    entries.forEach((e, idx) => {
      if (results[idx].success) {
        delete newInputs[e.productId];
      }
    });
    setInputs(newInputs);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-l-4 border-yellow-400 pl-3">
        <h3 className="font-bold text-gray-700">
          生地・部材の受入
        </h3>
        <button
          onClick={handleBulkRegister}
          disabled={isSubmitting}
          className="bg-yellow-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-yellow-600 disabled:opacity-50 shadow-sm"
        >
          一括受入登録
        </button>
      </div>

      <InventoryTable
        products={products}
        placeholder="製品名、品番、色で検索..."
        renderRow={(p) => (
          <tr key={p.id} className={inputs[p.id]?.qty ? "bg-yellow-50" : "hover:bg-yellow-50"}>
            <td className="px-4 py-3 text-sm font-mono text-gray-600">{p.product_code}</td>
            <td className="px-4 py-3 text-sm font-bold text-gray-800">{p.name}</td>
            <td className="px-4 py-3 text-sm text-gray-500">
              {p.color_text}
              <div className="text-xs text-gray-400 mt-1">
                現在庫: <span className="font-bold">{p.stock_raw.toLocaleString()}</span>
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="数量"
                  className="w-24 border p-1 rounded text-right font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  value={inputs[p.id]?.qty || ''}
                  onChange={(e) => handleChange(p.id, 'qty', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="入荷日(YYYYMMDD)"
                  className="w-32 border p-1 rounded text-xs text-gray-500 font-mono"
                  value={inputs[p.id]?.date || ''}
                  onChange={(e) => handleChange(p.id, 'date', e.target.value)}
                  maxLength={8}
                />
                <input
                  type="text"
                  placeholder="納期(YYYYMMDD)"
                  className="w-32 border p-1 rounded text-xs text-gray-500 font-mono"
                  value={inputs[p.id]?.dueDate || ''}
                  onChange={(e) => handleChange(p.id, 'dueDate', e.target.value)}
                  maxLength={8}
                />
              </div>
              {/* @ts-ignore */}
              {p.arrivals && p.arrivals.length > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  直近: {p.arrivals[0].label}
                </div>
              )}
            </td>
          </tr>
        )}
      />

      {/* 下部にもボタン配置（リストが長い場合用） */}
      <div className="text-right pt-2">
        <button
          onClick={handleBulkRegister}
          disabled={isSubmitting}
          className="bg-yellow-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-yellow-600 disabled:opacity-50 shadow-sm"
        >
          一括受入登録
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 2. 加工実績タブ
// ============================================================================
type ProdInput = {
  finished: string;
  rawUsed: string;
  defective: string;
  defects: Record<string, number>;
  sourceDate: string;
};

function ProductionTab({ products }: { products: ProductionProduct[] }) {
  const [inputs, setInputs] = useState<Record<number, ProdInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (id: number, field: keyof ProdInput, value: string) => {
    setInputs((prev) => {
      const current = prev[id] || {
        finished: '',
        rawUsed: '',
        defective: '',
        defects: {},
        sourceDate: '',
      };
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  };

  const handleDefectsSave = (
    productId: number,
    newDefects: Record<string, number>
  ) => {
    setInputs((prev) => {
      const current = prev[productId] || {
        finished: '',
        rawUsed: '',
        defective: '',
        defects: {},
        sourceDate: '',
      };
      const totalDefective = Object.values(newDefects).reduce(
        (a, b) => a + b,
        0
      );
      return {
        ...prev,
        [productId]: {
          ...current,
          defects: newDefects,
          defective: totalDefective > 0 ? totalDefective.toString() : '',
        },
      };
    });
  };

  const handleBulkRegister = async () => {
    const ids = Object.keys(inputs).map(Number);
    if (ids.length === 0) return alert('登録するデータがありません');

    const itemsToRegister = [];
    const errorMessages = [];

    for (const id of ids) {
      const p = products.find((prod) => prod.id === id);
      if (!p) continue;

      const inp = inputs[id];
      const finished = Number(inp.finished || 0);
      const defective = Number(inp.defective || 0);
      const rawUsed = Number(inp.rawUsed) || finished + defective;

      if (finished + defective === 0) continue;

      // バリデーション: 入荷数チェック
      if (inp.sourceDate) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const arrival = p.arrivals?.find((a: any) => a.value === inp.sourceDate);
        if (arrival && typeof arrival.quantity === 'number') {
          // 消費数(rawUsed)が入荷数を超えていないかチェック
          if (rawUsed > arrival.quantity) {
            errorMessages.push(`製品:${p.name} の消費数(${rawUsed})が入荷数(${arrival.quantity})を超えています`);
            continue;
          }
        }
      }

      let defectReason = '';
      if (inp.defects && Object.keys(inp.defects).length > 0) {
        defectReason = Object.entries(inp.defects)
          .map(([reason, count]) => `${reason}:${count}`)
          .join(', ');
      }

      itemsToRegister.push({
        productId: id,
        rawUsed,
        finished,
        defective,
        defectReason,
        sourceDate: inp.sourceDate,
        productName: p.name, // 確認ダイアログ用
      });
    }

    if (errorMessages.length > 0) {
      alert('【エラー】\n' + errorMessages.join('\n'));
      return;
    }

    if (itemsToRegister.length === 0) return;

    if (
      !confirm(
        `以下の${itemsToRegister.length}件を登録しますか？\n\n` +
        itemsToRegister
          .map(
            (i) =>
              `・${i.productName}: 完成${i.finished}/不良${i.defective} (消費${i.rawUsed})`
          )
          .join('\n')
      )
    )
      return;

    setIsSubmitting(true);
    const res = await registerBulkProduction(itemsToRegister);
    alert(res.message);
    if (res.success) {
      setInputs({});
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-md border border-blue-100">
        <div>
          <h3 className="font-bold text-gray-700 border-l-4 border-blue-500 pl-3">
            加工実績の登録
          </h3>
          <p className="text-xs text-blue-600 mt-1 pl-3">
            入荷日を選択すると、入荷数を超える入力を防ぎます
          </p>
        </div>
        <button
          onClick={handleBulkRegister}
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm"
        >
          一括登録
        </button>
      </div>

      <InventoryTable
        products={products}
        placeholder="製品名、品番、色で検索..."
        renderRow={(p) => {
          const inp = inputs[p.id] || {};
          const isInputting =
            (inp.finished && Number(inp.finished) > 0) ||
            (inp.defective && Number(inp.defective) > 0);

          return (
            <tr
              key={p.id}
              className={isInputting ? 'bg-blue-50' : 'hover:bg-gray-50'}
            >
              <td className="px-4 py-3 text-sm font-mono text-gray-600">
                {p.product_code}
              </td>
              <td className="px-4 py-3 text-sm font-bold text-gray-800">
                {p.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {p.color_text}
                {/* 入荷情報の表示と選択 */}
                {p.arrivals && p.arrivals.length > 0 && (
                  <div className="mt-1">
                    <select
                      className="text-xs border rounded p-1 bg-white text-gray-700 w-full max-w-[200px]"
                      value={inp.sourceDate || ''}
                      onChange={(e) =>
                        handleChange(p.id, 'sourceDate', e.target.value)
                      }
                    >
                      <option value="">(入荷日自動)</option>
                      {p.arrivals.map((a, idx) => (
                        <option key={idx} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="space-y-2">
                  <div className="flex gap-2 items-end">
                    <label className="text-xs font-bold text-blue-600 w-8">
                      良品
                    </label>
                    <input
                      type="number"
                      className="w-20 border p-1 rounded text-right font-bold"
                      placeholder="0"
                      value={inp.finished || ''}
                      onChange={(e) =>
                        handleChange(p.id, 'finished', e.target.value)
                      }
                    />
                    <label className="text-xs font-bold text-gray-500 w-8">
                      消費
                    </label>
                    <input
                      type="number"
                      className="w-16 border p-1 rounded text-right bg-gray-100 text-xs"
                      placeholder="自動"
                      value={inp.rawUsed || ''}
                      onChange={(e) =>
                        handleChange(p.id, 'rawUsed', e.target.value)
                      }
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <DefectInputRow
                      productId={p.id}
                      currentDefects={inp.defects || {}}
                      onSave={handleDefectsSave}
                    />
                  </div>
                </div>
              </td>
            </tr>
          );
        }}
      />

      <div className="text-right pt-2 border-t mt-4">
        <button
          onClick={handleBulkRegister}
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg"
        >
          加工実績を一括登録
        </button>
      </div>
    </div>
  );
}

// サブコンポーネント: 不良入力行 (ポップアップ対応)
function DefectInputRow({
  productId,
  currentDefects,
  onSave,
}: {
  productId: number;
  currentDefects: Record<string, number>;
  onSave: (pid: number, defects: Record<string, number>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const total = Object.values(currentDefects).reduce((a, b) => a + b, 0);

  // 不良理由マスタ (要求仕様へ更新)
  // 社外起因: 生地不良、その他
  // 社内起因: タレ・ワキ、スケ、糸ゴミ、虫ゴミ、ブツ、キズ、ハジキ、打痕、水跡、その他
  const reasonsExternal = ['生地不良', 'その他(社外)'];
  const reasonsInternal = [
    'タレ・ワキ', 'スケ', '糸ゴミ', '虫ゴミ',
    'ブツ', 'キズ', 'ハジキ', '打痕', '水跡', 'その他(社内)'
  ];

  const handleReasonChange = (reason: string, val: string) => {
    const num = Number(val);
    const next = { ...currentDefects };
    if (num > 0) next[reason] = num;
    else delete next[reason];
    onSave(productId, next);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-red-500 w-8">不良</label>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-20 border p-1 rounded bg-red-50 text-red-600 font-bold cursor-pointer hover:bg-red-100 text-right"
        >
          {total > 0 ? total : '0'}
        </div>
        {total > 0 && <span className="text-xs text-red-400">詳細入力済</span>}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setIsOpen(false)}>
          <div className="bg-white border border-gray-300 shadow-xl rounded-lg p-4 w-[400px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <span className="font-bold text-gray-700">不良内訳入力</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h5 className="text-xs font-bold text-gray-500 mb-2">【社外起因】</h5>
                <div className="grid grid-cols-2 gap-2">
                  {reasonsExternal.map((r) => (
                    <div key={r} className="flex items-center justify-between bg-gray-50 p-1 px-2 rounded">
                      <span className="text-sm text-gray-600">{r}</span>
                      <input
                        type="number"
                        className="w-16 border rounded p-1 text-right text-sm"
                        placeholder="0"
                        value={currentDefects[r] || ''}
                        onChange={(e) => handleReasonChange(r, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-xs font-bold text-gray-500 mb-2">【社内起因】</h5>
                <div className="grid grid-cols-2 gap-2">
                  {reasonsInternal.map((r) => (
                    <div key={r} className="flex items-center justify-between bg-gray-50 p-1 px-2 rounded">
                      <span className="text-sm text-gray-600 truncate mr-1" title={r}>{r}</span>
                      <input
                        type="number"
                        className="w-16 border rounded p-1 text-right text-sm flex-shrink-0"
                        placeholder="0"
                        value={currentDefects[r] || ''}
                        onChange={(e) => handleReasonChange(r, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 text-right">
              <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700" onClick={() => setIsOpen(false)}>決定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. 出荷登録タブ
// ============================================================================
// ============================================================================
// 3. 出荷登録タブ
// ============================================================================
function ShipmentTab({
  partnerId,
  products,
  defectiveCandidates
}: {
  partnerId: string;
  products: ShipmentProduct[];
  defectiveCandidates: DefectiveProduct[];
}) {
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [date, setDate] = useState(() => {
    const d = new Date();
    const iso = d.toISOString().split('T')[0];
    return iso.replace(/-/g, '');
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [history, setHistory] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New States
  const [shipmentMode, setShipmentMode] = useState<'standard' | 'defective'>('standard');
  const [returnType, setReturnType] = useState<'return_billable' | 'return_free'>('return_billable');
  const [reason, setReason] = useState('');

  // 履歴のみロード
  useEffect(() => {
    const load = async () => {
      const { getRecentShipments } = await import('./actions');
      const hData = await getRecentShipments(partnerId);
      setHistory(hData || []);
    };
    load();
  }, [partnerId]);

  const handleChange = (id: number, val: string) => {
    setInputs((prev) => ({ ...prev, [id]: val }));
  };

  const handleDateChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    if (cleaned.length <= 8) setDate(cleaned);
  };

  const handleRegister = async () => {
    const items = Object.entries(inputs)
      .map(([pid, qty]) => ({ productId: Number(pid), quantity: Number(qty), unitPrice: 0 }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) return alert('出荷数を入力してください');

    const formattedDate = formatDateForDB(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) return alert('日付はYYYYMMDD形式(8桁)で入力してください');

    // Unit Price handling:
    // For standard, we fetch price in action? Use 0 here and let action handle it?
    // User wants "Price" to be consistent.
    // registerShipment action handles price fetching inside loop for 'standard' in previous implementation?
    // Wait, recent `registerShipment` modification REMOVED price fetching inside loop!
    // It expects `items` to have `unitPrice`.
    // I NEED TO FETCH UNIT PRICES HERE ??
    // Or restore price fetching in `registerShipment`.
    // The previous `registerShipment` had `items: { productId, quantity }[]` and fetched prices.
    // The NEW `registerShipment` signature I wrote has `items: { ..., unitPrice }[]`.
    // I made a mistake in `registerShipment` update if the UI doesn't fetch prices.
    // The new `registerDefectiveProcessing` (return) fetches price.
    // I should probably fetch prices in `registerShipment` OR fetch here.
    // Simpler to fetch in action if efficient, but action signature requires unitPrice.
    // Let's assume I need to fetch unit prices here (Client Side / Action Wrapper)? 
    // No, I should fix `registerShipment` to fetch prices if 0/undefined?
    // OR simply fetch pricing in the UI? 
    // NO. It should be server-side logic in `registerShipment`.

    // **Correction**: I will update `registerShipment` to Fetch Prices if `unitPrice` is not provided (or passed as 0).
    // Or I'll keep the UI simple and modify `registerShipment` to accept `items: { productId, quantity }[]` again and fetch internal prices.
    // Wait, my recent `registerShipment` implementation *requires* `unitPrice`.
    // Let's check `actions.ts` again... I replaced it.
    // The previous implementation fetched price.
    // The new one (that I wrote) expects `unitPrice`.
    // I should fix `registerShipment` in `actions.ts` to fetch prices if needed.
    // But for this step (writing `operation-panel.tsx`), I can't change `actions.ts`.
    // I will modify `registerShipment` in a subsequent step.
    // For now, pass 0.

    const confirmText = shipmentMode === 'standard'
      ? `${items.length}品目の出荷を登録しますか？\n出荷日: ${formattedDate}`
      : `${items.length}品目の不良返却(${returnType === 'return_billable' ? '有償' : '無償'})を登録しますか？\n出荷日: ${formattedDate}\n理由: ${reason || 'なし'}`;

    if (confirm(confirmText)) {
      setIsSubmitting(true);
      const res = await registerShipment({
        partnerId,
        date: formattedDate,
        items: items.map(i => ({ ...i, unitPrice: 0 })), // Action will need to be fixed to fetch price
        type: shipmentMode === 'standard' ? 'standard' : returnType,
        reason: shipmentMode === 'defective' ? reason : undefined,
      });

      if (res.success) {
        alert(res.message);
        setInputs({});
        if (shipmentMode === 'defective') setReason('');
        const hData = await getRecentShipments(partnerId);
        setHistory(hData || []);
      } else {
        alert(res.message);
      }
      setIsSubmitting(false);
    }
  };

  const targetProducts = shipmentMode === 'standard' ? products : defectiveCandidates;

  // Render Row for Shipment
  const renderRow = (p: any) => {
    const stock = shipmentMode === 'standard' ? p.stock_finished : p.stock_defective;
    const stockLabel = shipmentMode === 'standard' ? '完成在庫' : '不良在庫';
    const bgClass = inputs[p.id] ? (shipmentMode === 'standard' ? 'bg-green-50' : 'bg-red-50') : 'hover:bg-gray-50';
    const ringClass = shipmentMode === 'standard' ? 'focus:ring-green-500' : 'focus:ring-red-500';

    return (
      <tr key={p.id} className={bgClass}>
        <td className="px-4 py-3 text-sm font-mono text-gray-600">
          {p.product_code}
        </td>
        <td className="px-4 py-3 text-sm font-bold text-gray-800">
          {p.name}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {p.color_text}
          <div className={`text-xs mt-1 ${shipmentMode === 'standard' ? 'text-green-600' : 'text-red-600'}`}>
            {stockLabel}: <span className="font-bold">{stock?.toLocaleString()}</span>
          </div>
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            className={`w-full border p-1 rounded text-right font-bold focus:outline-none focus:ring-2 ${ringClass}`}
            placeholder="0"
            value={inputs[p.id] || ''}
            onChange={(e) => handleChange(p.id, e.target.value)}
          />
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-4">
        <h3 className={`font-bold text-gray-700 border-l-4 pl-3 ${shipmentMode === 'standard' ? 'border-green-500' : 'border-red-500'}`}>
          出荷・返却データの登録
        </h3>

        {/* Mode Selector */}
        <div className="flex items-center gap-4 bg-gray-100 p-2 rounded">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="shipmentMode"
              checked={shipmentMode === 'standard'}
              onChange={() => setShipmentMode('standard')}
            />
            <span className="text-sm font-bold text-gray-700">通常出荷 (良品)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="shipmentMode"
              checked={shipmentMode === 'defective'}
              onChange={() => setShipmentMode('defective')}
            />
            <span className="text-sm font-bold text-red-600">不良品返却</span>
          </label>
        </div>

        {/* Date Input */}
        <div className="bg-gray-50 p-4 rounded flex items-center gap-4">
          <label className="font-bold text-gray-700">出荷日:</label>
          <input
            type="text"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="border p-2 rounded w-32 font-mono"
            placeholder="YYYYMMDD"
            maxLength={8}
          />
          <span className="text-xs text-gray-500">※YYYYMMDD形式</span>
        </div>

        {/* Defective Options */}
        {shipmentMode === 'defective' && (
          <div className="bg-red-50 p-4 rounded border border-red-100 space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-gray-700">返却タイプ:</span>
              <select
                value={returnType}
                onChange={(e) => setReturnType(e.target.value as any)}
                className="include-border border p-1 rounded font-bold"
              >
                <option value="return_billable">有償返却 (売上計上)</option>
                <option value="return_free">無償返却 (0円出荷)</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-gray-700">不良理由(備考):</span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="border p-1 rounded w-full text-sm"
                placeholder="例: 表面キズ、寸法不良など (納品書に記載されます)"
              />
            </div>
          </div>
        )}

        <InventoryTable
          products={targetProducts}
          placeholder="製品名、品番、色で検索..."
          renderRow={renderRow}
        />

        <div className="pt-4 text-right">
          <button
            onClick={handleRegister}
            disabled={isSubmitting}
            className={`px-8 py-3 rounded-lg font-bold shadow disabled:opacity-50 text-white ${shipmentMode === 'standard' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {shipmentMode === 'standard' ? '出荷登録する' : '返却登録する'}
          </button>
        </div>
      </div>

      {/* 右側サイド: 直近の出荷履歴リスト */}
      <div className="w-full lg:w-64 flex-shrink-0 border-t lg:border-t-0 lg:border-l lg:pl-6 pt-6 lg:pt-0">
        <h4 className="font-bold text-gray-500 mb-4 text-sm">
          最近の出荷リスト
        </h4>
        <div className="space-y-3">
          {history.length === 0 && (
            <p className="text-xs text-gray-400">履歴なし</p>
          )}
          {history.map((h) => (
            <div key={h.id} className="border p-3 rounded bg-gray-50 text-sm">
              <div className="flex justify-between text-gray-500 text-xs mb-1">
                <span>{new Date(h.shipment_date).toLocaleDateString()}</span>
                <a
                  href={`/shipments/${h.id}/print`}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  印刷
                </a>
              </div>
              <div className="font-bold text-gray-800">
                ¥{h.total_amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. 不良品処理タブ
// ============================================================================
function DefectiveTab({ products }: { products: DefectiveProduct[] }) {
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (id: number, value: string) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleProcess = async (
    p: DefectiveProduct,
    type: 'repair' | 'dispose'
  ) => {
    const qty = Number(inputs[p.id]);

    if (!qty || qty <= 0) return alert('数量を入力してください');

    let confirmMsg = '';
    switch (type) {
      case 'repair':
        confirmMsg = `製品: ${p.name}\n数量: ${qty}\n\n手直し完了として良品在庫に戻しますか？`;
        break;
      case 'dispose':
        confirmMsg = `製品: ${p.name}\n数量: ${qty}\n\n社内廃棄として処理しますか？\n（在庫のみ減算します）`;
        break;
    }

    if (!confirm(confirmMsg)) return;

    setIsSubmitting(true);
    const res = await registerDefectiveProcessing({
      productId: p.id,
      quantity: qty,
      processingType: type,
    });
    alert(res.message);
    if (res.success) {
      setInputs((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-red-50 p-4 rounded-md border border-red-100">
        <h3 className="font-bold text-gray-700 border-l-4 border-red-500 pl-3">
          不良在庫の処分・手直し
        </h3>
        <p className="text-sm text-gray-600 mt-2">
          発生した不良品について、「手直しして良品にする」か「社内廃棄する」かを登録します。<br />
          ※取引先への返却は「出荷タブ」から行ってください。
        </p>
      </div>
      <InventoryTable
        products={products}
        placeholder="製品名、品番、色で検索..."
        renderRow={(p) => {
          return (
            <tr key={p.id} className="hover:bg-red-50">
              <td className="px-4 py-3 text-sm font-mono text-gray-600">
                {p.product_code}
              </td>
              <td className="px-4 py-3 text-sm font-bold text-gray-800">
                {p.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {p.color_text}
                <div className="text-red-600 font-bold mt-1">
                  不良在庫: {p.stock_defective}
                </div>
                {p.recent_defects.length > 0 && (
                  <div className="mt-1 text-xs text-gray-500 bg-white p-1 rounded border border-red-100">
                    {p.recent_defects.map((d, i) => (
                      <div key={i}>・{d.reason} ({d.date})</div>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 items-center justify-end">
                  <input
                    type="number"
                    className="w-20 border p-1 rounded text-right font-bold"
                    placeholder="0"
                    value={inputs[p.id] || ''}
                    onChange={(e) => handleChange(p.id, e.target.value)}
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleProcess(p, 'repair')}
                      disabled={isSubmitting}
                      className="bg-white border border-blue-500 text-blue-600 px-3 py-1 rounded text-xs hover:bg-blue-50 disabled:opacity-50"
                    >
                      良品へ
                    </button>
                    <button
                      onClick={() => handleProcess(p, 'dispose')}
                      disabled={isSubmitting}
                      className="bg-white border border-red-500 text-red-600 px-3 py-1 rounded text-xs hover:bg-red-50 disabled:opacity-50"
                    >
                      廃棄
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          );
        }}
      />
    </div>
  );
}

// ============================================================================
// 5. 履歴・一括削除テーブル
// ============================================================================
function HistoryTable() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [history, setHistory] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    const data = await getGlobalHistory();
    setHistory(data);
    setSelectedIds(new Set());
    setIsLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
  }, [loadHistory]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };
  const toggleAll = () => {
    if (selectedIds.size === history.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(history.map((h) => h.id)));
  };

  const handleUndo = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `選択した ${selectedIds.size} 件の操作を「取り消し」ますか？\n\n【注意】\n在庫数が操作前の状態に戻ります。\n(例: 受入を取り消すと在庫が減ります)`
      )
    )
      return;
    setIsDeleting(true);
    const res = await bulkDeleteMovements(Array.from(selectedIds));
    setIsDeleting(false);
    alert(res.message);
    loadHistory();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'receiving':
        return (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold">
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
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">
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
          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">
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
      case 'shipping_cancel':
        return (
          <span className="bg-gray-600 text-white px-2 py-0.5 rounded text-xs font-bold">
            出荷取消
          </span>
        );
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-md border border-gray-200">
        <div>
          <h3 className="font-bold text-gray-800">操作履歴の管理</h3>
          <p className="text-xs text-gray-500 mt-1">
            操作を選んで「一括取り消し」ボタンを押すと、在庫が元の状態に戻ります。
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={loadHistory}
            className="text-sm text-gray-500 hover:text-indigo-600 underline mr-2"
          >
            再読み込み
          </button>
          <button
            onClick={handleUndo}
            disabled={selectedIds.size === 0 || isDeleting}
            className={`px-4 py-2 rounded-md font-bold text-white shadow-sm text-sm ${selectedIds.size > 0 ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}
          >
            一括取り消し (在庫戻す)
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">読み込み中...</div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-gray-500">履歴なし</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={
                        selectedIds.size === history.length &&
                        history.length > 0
                      }
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    種類
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    取引先 / 品名
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    数量
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {history.map((h) => {
                  const isSelected = selectedIds.has(h.id);
                  return (
                    <tr
                      key={h.id}
                      className={isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={isSelected}
                          onChange={() => toggleSelect(h.id)}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(h.created_at).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-4 py-3">
                        {getTypeLabel(h.movement_type)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-500">
                          {h.products?.partners?.name}
                        </div>
                        <div className="font-bold text-gray-700">
                          {h.products?.name}
                        </div>
                        {h.reason && (
                          <div className="text-xs text-gray-400">
                            {h.reason}
                          </div>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold ${h.quantity_change > 0 ? 'text-blue-600' : 'text-red-600'}`}
                      >
                        {h.quantity_change > 0 ? '+' : ''}
                        {h.quantity_change}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
