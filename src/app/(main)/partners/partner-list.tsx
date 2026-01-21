'use client'

import { useState, useMemo } from 'react'
import { updatePartners } from './actions'

// 修正: idの型を number -> string に変更
type PartnerData = {
  id: string 
  name: string
  code: string | null
  address: string | null
  phone: string | null
  memo: string | null
  created_at: string
}

export default function PartnerList({ initialPartners }: { initialPartners: PartnerData[] }) {
  const [isEditMode, setIsEditMode] = useState(false)
  // 修正: Mapのキーも number -> string に変更
  const [editedPartners, setEditedPartners] = useState<Map<string, PartnerData>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [keyword, setKeyword] = useState('')

  // フィルタリング
  const filteredData = useMemo(() => {
    let data = [...initialPartners]

    if (keyword) {
      const lower = keyword.toLowerCase()
      data = data.filter(p => 
        p.name.toLowerCase().includes(lower) ||
        (p.code && p.code.toLowerCase().includes(lower)) ||
        (p.address && p.address.toLowerCase().includes(lower))
      )
    }

    return data
  }, [initialPartners, keyword])

  // 編集ハンドラ
  // 修正: 引数のidも string に変更
  const handleEditChange = (id: string, field: keyof PartnerData, value: any) => {
    setEditedPartners(prev => {
      const newMap = new Map(prev)
      const currentEdit = newMap.get(id) || { ...initialPartners.find(p => p.id === id)! }
      
      newMap.set(id, { ...currentEdit, [field]: value })
      return newMap
    })
  }

  // 保存実行
  const handleSave = async () => {
    if (editedPartners.size === 0) return
    if (!confirm(`${editedPartners.size}件の変更を保存しますか？`)) return

    setIsSaving(true)
    const updates = Array.from(editedPartners.values())
    const result = await updatePartners(updates)
    
    if (result.success) {
      alert(result.message)
      setEditedPartners(new Map())
      setIsEditMode(false)
    } else {
      alert(result.message)
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">取引先マスタ</h1>
        
        <div className="flex items-center gap-4">
           {/* 編集モードスイッチ */}
           <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
             <span className={`text-xs font-bold ${isEditMode ? 'text-indigo-600' : 'text-gray-500'}`}>
               編集モード: {isEditMode ? 'ON' : 'OFF'}
             </span>
             <button
               onClick={() => {
                 setIsEditMode(!isEditMode)
                 if (isEditMode) setEditedPartners(new Map())
               }}
               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                 isEditMode ? 'bg-indigo-600' : 'bg-gray-300'
               }`}
             >
               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                   isEditMode ? 'translate-x-6' : 'translate-x-1'
                 }`}
               />
             </button>
          </div>
        </div>
      </div>

      {/* 検索バー */}
      <div className="flex justify-end">
        <input
          type="text"
          placeholder="取引先名、コード、住所で検索..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="block w-full sm:w-80 rounded-md border-gray-300 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      {/* テーブル */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow relative">
        {/* 保存ボタン (フロート) */}
        {isEditMode && editedPartners.size > 0 && (
          <div className="absolute bottom-4 right-4 z-10 animate-bounce">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-500"
            >
              {isSaving ? '保存中...' : `${editedPartners.size}件の変更を保存`}
            </button>
          </div>
        )}

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">取引先コード</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">取引先名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">住所</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">電話番号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備考</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredData.map((partner) => {
              // 修正: 型エラーにならないよう安全に比較
              const isEditingThisRow = editedPartners.has(partner.id)
              const displayData = isEditingThisRow ? editedPartners.get(partner.id)! : partner

              return (
                <tr key={partner.id} className={`hover:bg-gray-50 ${isEditingThisRow ? 'bg-indigo-50' : ''}`}>
                  <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                    {isEditMode ? (
                      <input
                        type="text"
                        className="w-full rounded-md border-gray-300 py-1 text-sm font-mono focus:border-indigo-500 focus:ring-indigo-500"
                        value={displayData.code || ''}
                        onChange={(e) => handleEditChange(partner.id, 'code', e.target.value)}
                        placeholder="コード入力"
                      />
                    ) : (
                       partner.code || <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                    {isEditMode ? (
                      <input
                        type="text"
                        className="w-full rounded-md border-gray-300 py-1 text-sm font-bold focus:border-indigo-500 focus:ring-indigo-500"
                        value={displayData.name}
                        onChange={(e) => handleEditChange(partner.id, 'name', e.target.value)}
                      />
                    ) : (
                       partner.name
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {isEditMode ? (
                      <input
                        type="text"
                        className="w-full rounded-md border-gray-300 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={displayData.address || ''}
                        onChange={(e) => handleEditChange(partner.id, 'address', e.target.value)}
                      />
                    ) : (
                       displayData.address
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {isEditMode ? (
                      <input
                        type="text"
                        className="w-full rounded-md border-gray-300 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={displayData.phone || ''}
                        onChange={(e) => handleEditChange(partner.id, 'phone', e.target.value)}
                      />
                    ) : (
                       displayData.phone
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {isEditMode ? (
                      <input
                        type="text"
                        className="w-full rounded-md border-gray-300 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={displayData.memo || ''}
                        onChange={(e) => handleEditChange(partner.id, 'memo', e.target.value)}
                      />
                    ) : (
                       displayData.memo
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {filteredData.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            データがありません
          </div>
        )}
      </div>
    </div>
  )
}