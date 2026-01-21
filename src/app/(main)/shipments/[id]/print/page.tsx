// import { createClient } from '@/utils/supabase/server';
import { getShipmentForPrint } from '@/app/(main)/inventory/actions';
import { notFound } from 'next/navigation';
import PrintButton from './print-button'; // ★作成した部品をインポート

export default async function PrintShipmentPage({
  params,
}: {
  params: { id: string };
}) {
  // パラメータ取得の非同期対応
  const { id } = await params;
  const shipment = await getShipmentForPrint(id);

  if (!shipment) return notFound();

  const subTotal = shipment.total_amount;
  const tax = Math.floor(subTotal * 0.1); // 消費税10%
  const total = subTotal + tax;

  return (
    <div className="bg-white min-h-screen text-black p-8 md:p-12 print:p-0 print:text-sm">
      {/* ★修正: クライアントコンポーネント（ボタン）を配置 */}
      <PrintButton />

      {/* 納品書レイアウト (A4縦) */}
      <div className="max-w-[210mm] mx-auto border border-gray-200 p-8 print:border-none print:p-0">
        {/* ヘッダー */}
        <div className="flex justify-between items-end border-b-2 border-gray-800 pb-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">納 品 書</h1>
            <p className="text-sm text-gray-600">
              No.{' '}
              {shipment.delivery_note_number ||
                shipment.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-sm text-gray-600">
              発行日: {new Date().toLocaleDateString('ja-JP')}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold mb-1">
              {shipment.partners?.name} 御中
            </h2>
            <p className="text-sm text-gray-500">
              下記の通り納品いたしました。
            </p>
          </div>
        </div>

        {/* 自社情報 & 合計金額 */}
        <div className="flex justify-between mb-8">
          <div className="w-1/2">
            <div className="border-b border-gray-400 mb-2 pb-1">
              <span className="text-sm text-gray-500">納品日</span>
              <span className="ml-4 font-bold text-lg">
                {new Date(shipment.shipment_date).toLocaleDateString('ja-JP')}
              </span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between border-b border-gray-300 py-1">
                <span>税抜合計</span>
                <span>¥ {subTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-300 py-1">
                <span>消費税 (10%)</span>
                <span>¥ {tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b-2 border-black py-1 mt-1 font-bold text-xl">
                <span>ご請求金額</span>
                <span>¥ {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="w-1/3 text-sm text-right leading-relaxed">
            <p className="font-bold text-lg mb-1">大津電機工業株式会社</p>
            <p>〒520-0000</p>
            <p>滋賀県大津市〇〇町1-1-1</p>
            <p>TEL: 077-000-0000</p>
            <p>担当: {shipment.created_by?.email || '営業部'}</p>
          </div>
        </div>

        {/* 明細テーブル */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 border-t border-b border-gray-800">
              <th className="py-2 px-2 text-left w-12">No.</th>
              <th className="py-2 px-2 text-left">品名 / 型番 / 色</th>
              <th className="py-2 px-2 text-right w-24">数量</th>
              <th className="py-2 px-2 text-right w-24">単価</th>
              <th className="py-2 px-2 text-right w-28">金額</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {shipment.items.map((item: any, index: number) => (
              <tr key={item.id} className="border-b border-gray-300">
                <td className="py-3 px-2 text-center">{index + 1}</td>
                <td className="py-3 px-2">
                  <div className="font-bold text-gray-800">
                    {item.products?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.products?.product_code} {item.products?.color}
                  </div>
                </td>
                <td className="py-3 px-2 text-right">
                  {item.quantity.toLocaleString()}
                </td>
                <td className="py-3 px-2 text-right">
                  @{item.unit_price.toLocaleString()}
                </td>
                <td className="py-3 px-2 text-right font-bold">
                  ¥ {item.line_total.toLocaleString()}
                </td>
              </tr>
            ))}
            {/* 空行埋め */}
            {Array.from({
              length: Math.max(0, 10 - shipment.items.length),
            }).map((_, i) => (
              <tr key={`empty-${i}`} className="border-b border-gray-200 h-12">
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 備考欄 */}
        <div className="mt-8 border border-gray-400 rounded p-4 h-32">
          <p className="text-xs text-gray-500 mb-1">備考</p>
          <p className="text-sm"></p>
        </div>
      </div>
    </div>
  );
}
