'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { getUnbilledShipments, createSingleInvoice } from '../../actions';
import Link from 'next/link';

export default function ConfirmInvoicePage() {
  const params = useParams();
  const partnerId = params.partnerId as string;

  const router = useRouter();
  const searchParams = useSearchParams();
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [shipments, setShipments] = useState<any[]>([]);
  const [partnerName, setPartnerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!partnerId || !start || !end) return;
    const load = async () => {
      setIsLoading(true);
      const data = await getUnbilledShipments(partnerId, start, end);
      setShipments(data || []);
      if (data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = data[0].partners as any;
        const name = Array.isArray(p) ? p[0]?.name : p?.name;
        setPartnerName(name || '');
      }
      setIsLoading(false);
    };
    load();
  }, [partnerId, start, end]);

  const totalExclTax = shipments.reduce((sum, s) => sum + s.total_amount, 0);
  const tax = Math.floor(totalExclTax * 0.1);
  const totalAmount = totalExclTax + tax;

  const handleConfirm = async () => {
    if (!confirm(`${partnerName} 宛の請求書を確定しますか？`)) return;
    setIsSubmitting(true);
    const res = await createSingleInvoice(partnerId, start, end, totalExclTax);
    if (res.success) {
      alert(res.message);
      router.push('/invoices');
    } else {
      alert(res.message);
      setIsSubmitting(false);
    }
  };

  if (isLoading)
    return (
      <div className="p-12 text-center text-gray-500">
        データを読み込み中...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">請求内容の確認</h1>
          <p className="text-sm text-gray-500 mt-1">
            取引先:{' '}
            <span className="font-bold text-lg text-black">{partnerName}</span>
          </p>
          <p className="text-sm text-gray-500">
            対象期間: {start} ～ {end}
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/invoices/create"
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
          >
            キャンセル
          </Link>
          {shipments.length > 0 && (
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded shadow hover:bg-indigo-500 disabled:opacity-50"
            >
              確定して発行
            </button>
          )}
        </div>
      </div>
      {shipments.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded text-gray-500">
          対象データがありません
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-bold text-gray-700">
              納品明細 ({shipments.length}件)
            </h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {shipments.map((ship) => (
                <div
                  key={ship.id}
                  className="border-b border-gray-200 last:border-b-0 bg-white"
                >
                  <div className="bg-gray-50 px-4 py-2 flex justify-between items-center text-sm">
                    <div className="font-bold text-gray-700">
                      {new Date(ship.shipment_date).toLocaleDateString()}{' '}
                      <span className="ml-2 font-mono text-gray-500">
                        No.{ship.delivery_note_number || ship.id.slice(0, 6)}
                      </span>
                    </div>
                    <div className="font-bold text-gray-800">
                      小計: ¥{ship.total_amount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b">
                          <th className="text-left py-1">品名 / 型番</th>
                          <th className="text-right py-1 w-20">数量</th>
                          <th className="text-right py-1 w-24">単価</th>
                          <th className="text-right py-1 w-24">金額</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {ship.shipment_items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="py-2 pr-2">
                              <div className="text-gray-800">
                                {item.products?.name}
                              </div>
                            </td>
                            <td className="py-2 text-right">
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className="py-2 text-right">
                              @{item.unit_price.toLocaleString()}
                            </td>
                            <td className="py-2 text-right text-gray-700">
                              ¥{item.line_total.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm sticky top-6">
              <h2 className="font-bold text-xl text-gray-800 mb-6 border-b pb-2">
                請求金額 合計
              </h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>税抜合計</span>
                  <span className="font-bold">
                    ¥ {totalExclTax.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>消費税 (10%)</span>
                  <span className="font-bold">¥ {tax.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex justify-between items-center border-t-2 border-gray-800 pt-4 mb-8">
                <span className="font-bold text-lg">ご請求額</span>
                <span className="font-bold text-2xl text-indigo-700">
                  ¥ {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
