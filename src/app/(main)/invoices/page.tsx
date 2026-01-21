'use client'

import { useState, useEffect } from 'react'
import { getInvoices } from './actions'
import Link from 'next/link'

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const data = await getInvoices()
      setInvoices(data || [])
      setIsLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">請求書管理</h1>
        <Link 
          href="/invoices/create" 
          className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-500 font-bold flex items-center gap-2"
        >
          ＋ 一括作成
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">読み込み中...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            請求書データがありません。<br/>
            右上の「一括作成」から作成してください。
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500">発行日</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500">取引先</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500">対象期間</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500">請求金額(税込)</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(inv.issue_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">{inv.partners?.name}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(inv.period_start).toLocaleDateString()} ～ {new Date(inv.period_end).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-right">¥ {inv.total_amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs text-gray-400">PDF準備中</span>
                    {/* ここに将来 /invoices/[id]/print へのリンクを追加 */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}