import { getInvoiceForPrint } from './actions';
import { notFound } from 'next/navigation';
import PrintButton from '@/app/(main)/shipments/[id]/print/print-button';

export default async function PrintInvoicePage({
    params,
}: {
    params: { id: string };
}) {
    const { id } = await params;
    const invoice = await getInvoiceForPrint(id);

    if (!invoice) return notFound();

    // 税抜合計、消費税、税込合計
    const subtotal = invoice.subtotal;
    const taxAmount = invoice.tax_amount;
    const totalAmount = invoice.total_amount;

    return (
        <div className="bg-white min-h-screen text-black p-8 md:p-12 print:p-0 print:text-sm">
            <PrintButton />

            {/* 請求書レイアウト (A4縦) - 納品書と同じデザインベース */}
            <div className="max-w-[210mm] mx-auto border border-gray-200 p-8 print:border-none print:p-0">
                {/* ヘッダー: 相手先左上、タイトル中央、当社右側 */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {/* 左: 相手先情報 */}
                    <div>
                        <h2 className="text-xl font-bold mb-1 border-b-2 border-black pb-1">
                            {invoice.partners?.name} 御中
                        </h2>
                        <p className="text-sm text-gray-500 mt-2">
                            下記の通りご請求申し上げます。
                        </p>
                    </div>

                    {/* 中央: タイトル */}
                    <div className="text-center">
                        <h1 className="text-3xl font-serif font-bold mb-2">請 求 書</h1>
                        <p className="text-sm text-gray-600">
                            No. {invoice.invoice_number || invoice.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600">
                            発行日: {new Date(invoice.issue_date).toLocaleDateString('ja-JP')}
                        </p>
                    </div>

                    {/* 右: 当社情報 */}
                    <div className="text-sm text-right leading-relaxed">
                        <p className="font-bold text-lg mb-1">大津電機工業株式会社</p>
                        <p>〒520-0000</p>
                        <p>滋賀県大津市〇〇町1-1-1</p>
                        <p>TEL: 077-000-0000</p>
                    </div>
                </div>

                {/* 請求期間と合計金額 */}
                <div className="flex justify-between items-center mb-6 border-t border-b border-gray-400 py-3">
                    <div>
                        <span className="text-sm text-gray-500">請求対象期間</span>
                        <span className="ml-4 font-bold">
                            {new Date(invoice.period_start).toLocaleDateString('ja-JP')} 〜{' '}
                            {new Date(invoice.period_end).toLocaleDateString('ja-JP')}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-sm text-gray-500 mr-4">ご請求金額（税込）</span>
                        <span className="font-bold text-2xl">¥ {totalAmount.toLocaleString()}</span>
                    </div>
                </div>

                {/* 明細テーブル - 出荷ごとにグループ化 */}
                <table className="w-full text-sm border-collapse mb-6">
                    <thead>
                        <tr className="bg-gray-100 border-t border-b border-gray-800">
                            <th className="py-2 px-2 text-left w-24">納品日</th>
                            <th className="py-2 px-2 text-left w-20">納品No.</th>
                            <th className="py-2 px-2 text-left">品名 / 型番 / 色</th>
                            <th className="py-2 px-2 text-right w-20">数量</th>
                            <th className="py-2 px-2 text-right w-24">単価</th>
                            <th className="py-2 px-2 text-right w-28">金額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {invoice.shipments.flatMap((shipment: any) =>
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            shipment.shipment_items.map((item: any, itemIndex: number) => (
                                <tr key={item.id} className="border-b border-gray-300">
                                    <td className="py-2 px-2 text-sm text-gray-600">
                                        {itemIndex === 0
                                            ? new Date(shipment.shipment_date).toLocaleDateString('ja-JP', {
                                                month: 'numeric',
                                                day: 'numeric',
                                            })
                                            : ''}
                                    </td>
                                    <td className="py-2 px-2 text-xs font-mono text-gray-500">
                                        {itemIndex === 0
                                            ? (shipment.delivery_note_number || shipment.id.slice(0, 6).toUpperCase())
                                            : ''}
                                    </td>
                                    <td className="py-2 px-2">
                                        <div className="font-bold text-gray-800">{item.products?.name}</div>
                                        <div className="text-xs text-gray-500">
                                            {item.products?.product_code}
                                            {item.products?.color_text && ` / ${item.products?.color_text}`}
                                        </div>
                                    </td>
                                    <td className="py-2 px-2 text-right">{item.quantity.toLocaleString()}</td>
                                    <td className="py-2 px-2 text-right">@{item.unit_price.toLocaleString()}</td>
                                    <td className="py-2 px-2 text-right font-bold">¥ {item.line_total.toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* 合計欄 */}
                <div className="flex justify-end">
                    <table className="text-sm border-collapse">
                        <tbody>
                            <tr>
                                <td className="py-2 px-4 text-right text-gray-600">小計（税抜）</td>
                                <td className="py-2 px-4 text-right font-bold w-32">¥ {subtotal.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-4 text-right text-gray-600">消費税 (10%)</td>
                                <td className="py-2 px-4 text-right w-32">¥ {taxAmount.toLocaleString()}</td>
                            </tr>
                            <tr className="border-t-2 border-gray-800">
                                <td className="py-3 px-4 text-right font-bold text-lg">合計（税込）</td>
                                <td className="py-3 px-4 text-right font-bold text-xl text-blue-700 w-32">
                                    ¥ {totalAmount.toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* お振込先情報 */}
                <div className="mt-8 border border-gray-400 rounded p-4">
                    <p className="text-xs text-gray-500 mb-2">【お振込先】</p>
                    <p className="text-sm">滋賀銀行 大津支店 普通 1234567</p>
                    <p className="text-sm">口座名義: オオツデンキコウギョウ（カ</p>
                    <p className="text-xs text-gray-500 mt-2">
                        ※ お支払期限: {new Date(invoice.period_end).getMonth() === 11
                            ? `${new Date(invoice.period_end).getFullYear() + 1}年1月末日`
                            : `${new Date(invoice.period_end).getFullYear()}年${new Date(invoice.period_end).getMonth() + 2}月末日`
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}
