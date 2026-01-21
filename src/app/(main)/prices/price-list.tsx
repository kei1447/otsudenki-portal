'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Partner } from '@/types/models';

// 型定義
type Price = {
  id: string;
  unit_price: number;
  valid_from: string;
  reason: string | null;
  status: string;
};

type ProductWithPrices = {
  id: number;
  name: string;
  product_code: string;
  color: string | null;
  is_discontinued: boolean;
  partners: { name: string } | null;
  prices: Price[];
};

export default function PriceMatrix({
  products,
  masterPartners,
  userRole,
}: {
  products: ProductWithPrices[];
  masterPartners: Partner[];
  userRole: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const canEdit = userRole === 'admin' || userRole === 'manager';

  // --- URLパラメータ ---
  const initialPartner = searchParams.get('partner') || '';
  const initialKeyword = searchParams.get('q') || '';
  const initialShowDiscontinued =
    searchParams.get('show_discontinued') === 'true';

  // --- State ---
  const [selectedPartner, setSelectedPartner] = useState(initialPartner);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [showDiscontinued, setShowDiscontinued] = useState(
    initialShowDiscontinued
  );

  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // --- 検索実行 (URL書き換え) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (selectedPartner) params.set('partner', selectedPartner);
      if (keyword) params.set('q', keyword);
      if (showDiscontinued) params.set('show_discontinued', 'true');

      const currentQuery = searchParams.toString();
      const newQuery = params.toString();
      if (currentQuery !== newQuery) {
        router.replace(`/prices?${newQuery}`, { scroll: false });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedPartner, keyword, showDiscontinued, router, searchParams]);

  // --- データ加工 ---
  const matrixData = useMemo(() => {
    return products.map((product) => {
      const sortedPrices = [...(product.prices || [])].sort(
        (a, b) =>
          new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
      );

      const futurePrices = sortedPrices.filter((p) => p.valid_from > today);
      const nextPrice =
        futurePrices.length > 0 ? futurePrices[futurePrices.length - 1] : null;

      const currentPrice = sortedPrices.find((p) => p.valid_from <= today);

      let prevPrice = null;
      if (currentPrice) {
        const currentIndex = sortedPrices.indexOf(currentPrice);
        if (currentIndex + 1 < sortedPrices.length) {
          prevPrice = sortedPrices[currentIndex + 1];
        }
      }

      return {
        ...product,
        prevPrice,
        currentPrice,
        nextPrice,
        allPrices: sortedPrices,
      };
    });
  }, [products, today]);

  // --- フォーマットヘルパー ---
  const formatPrice = (p?: Price | null) => {
    if (!p) return <span className="text-gray-300">-</span>;
    return (
      <div className="flex flex-col items-end">
        <span className="font-bold">¥{p.unit_price.toLocaleString()}</span>
        <span className="text-[10px] text-gray-500">{p.valid_from} ~</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          製品単価リスト (マトリクス)
          <span className="ml-4 text-sm font-normal text-gray-500">
            {matrixData.length}件 表示
          </span>
        </h1>

        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Link
                href="/prices/bulk"
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                一括登録
              </Link>
              <Link
                href="/prices/new"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                新規登録
              </Link>
            </>
          )}
        </div>
      </div>

      {/* フィルターバー */}
      <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-md border border-gray-200 items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            取引先
          </label>
          <select
            value={selectedPartner}
            onChange={(e) => setSelectedPartner(e.target.value)}
            className="block w-full sm:w-48 rounded-md border-gray-300 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">すべて</option>
            {masterPartners.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto flex items-center pt-6">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDiscontinued}
              onChange={(e) => setShowDiscontinued(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            <span className="text-sm text-gray-700">廃盤製品も含める</span>
          </label>
        </div>
        <div className="w-full sm:w-auto flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            キーワード検索 (型番・品名・色・備考)
          </label>
          <input
            type="text"
            placeholder="入力して検索..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="block w-full rounded-md border-gray-300 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        {(selectedPartner || keyword || showDiscontinued) && (
          <button
            onClick={() => {
              setSelectedPartner('');
              setKeyword('');
              setShowDiscontinued(false);
            }}
            className="text-sm text-gray-500 hover:text-indigo-600 underline pb-2"
          >
            条件クリア
          </button>
        )}
      </div>

      {/* マトリクス・テーブル */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50 select-none border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状態
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                取引先
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                型番 / 色
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                品名
              </th>

              {/* ヘッダーの縦罫線を削除し、背景色のみで区分けして被りを解消 */}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-50">
                旧単価
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider bg-indigo-50">
                現行単価
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-blue-600 uppercase tracking-wider bg-blue-50">
                新単価(予定)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {matrixData.map((row) => {
              const isExpanded = expandedRowId === row.id;

              // ★修正: React.Fragmentにkeyを設定してエラーを解消
              return (
                <React.Fragment key={row.id}>
                  <tr
                    className={`hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                    onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                  >
                    <td className="px-4 py-4 text-center text-gray-400">
                      {isExpanded ? '▼' : '▶'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          row.is_discontinued
                            ? 'bg-gray-200 text-gray-600 ring-gray-500/20'
                            : 'bg-green-50 text-green-700 ring-green-600/20'
                        }`}
                      >
                        {row.is_discontinued ? '廃盤' : '稼働'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {row.partners?.name}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="font-mono text-gray-900">
                        {row.product_code}
                      </div>
                      <div className="text-gray-500 text-xs">{row.color}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {row.name}
                    </td>

                    {/* 単価カラム */}
                    <td className="px-4 py-4 text-sm text-gray-400 text-right border-l border-dashed border-gray-200">
                      {formatPrice(row.prevPrice)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-right bg-indigo-50/30 border-l border-r border-indigo-100 font-medium">
                      {formatPrice(row.currentPrice)}
                    </td>
                    <td className="px-4 py-4 text-sm text-blue-600 text-right bg-blue-50/30">
                      {formatPrice(row.nextPrice)}
                    </td>
                  </tr>

                  {/* 展開行：全履歴表示 */}
                  {isExpanded && (
                    <tr className="bg-gray-50">
                      <td
                        colSpan={8}
                        className="px-4 py-4 border-b border-gray-200 shadow-inner"
                      >
                        <div className="ml-10 bg-white rounded border border-gray-200 p-4">
                          <h4 className="text-sm font-bold text-gray-700 mb-2">
                            単価履歴一覧
                          </h4>
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-xs text-gray-500 border-b">
                                <th className="text-left py-2">適用開始日</th>
                                <th className="text-right py-2">単価</th>
                                <th className="text-left py-2 pl-4">理由</th>
                                <th className="text-right py-2">状態</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.allPrices.map((p) => {
                                const isCurrent = row.currentPrice?.id === p.id;
                                return (
                                  <tr
                                    key={p.id}
                                    className={`border-b border-gray-100 ${isCurrent ? 'bg-indigo-50 font-bold' : ''}`}
                                  >
                                    <td className="py-2">{p.valid_from} ~</td>
                                    <td className="py-2 text-right">
                                      ¥{p.unit_price.toLocaleString()}
                                    </td>
                                    <td className="py-2 pl-4 text-gray-600">
                                      {p.reason || '-'}
                                    </td>
                                    <td className="py-2 text-right">
                                      {isCurrent ? (
                                        <span className="text-indigo-600 text-xs">
                                          現行
                                        </span>
                                      ) : (
                                        ''
                                      )}
                                      {row.nextPrice?.id === p.id ? (
                                        <span className="text-blue-600 text-xs">
                                          予定
                                        </span>
                                      ) : (
                                        ''
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              {row.allPrices.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="py-2 text-center text-gray-400"
                                  >
                                    履歴なし
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>

                          {canEdit && (
                            <div className="mt-4 flex justify-end">
                              <span className="text-xs text-gray-400">
                                ※修正は「新規登録」または「一括登録」から行ってください
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {matrixData.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            データがありません
          </div>
        )}
      </div>
    </div>
  );
}
