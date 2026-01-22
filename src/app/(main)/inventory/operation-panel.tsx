'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  registerReceiving,
  registerProduction,
  registerShipment,
  registerDefectiveProcessing,
  getGlobalHistory,
  bulkDeleteMovements,
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
        {activeTab === 'shipment' && <ShipmentTab partnerId={partnerId} products={shipmentCandidates} />}
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
  const [inputs, setInputs] = useState<
    Record<number, { qty: string; date: string }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (id: number, field: 'qty' | 'date', value: string) => {
    if (field === 'date') {
      const cleaned = value.replace(/[^0-9]/g, '');
      if (cleaned.length > 8) return;
      setInputs((prev) => {
        const current = prev[id] || { qty: '', date: '' };
        return { ...prev, [id]: { ...current, [field]: cleaned } };
      });
      return;
    }
    setInputs((prev) => {
      const current = prev[id] || { qty: '', date: '' };
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  };

  const handleBulkRegister = async () => {
    const entries = Object.entries(inputs)
      .map(([id, val]) => ({
        productId: Number(id),
        quantity: Number(val.qty),
        dueDate: val.date ? formatDateForDB(val.date) : '',
      }))
      .filter((e) => e.quantity > 0);

    if (entries.length === 0) return alert('数量を入力してください');

    const invalidDate = entries.find(e => e.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(e.dueDate));
    if (invalidDate) return alert('日付はYYYYMMDD形式(8桁)で入力してください');

    const productMap = new Map(products.map(p => [p.id, p]));
    const confirmMsg = entries.map(e => {
      const p = productMap.get(e.productId);
      return `・${p?.name}: ${e.quantity}個 (入荷日: ${e.dueDate || '指定なし'})`;
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
                  placeholder="YYYYMMDD"
                  className="w-32 border p-1 rounded text-xs text-gray-500 font-mono"
                  value={inputs[p.id]?.date || ''}
                  onChange={(e) => handleChange(p.id, 'date', e.target.value)}
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
      const totalDefective = Object.values(newDefects).reduce((a, b) => a + b, 0);
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

  const handleRegister = async (p: ProductionProduct) => {
    const inp = inputs[p.id] || {};
    const finished = Number(inp.finished || 0);
    const defective = Number(inp.defective || 0);
    const rawUsed = Number(inp.rawUsed) || finished + defective;

    if (finished + defective === 0)
      return alert('完成数または不良数を入力してください');

    let defectReason = '';
    if (inp.defects && Object.keys(inp.defects).length > 0) {
      defectReason = Object.entries(inp.defects)
        .map(([reason, count]) => `${reason}:${count}`)
        .join(', ');
    }

    if (
      confirm(
        `以下の内容で登録しますか？\n\n・製品: ${p.name}\n・良品完成: ${finished}個\n・不良発生: ${defective}個\n・生地消費: ${rawUsed}個\n${inp.sourceDate ? `・入荷日指定: ${inp.sourceDate}` : ''}`
      )
    ) {
      setIsSubmitting(true);
      const res = await registerProduction({
        productId: p.id,
        rawUsed,
        finished,
        defective,
        defectReason,
        sourceDate: inp.sourceDate,
      });
      alert(res.message);
      if (res.success)
        setInputs((prev) => {
          const next = { ...prev };
          delete next[p.id];
          return next;
        });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-700 border-l-4 border-blue-500 pl-3">
        加工実績の登録
      </h3>
      <InventoryTable
        products={products}
        placeholder="製品名、品番、色で検索..."
        renderRow={(p) => {
          const inp = inputs[p.id] || {};
          return (
            <tr key={p.id} className="hover:bg-blue-50">
              <td className="px-4 py-3 text-sm font-mono text-gray-600">{p.product_code}</td>
              <td className="px-4 py-3 text-sm font-bold text-gray-800">
                {p.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {p.color_text}
                {/* 入荷情報の表示と選択 */}
                {p.arrivals && p.arrivals.length > 0 && (
                  <div className="mt-1">
                    <select
                      className="text-xs border rounded p-1 bg-white text-gray-700 w-full max-w-[150px]"
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
                    <label className="text-xs font-bold text-blue-600 w-8">良品</label>
                    <input
                      type="number"
                      className="w-20 border p-1 rounded text-right font-bold"
                      placeholder="0"
                      value={inp.finished || ''}
                      onChange={(e) => handleChange(p.id, 'finished', e.target.value)}
                    />
                    <label className="text-xs font-bold text-gray-500 w-8">消費</label>
                    <input
                      type="number"
                      className="w-16 border p-1 rounded text-right bg-gray-100 text-xs"
                      placeholder="自動"
                      value={inp.rawUsed || ''}
                      onChange={(e) => handleChange(p.id, 'rawUsed', e.target.value)}
                    />
                    <button
                      onClick={() => handleRegister(p)}
                      disabled={isSubmitting}
                      className="ml-2 bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                      登録
                    </button>
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
          )
        }}
      />
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
// ============================================================================
// 3. 出荷登録タブ
// ============================================================================
function ShipmentTab({
  partnerId,
  products
}: {
  partnerId: string;
  products: ShipmentProduct[];
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
      .map(([pid, qty]) => ({ productId: Number(pid), quantity: Number(qty) }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) return alert('出荷数を入力してください');

    const formattedDate = formatDateForDB(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) return alert('日付はYYYYMMDD形式(8桁)で入力してください');

    if (confirm(`${items.length}品目の出荷を登録しますか？\n出荷日: ${formattedDate}`)) {
      setIsSubmitting(true);
      const res = await registerShipment({
        partnerId,
        shipmentDate: formattedDate,
        items,
      });

      if (res.success) {
        alert(res.message);
        setInputs({});
        // 履歴更新
        const hData = await getRecentShipments(partnerId);
        setHistory(hData || []);
        // 在庫更新反映のためリロード推奨だが、簡易的に入力をクリア
      } else {
        alert(res.message);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-4">
        <h3 className="font-bold text-gray-700 border-l-4 border-green-500 pl-3">
          出荷データの登録
        </h3>

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

        <InventoryTable
          products={products}
          placeholder="製品名、品番、色で検索..."
          renderRow={(p) => (
            <tr key={p.id} className={inputs[p.id] ? 'bg-green-50' : 'hover:bg-gray-50'}>
              <td className="px-4 py-3 text-sm font-mono text-gray-600">
                {p.product_code}
              </td>
              <td className="px-4 py-3 text-sm font-bold text-gray-800">
                {p.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {p.color_text}
                <div className="text-xs text-green-600 mt-1">
                  完成在庫: <span className="font-bold">{p.stock_finished.toLocaleString()}</span>
                </div>
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  className="w-full border p-1 rounded text-right font-bold focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="0"
                  value={inputs[p.id] || ''}
                  onChange={(e) => handleChange(p.id, e.target.value)}
                />
              </td>
            </tr>
          )}
        />

        <div className="pt-4 text-right">
          <button
            onClick={handleRegister}
            disabled={isSubmitting}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-green-700 disabled:opacity-50"
          >
            出荷登録する
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
  const [inputs, setInputs] = useState<
    Record<number, { rework: string; return: string }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    id: number,
    field: 'rework' | 'return',
    value: string
  ) => {
    setInputs((prev) => {
      const current = prev[id] || { rework: '', return: '' };
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  };

  const handleRegister = async (p: DefectiveProduct) => {
    const inp = inputs[p.id] || { rework: '0', return: '0' };
    const rework = Number(inp.rework || 0);
    const ret = Number(inp.return || 0);

    if (rework + ret === 0) return alert('数量を入力してください');
    if (
      confirm(
        `処理を実行しますか？\n\n・手直し良品化: ${rework}個\n・不良品返却: ${ret}個`
      )
    ) {
      setIsSubmitting(true);
      const res = await registerDefectiveProcessing({
        productId: p.id,
        reworkQty: rework,
        returnQty: ret,
      });
      alert(res.message);
      if (res.success)
        setInputs((prev) => ({ ...prev, [p.id]: { rework: '', return: '' } }));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-700 border-l-4 border-red-500 pl-3">
        不良在庫の処理
      </h3>
      <p className="text-sm text-gray-500">
        発生した不良品について、「手直しして良品にする」か「客先へ返却(廃棄)する」かを登録します。
      </p>

      <InventoryTable
        products={products}
        placeholder="製品名、品番、色で検索..."
        renderRow={(p) => (
          <tr key={p.id} className="hover:bg-red-50">
            <td className="px-4 py-3 text-sm font-mono text-gray-600">{p.product_code}</td>
            <td className="px-4 py-3 text-sm font-bold text-gray-800">{p.name}</td>
            <td className="px-4 py-3 text-sm text-gray-500">
              {p.color_text}
              <div className="text-xs text-red-600 mt-1">
                不良在庫: <span className="font-bold">{p.stock_defective.toLocaleString()}</span>
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold w-16 text-blue-600">手直しOK</span>
                  <input
                    type="number"
                    placeholder="良品へ"
                    className="w-20 border p-1 rounded text-right text-sm"
                    value={inputs[p.id]?.rework || ''}
                    onChange={(e) => handleChange(p.id, 'rework', e.target.value)}
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold w-16 text-gray-500">返却/廃棄</span>
                  <input
                    type="number"
                    placeholder="在庫減"
                    className="w-20 border p-1 rounded text-right text-sm"
                    value={inputs[p.id]?.return || ''}
                    onChange={(e) => handleChange(p.id, 'return', e.target.value)}
                  />
                  <button
                    onClick={() => handleRegister(p)}
                    disabled={isSubmitting}
                    className="ml-2 bg-red-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-600 disabled:opacity-50"
                  >
                    処理登録
                  </button>
                </div>
              </div>
              {/* 直近の不良理由 */}
              {p.recent_defects.length > 0 && (
                <div className="mt-2 text-xs bg-white/50 p-2 rounded border border-red-100">
                  <p className="font-bold text-gray-500 mb-1">
                    最近の不良理由:
                  </p>
                  {p.recent_defects.map((d, i) => (
                    <span key={i} className="text-gray-600 block">
                      ・{d.reason} ({d.date})
                    </span>
                  ))}
                </div>
              )}
            </td>
          </tr>
        )}
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
