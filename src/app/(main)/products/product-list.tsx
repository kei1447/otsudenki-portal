'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { updateProducts } from './actions'
import { Product, Partner } from '@/types/models'

// --- カラム設定用 ---
// 利用可能な全カラムの定義
const ALL_COLUMNS = [
  { key: 'status', label: '状態' },
  { key: 'partner', label: '取引先' },
  { key: 'product_code', label: '型番' },
  { key: 'name', label: '品名' },
  { key: 'color', label: '色' },
  { key: 'memo', label: '備考' },
  // 必要なら 'unit_weight', 'surface_area' なども追加可能
]

export default function ProductList({ 
  initialProducts, 
  masterPartners 
}: { 
  initialProducts: Product[], 
  masterPartners: Partner[] 
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // --- 状態管理 ---
  // 表示カラム設定 (初期値は全カラム)
  const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMNS)
  const [isConfigOpen, setIsConfigOpen] = useState(false) // 設定モーダルの開閉

  // 起動時にlocalStorageから設定を読み込む
  useEffect(() => {
    const savedConfig = localStorage.getItem('product-list-columns')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        // 保存されたキーをもとに、ALL_COLUMNSからオブジェクトを復元（ラベル情報などを維持するため）
        const restored = parsed.map((key: string) => ALL_COLUMNS.find(c => c.key === key)).filter(Boolean)
        if (restored.length > 0) setVisibleColumns(restored)
      } catch (e) {
        console.error('Failed to parse column config', e)
      }
    }
  }, [])

  // 設定を保存する
  const saveColumnConfig = (newColumns: typeof ALL_COLUMNS) => {
    setVisibleColumns(newColumns)
    localStorage.setItem('product-list-columns', JSON.stringify(newColumns.map(c => c.key)))
    setIsConfigOpen(false)
  }

  // --- (既存のState) ---
  const initialPartner = searchParams.get('partner') || ''
  const initialShowDiscontinued = searchParams.get('show_discontinued') === 'true'
  const initialKeyword = searchParams.get('q') || ''

  const [selectedPartner, setSelectedPartner] = useState(initialPartner)
  const [showDiscontinued, setShowDiscontinued] = useState(initialShowDiscontinued)
  const [keyword, setKeyword] = useState(initialKeyword)

  const [isEditMode, setIsEditMode] = useState(false)
  const [editedProducts, setEditedProducts] = useState<Map<number, Product>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ 
    key: 'product_code', 
    direction: 'asc' 
  })

  // マスタ選択肢
  const partnerOptions = useMemo(() => masterPartners.map(p => p.name), [masterPartners])

  // --- URLパラメータ連動 (Debounce) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (selectedPartner) params.set('partner', selectedPartner)
      if (showDiscontinued) params.set('show_discontinued', 'true')
      if (keyword) params.set('q', keyword)

      const currentQuery = searchParams.toString()
      const newQuery = params.toString()
      if (currentQuery !== newQuery) {
        router.replace(`/products?${newQuery}`, { scroll: false })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [selectedPartner, showDiscontinued, keyword, router, searchParams])

  // --- クライアントサイドソート ---
  const sortedData = useMemo(() => {
    let data = [...initialProducts]
    data.sort((a, b) => {
      const { key, direction } = sortConfig
      let valA: any = '', valB: any = ''
      
      // 動的カラムに対応した値取得ロジック
      if (key === 'status') { valA = a.is_discontinued ? 1 : 0; valB = b.is_discontinued ? 1 : 0 }
      else if (key === 'partner') { valA = a.partners?.name || ''; valB = b.partners?.name || '' }
      else if (key === 'product_code') { valA = a.product_code || ''; valB = b.product_code || '' }
      else if (key === 'name') { valA = a.name || ''; valB = b.name || '' }
      else if (key === 'color') { valA = a.color || ''; valB = b.color || '' }
      else if (key === 'memo') { valA = a.memo || ''; valB = b.memo || '' }

      if (valA < valB) return direction === 'asc' ? -1 : 1
      if (valA > valB) return direction === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [initialProducts, sortConfig])

  // --- イベントハンドラ ---
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  const handleEditChange = (id: number, field: keyof Product, value: any) => {
    setEditedProducts(prev => {
      const newMap = new Map(prev)
      const currentEdit = newMap.get(id) || { ...initialProducts.find(p => p.id === id)! }
      newMap.set(id, { ...currentEdit, [field]: value })
      return newMap
    })
  }

  const handleSave = async () => {
    if (editedProducts.size === 0) return
    if (!confirm(`${editedProducts.size}件の変更を保存しますか？`)) return
    setIsSaving(true)
    const updates = Array.from(editedProducts.values()).map(p => ({
        id: p.id,
        product_code: p.product_code || '',
        name: p.name,
        color: p.color,
        memo: p.memo,
        is_discontinued: p.is_discontinued
    }))
    const result = await updateProducts(updates)
    if (result.success) {
      alert(result.message)
      setEditedProducts(new Map())
      setIsEditMode(false)
    } else {
      alert(result.message)
    }
    setIsSaving(false)
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <span className="text-gray-300 ml-1">⇅</span>
    return <span className="text-indigo-600 ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
  }

  // --- レンダーヘルパー: カラム設定モーダル ---
  const ColumnConfigModal = () => {
    if (!isConfigOpen) return null

    // ローカルステートで一時的な変更を管理
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [tempColumns, setTempColumns] = useState(visibleColumns)

    const toggleColumn = (colKey: string) => {
      if (tempColumns.find(c => c.key === colKey)) {
        setTempColumns(tempColumns.filter(c => c.key !== colKey))
      } else {
        const colToAdd = ALL_COLUMNS.find(c => c.key === colKey)
        if (colToAdd) setTempColumns([...tempColumns, colToAdd])
      }
    }

    const moveColumn = (index: number, direction: -1 | 1) => {
      const newCols = [...tempColumns]
      if (index + direction < 0 || index + direction >= newCols.length) return
      const temp = newCols[index]
      newCols[index] = newCols[index + direction]
      newCols[index + direction] = temp
      setTempColumns(newCols)
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-96 max-w-full p-6">
          <h3 className="text-lg font-bold mb-4">表示項目の設定</h3>
          <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
            {/* 表示順序の並べ替えエリア */}
            <p className="text-xs text-gray-500 mb-2">表示順序 (上から順に左から表示されます)</p>
            {tempColumns.map((col, idx) => (
              <div key={col.key} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span>{col.label}</span>
                <div className="flex gap-1">
                  <button onClick={() => moveColumn(idx, -1)} disabled={idx === 0} className="px-2 bg-gray-200 rounded text-xs hover:bg-gray-300 disabled:opacity-30">↑</button>
                  <button onClick={() => moveColumn(idx, 1)} disabled={idx === tempColumns.length - 1} className="px-2 bg-gray-200 rounded text-xs hover:bg-gray-300 disabled:opacity-30">↓</button>
                  <button onClick={() => toggleColumn(col.key)} className="text-red-500 ml-2 text-xs hover:underline">削除</button>
                </div>
              </div>
            ))}
            
            {/* 非表示項目の追加エリア */}
            <div className="mt-4 border-t pt-2">
               <p className="text-xs text-gray-500 mb-2">追加可能な項目</p>
               <div className="flex flex-wrap gap-2">
                 {ALL_COLUMNS.filter(ac => !tempColumns.find(tc => tc.key === ac.key)).map(col => (
                   <button 
                     key={col.key}
                     onClick={() => setTempColumns([...tempColumns, col])}
                     className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-200 hover:bg-indigo-100"
                   >
                     + {col.label}
                   </button>
                 ))}
                 {ALL_COLUMNS.filter(ac => !tempColumns.find(tc => tc.key === ac.key)).length === 0 && (
                   <span className="text-xs text-gray-400">すべて表示中</span>
                 )}
               </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsConfigOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">キャンセル</button>
            <button onClick={() => saveColumnConfig(tempColumns)} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded">保存</button>
          </div>
        </div>
      </div>
    )
  }

  // --- レンダリング ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          製品マスタ {/* 名称変更 */}
          <span className="ml-4 text-sm font-normal text-gray-500">
            {initialProducts.length}件 表示
          </span>
        </h1>
        
        <div className="flex items-center gap-4">
           {/* 設定ボタン (New!) */}
           <button
             onClick={() => setIsConfigOpen(true)}
             className="text-gray-500 hover:text-indigo-600 flex items-center gap-1 text-sm"
           >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
             </svg>
             表示設定
           </button>

           {/* 編集モードスイッチ */}
           <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
             <span className={`text-xs font-bold ${isEditMode ? 'text-indigo-600' : 'text-gray-500'}`}>
               編集モード: {isEditMode ? 'ON' : 'OFF'}
             </span>
             <button
               onClick={() => { setIsEditMode(!isEditMode); if (isEditMode) setEditedProducts(new Map()); }}
               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEditMode ? 'bg-indigo-600' : 'bg-gray-300'}`}
             >
               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEditMode ? 'translate-x-6' : 'translate-x-1'}`} />
             </button>
          </div>
        </div>
      </div>

      {/* フィルターバー (省略せずに記載) */}
      <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-md border border-gray-200 items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-500 mb-1">取引先</label>
          <select value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)} className="block w-full sm:w-48 rounded-md border-gray-300 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="">すべて</option>
            {partnerOptions.map(pn => <option key={pn} value={pn}>{pn}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-auto flex items-center pt-6">
           <label className="flex items-center gap-2 cursor-pointer select-none">
             <input type="checkbox" checked={showDiscontinued} onChange={(e) => setShowDiscontinued(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
             <span className="text-sm text-gray-700">廃盤製品も含める</span>
           </label>
        </div>
        <div className="w-full sm:w-auto flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">キーワード検索</label>
          <input type="text" placeholder="入力して検索..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="block w-full rounded-md border-gray-300 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500" />
        </div>
        {(selectedPartner || keyword || showDiscontinued) && (
          <button onClick={() => { setSelectedPartner(''); setKeyword(''); setShowDiscontinued(false); }} className="text-sm text-gray-500 hover:text-indigo-600 underline pb-2">条件クリア</button>
        )}
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow relative">
        {isEditMode && editedProducts.size > 0 && (
          <div className="absolute bottom-4 right-4 z-10 animate-bounce">
            <button onClick={handleSave} disabled={isSaving} className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-500">
              {isSaving ? '保存中...' : `${editedProducts.size}件の変更を保存`}
            </button>
          </div>
        )}

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 select-none">
            <tr>
              {/* 動的ヘッダー描画 */}
              {visibleColumns.map((col) => (
                <th 
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label} <SortIcon columnKey={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedData.map((product) => {
              const isEditingThisRow = editedProducts.has(product.id)
              const displayData = isEditingThisRow ? editedProducts.get(product.id)! : product
              const isDiscontinued = displayData.is_discontinued

              return (
                <tr key={product.id} className={`hover:bg-gray-50 ${isEditingThisRow ? 'bg-indigo-50' : isDiscontinued ? 'bg-gray-100 opacity-70' : ''}`}>
                  {/* 動的ボディ描画 */}
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-6 py-4 text-sm whitespace-nowrap">
                      {/* カラムごとのレンダリングロジック */}
                      
                      {col.key === 'status' && (
                        isEditMode ? (
                          <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={!displayData.is_discontinued} onChange={(e) => handleEditChange(product.id, 'is_discontinued', !e.target.checked)} />
                            <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                          </label>
                        ) : (
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${isDiscontinued ? 'bg-gray-200 text-gray-600 ring-gray-500/20' : 'bg-green-50 text-green-700 ring-green-600/20'}`}>
                            {isDiscontinued ? '廃盤' : '稼働'}
                          </span>
                        )
                      )}

                      {col.key === 'partner' && <span className="text-gray-500">{product.partners?.name}</span>}

                      {col.key === 'product_code' && (
                         isEditMode ? <input type="text" className="w-full rounded border-gray-300 py-1 text-sm font-mono" value={displayData.product_code || ''} onChange={(e) => handleEditChange(product.id, 'product_code', e.target.value)} />
                         : <span className="text-gray-900 font-mono">{displayData.product_code}</span>
                      )}

                      {col.key === 'name' && (
                         isEditMode ? <input type="text" className="w-full rounded border-gray-300 py-1 text-sm" value={displayData.name} onChange={(e) => handleEditChange(product.id, 'name', e.target.value)} />
                         : <span className="text-gray-900">{displayData.name}</span>
                      )}

                      {col.key === 'color' && (
                         isEditMode ? <input type="text" className="w-full rounded border-gray-300 py-1 text-sm" value={displayData.color || ''} onChange={(e) => handleEditChange(product.id, 'color', e.target.value)} />
                         : <span className="text-gray-500">{displayData.color}</span>
                      )}

                      {col.key === 'memo' && (
                         isEditMode ? <input type="text" className="w-full rounded border-gray-300 py-1 text-sm" value={displayData.memo || ''} onChange={(e) => handleEditChange(product.id, 'memo', e.target.value)} />
                         : <span className="text-gray-500 truncate max-w-xs block" title={displayData.memo || ''}>{displayData.memo}</span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        {sortedData.length === 0 && <div className="p-12 text-center text-gray-500">該当なし</div>}
      </div>

      {/* 設定モーダル */}
      <ColumnConfigModal />
    </div>
  )
}