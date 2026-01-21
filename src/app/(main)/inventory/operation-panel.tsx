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
  getDefectiveProductsByPartner,
  getRecentShipments,
  getProductsByPartner,
} from './actions';

// 型定義
type RawProduct = Awaited<
  ReturnType<typeof getRawStockProductsByPartner>
>[number];
type DefectiveProduct = Awaited<
  ReturnType<typeof getDefectiveProductsByPartner>
>[number];

export default function OperationPanel({
  partnerId,
  rawProducts,
  defectiveProducts,
}: {
  partnerId: string;
  rawProducts: RawProduct[];
  defectiveProducts: DefectiveProduct[];
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
        {activeTab === 'receiving' && <ReceivingTab products={rawProducts} />}
        {activeTab === 'production' && <ProductionTab products={rawProducts} />}
        {activeTab === 'shipment' && <ShipmentTab partnerId={partnerId} />}
        {activeTab === 'defective' && (
          <DefectiveTab products={defectiveProducts} />
        )}
        {activeTab === 'history' && <HistoryTable />}
      </div>
    </div>
  );
}

// ============================================================================
// 1. 受入登録タブ
// ============================================================================
function ReceivingTab({ products }: { products: RawProduct[] }) {
  const [inputs, setInputs] = useState<
    Record<number, { qty: string; date: string }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (id: number, field: 'qty' | 'date', value: string) => {
    setInputs((prev) => {
      // ★修正: 二重定義エラー回避のため、初期値を外に出す
      const current = prev[id] || { qty: '', date: '' };
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  };

  const handleRegister = async (p: RawProduct) => {
    const input = inputs[p.id];
    if (!input?.qty) return alert('数量を入力してください');
    if (confirm(`${p.name} を ${input.qty}個 受入登録しますか？`)) {
      setIsSubmitting(true);
      const res = await registerReceiving({
        productId: p.id,
        quantity: Number(input.qty),
        dueDate: input.date || '', // 納期は任意
      });
      alert(res.message);
      if (res.success)
        setInputs((prev) => ({ ...prev, [p.id]: { qty: '', date: '' } }));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-700 border-l-4 border-yellow-400 pl-3">
        生地・部材の受入
      </h3>
      {products.length === 0 ? (
        <p className="text-gray-400 py-4">対象製品がありません</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="border p-4 rounded bg-gray-50 hover:bg-white transition-colors"
            >
              <div className="font-bold text-lg mb-1">{p.name}</div>
              <div className="text-xs text-gray-500 mb-2">
                {p.product_code} {p.color_text}
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span>
                  現在庫:{' '}
                  <span className="font-bold">
                    {p.stock_raw.toLocaleString()}
                  </span>
                </span>
              </div>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="受入数量"
                  className="w-full border p-2 rounded"
                  value={inputs[p.id]?.qty || ''}
                  onChange={(e) => handleChange(p.id, 'qty', e.target.value)}
                />
                <input
                  type="date"
                  className="w-full border p-2 rounded text-sm text-gray-500"
                  value={inputs[p.id]?.date || ''}
                  onChange={(e) => handleChange(p.id, 'date', e.target.value)}
                />
                <button
                  onClick={() => handleRegister(p)}
                  disabled={isSubmitting}
                  className="w-full bg-yellow-500 text-white font-bold py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
                >
                  受入登録
                </button>
              </div>
              {/* 直近の入荷履歴を表示 */}
              {p.arrivals && p.arrivals.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-bold text-gray-400 mb-1">
                    直近の入荷
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {p.arrivals.map((log, i) => (
                      <li key={i}>・{log.label}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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

function ProductionTab({ products }: { products: RawProduct[] }) {
  const [inputs, setInputs] = useState<Record<number, ProdInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (id: number, field: keyof ProdInput, value: string) => {
    setInputs((prev) => {
      // ★修正: 初期値を外に出してスッキリさせる
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
      // 不良数の合計を計算して defective にセット
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

  const handleRegister = async (p: RawProduct) => {
    const inp = inputs[p.id] || {};
    const finished = Number(inp.finished || 0);
    const defective = Number(inp.defective || 0);
    const rawUsed = Number(inp.rawUsed) || finished + defective; // 入力なければ自動計算

    if (finished + defective === 0)
      return alert('完成数または不良数を入力してください');

    // 不良理由のテキスト化
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
        setInputs((prev) => ({
          ...prev,
          [p.id]: {
            finished: '',
            rawUsed: '',
            defective: '',
            defects: {},
            sourceDate: '',
          },
        }));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-700 border-l-4 border-blue-500 pl-3">
        加工実績の登録
      </h3>
      {products.length === 0 ? (
        <p className="text-gray-400 py-4">対象製品がありません</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const inp = inputs[p.id] || {};
            return (
              <div
                key={p.id}
                className="border p-4 rounded bg-gray-50 hover:bg-white transition-colors relative"
              >
                <div className="font-bold text-lg mb-1">{p.name}</div>
                <div className="text-xs text-gray-500 mb-3">
                  {p.product_code} {p.color_text}
                </div>

                {/* 入荷日選択プルダウン */}
                {p.arrivals && p.arrivals.length > 0 && (
                  <div className="mb-3">
                    <select
                      className="w-full text-xs border rounded p-1 bg-white text-gray-700"
                      value={inp.sourceDate || ''}
                      onChange={(e) =>
                        handleChange(p.id, 'sourceDate', e.target.value)
                      }
                    >
                      <option value="">いつの入荷分を使用？ (指定なし)</option>
                      {p.arrivals.map((a, idx) => (
                        <option key={idx} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold w-12 text-blue-600">
                      完成
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      className="flex-1 border p-2 rounded font-bold"
                      value={inp.finished || ''}
                      onChange={(e) =>
                        handleChange(p.id, 'finished', e.target.value)
                      }
                    />
                  </div>

                  {/* 不良入力コンポーネント */}
                  <DefectInputRow
                    productId={p.id}
                    currentDefects={inp.defects || {}}
                    onSave={handleDefectsSave}
                  />

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <span className="text-xs font-bold w-12 text-gray-500">
                      消費
                    </span>
                    <input
                      type="number"
                      placeholder="自動"
                      className="flex-1 border p-1 rounded text-sm bg-gray-100"
                      value={inp.rawUsed || ''}
                      onChange={(e) =>
                        handleChange(p.id, 'rawUsed', e.target.value)
                      }
                    />
                  </div>

                  <button
                    onClick={() => handleRegister(p)}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 disabled:opacity-50 mt-2"
                  >
                    実績登録
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
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

  // 不良理由マスタ
  const reasons = ['打痕', '塗装不良', 'メッキ不良', '寸法NG', 'その他'];

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
        <span className="text-sm font-bold w-12 text-red-500">不良</span>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 border p-2 rounded bg-red-50 text-red-600 cursor-pointer flex justify-between items-center hover:bg-red-100"
        >
          <span className="font-bold">{total > 0 ? total : ''}</span>
          <span className="text-xs">▼ 詳細</span>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-10 w-64 bg-white border border-gray-300 shadow-xl rounded-lg p-3 mt-1">
          <div className="flex justify-between items-center mb-2 pb-2 border-b">
            <span className="font-bold text-sm text-gray-700">不良内訳</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {reasons.map((r) => (
              <div key={r} className="flex items-center justify-between">
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
      )}
    </div>
  );
}

// ============================================================================
// 3. 出荷登録タブ
// ============================================================================
function ShipmentTab({ partnerId }: { partnerId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([]);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [history, setHistory] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初期ロード
  useEffect(() => {
    const load = async () => {
      const [pData, hData] = await Promise.all([
        getProductsByPartner(partnerId),
        getRecentShipments(partnerId),
      ]);
      setProducts(pData || []);
      setHistory(hData || []);
    };
    load();
  }, [partnerId]);

  const handleChange = (id: number, val: string) => {
    setInputs((prev) => ({ ...prev, [id]: val }));
  };

  const handleRegister = async () => {
    const items = Object.entries(inputs)
      .map(([pid, qty]) => ({ productId: Number(pid), quantity: Number(qty) }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) return alert('出荷数を入力してください');

    if (confirm(`${items.length}品目の出荷を登録しますか？\n出荷日: ${date}`)) {
      setIsSubmitting(true);
      const res = await registerShipment({
        partnerId,
        shipmentDate: date,
        items,
      });

      if (res.success) {
        alert(res.message);
        setInputs({});
        // 履歴更新
        const hData = await getRecentShipments(partnerId);
        setHistory(hData || []);
      } else {
        alert(res.message);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-4">
        <h3 className="font-bold text-gray-700 border-l-4 border-green-500 pl-3">
          出荷データの登録
        </h3>

        <div className="bg-gray-50 p-4 rounded flex items-center gap-4">
          <label className="font-bold text-gray-700">出荷日:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 rounded"
          />
        </div>

        {products.length === 0 ? (
          <p className="text-gray-400">登録された製品がありません</p>
        ) : (
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">
                    製品コード
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">
                    製品名
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">
                    色
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 w-32">
                    出荷数量
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((p) => (
                  <tr key={p.id} className={inputs[p.id] ? 'bg-green-50' : ''}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {p.product_code}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {p.color}
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
                ))}
              </tbody>
            </table>
          </div>
        )}

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
      <div className="w-64 flex-shrink-0 border-l pl-6 hidden lg:block">
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
      // ★修正: 初期値を外に出す
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

      {products.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded text-gray-400">
          現在、不良在庫はありません
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="border p-4 rounded bg-red-50 border-red-100"
            >
              <div className="font-bold text-lg text-gray-800">{p.name}</div>
              <div className="text-xs text-gray-500 mb-2">{p.product_code}</div>
              <div className="mb-4 text-center bg-white rounded p-2 border border-red-200">
                <span className="text-xs text-gray-500 block">不良在庫</span>
                <span className="text-xl font-bold text-red-600">
                  {p.stock_defective}
                </span>
              </div>

              {/* 直近の不良理由 */}
              {p.recent_defects.length > 0 && (
                <div className="mb-3 text-xs bg-white/50 p-2 rounded">
                  <p className="font-bold text-gray-500 mb-1">
                    最近の不良理由:
                  </p>
                  {p.recent_defects.map((d, i) => (
                    <div key={i} className="text-gray-600">
                      ・{d.reason} ({d.date})
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold w-16 text-blue-600">
                    手直しOK
                  </span>
                  <input
                    type="number"
                    placeholder="良品へ"
                    className="flex-1 border p-1 rounded"
                    value={inputs[p.id]?.rework || ''}
                    onChange={(e) =>
                      handleChange(p.id, 'rework', e.target.value)
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold w-16 text-gray-500">
                    返却/廃棄
                  </span>
                  <input
                    type="number"
                    placeholder="在庫減"
                    className="flex-1 border p-1 rounded"
                    value={inputs[p.id]?.return || ''}
                    onChange={(e) =>
                      handleChange(p.id, 'return', e.target.value)
                    }
                  />
                </div>
                <button
                  onClick={() => handleRegister(p)}
                  disabled={isSubmitting}
                  className="w-full bg-red-500 text-white font-bold py-2 rounded hover:bg-red-600 disabled:opacity-50 text-sm"
                >
                  処理登録
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
