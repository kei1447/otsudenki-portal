'use client';

import { useState } from 'react';
import { getUnbilledSummary, type InvoiceCandidate } from '../actions';
import Link from 'next/link';

export default function CreateInvoicePage() {
  const [closingDate, setClosingDate] = useState(99);
  const [targetMonth, setTargetMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [candidates, setCandidates] = useState<InvoiceCandidate[]>([]);
  const [isSearched, setIsSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getPeriod = () => {
    const [year, month] = targetMonth.split('-').map(Number);
    if (closingDate === 99) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { start, end };
    } else {
      const start = new Date(year, month - 2, closingDate + 1);
      const end = new Date(year, month - 1, closingDate);
      return { start, end };
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    const { start, end } = getPeriod();
    const fmt = (d: Date) => d.toLocaleDateString('en-CA');
    const data = await getUnbilledSummary(closingDate, fmt(start), fmt(end));
    setCandidates(data);
    setIsSearched(true);
    setIsLoading(false);
  };

  const { start, end } = getPeriod();
  const startStr = start.toLocaleDateString('en-CA');
  const endStr = end.toLocaleDateString('en-CA');
  const periodLabel = `${start.toLocaleDateString()} ～ ${end.toLocaleDateString()}`;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          請求書 作成 (対象選択)
        </h1>
        <Link
          href="/invoices"
          className="text-sm text-gray-500 hover:text-gray-800 underline"
        >
          ← 請求書一覧に戻る
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              対象月
            </label>
            <input
              type="month"
              className="border rounded px-3 py-2"
              value={targetMonth}
              onChange={(e) => {
                setTargetMonth(e.target.value);
                setIsSearched(false);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              締め日グループ
            </label>
            <select
              className="border rounded px-3 py-2 w-40"
              value={closingDate}
              onChange={(e) => {
                setClosingDate(Number(e.target.value));
                setIsSearched(false);
              }}
            >
              <option value={99}>末締め</option>
              <option value={20}>20日締め</option>
              <option value={15}>15日締め</option>
              <option value={10}>10日締め</option>
            </select>
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            検索
          </button>
        </div>
        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
          <span className="font-bold">集計期間:</span> {periodLabel}
        </div>
      </div>

      {isSearched && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {candidates.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              対象となる未請求データはありません
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                    取引先
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">
                    納品回数
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">
                    税抜概算
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {candidates.map((c) => (
                  <tr key={c.partner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-800">
                      {c.partner.name}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {c.shipment_count} 回
                    </td>
                    <td className="px-6 py-4 text-right">
                      ¥ {c.total_amount_excl_tax.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/invoices/create/${c.partner.id}?start=${startStr}&end=${endStr}`}
                        className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-indigo-500 inline-block shadow-sm"
                      >
                        内容確認へ →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
