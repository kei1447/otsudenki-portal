'use client' // ★これが重要：クライアント側で動く宣言

import { useEffect } from 'react'

export default function PrintButton() {
  // 画面が開いたら自動で印刷ダイアログを出す
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print()
    }, 500) // 描画待ちで少し遅らせる
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="mb-8 flex justify-between items-center print:hidden">
      <a href="/inventory" className="text-blue-600 hover:underline">← 業務管理に戻る</a>
      <button 
        onClick={() => window.print()}
        className="bg-blue-600 text-white px-6 py-2 rounded font-bold shadow hover:bg-blue-700"
      >
        このページを印刷する
      </button>
    </div>
  )
}