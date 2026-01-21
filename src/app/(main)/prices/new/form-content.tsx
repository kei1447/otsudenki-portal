'use client'

import { useActionState } from 'react'
import { createPrice } from './actions'
import Link from 'next/link'

// 修正: DBのカラム名に合わせる
type Product = {
  id: number
  name: string
  product_code: string // 修正
  color: string | null // 修正
  partners: { name: string } | null
}

export default function FormContent({ products }: { products: Product[] }) {
  const [state, formAction, isPending] = useActionState(createPrice, { error: null })

  return (
    <form action={formAction} className="space-y-6">
      {/* 1. 製品選択 */}
      <div>
        <label htmlFor="product_id" className="block text-sm font-medium text-gray-700">
          対象製品 <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <select
            id="product_id"
            name="product_id"
            required
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            defaultValue=""
          >
            <option value="" disabled>選択してください</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {/* 表示形式: [取引先] 型番 / 品名 (色) */}
                [{p.partners?.name}] {p.product_code || '(型番なし)'} / {p.name} {p.color ? `(${p.color})` : ''}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          取引先・型番順に並んでいます
        </p>
      </div>

      {/* 2. 単価 */}
      <div>
        <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700">
          新単価 (円) <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <input
            type="number"
            name="unit_price"
            id="unit_price"
            required
            min="0"
            className="block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="例: 1500"
          />
        </div>
      </div>

      {/* 3. 適用開始日 */}
      <div>
        <label htmlFor="valid_from" className="block text-sm font-medium text-gray-700">
          適用開始日 <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <input
            type="date"
            name="valid_from"
            id="valid_from"
            required
            className="block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      {/* 4. 理由 */}
      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
          改定・設定理由
        </label>
        <div className="mt-1">
          <textarea
            id="reason"
            name="reason"
            rows={3}
            className="block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="例: 原材料費高騰のため、2026年度価格改定"
          />
        </div>
      </div>

      {/* エラーメッセージ */}
      {state?.error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{state.error}</p>
        </div>
      )}

      {/* ボタン */}
      <div className="flex justify-end gap-3 pt-4">
        <Link
          href="/prices"
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className={`rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
            isPending ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isPending ? '登録中...' : '登録する'}
        </button>
      </div>
    </form>
  )
}