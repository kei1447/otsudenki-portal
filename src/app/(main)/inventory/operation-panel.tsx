'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  registerReceiving, 
  registerProduction, 
  getProductsByPartner, 
  registerShipment, 
  getStockProductsByPartner,
  getRawStockProductsByPartner,
  getGlobalHistory,
  bulkDeleteMovements,
  getDefectiveProductsByPartner,
  registerDefectiveProcessing,
  getRecentShipments
} from './actions'

type Partner = {
  id: string
  name: string
}

type ProductRaw = {
  id: number
  name: string
  product_code: string
  color: string | null
}

type ProductStock = {
  id: number
  name: string
  product_code: string
  color: string | null
  stock_finished: number
}

// ★修正: arrivals (入荷履歴) を追加
type ProductRawStock = {
  id: number
  name: string
  product_code: string
  color: string | null
  stock_raw: number
  arrivals: { label: string, value: string }[] 
}

type ProductDefectiveStock = { 
  id: number
  name: string
  product_code: string
  color: string | null
  stock_defective: number
  recent_defects: { reason: string, date: string }[] 
  recent_arrivals: { date: string, qty: number }[]
}

const DEFECT_TYPES = {
  external: ['錆', '打痕'],
  internal: ['タレ・ワキ', 'スケ', '糸ゴミ', '虫ゴミ', 'キズ', 'ハジキ', '水跡']
}

export default function OperationPanel({ partners }: { partners: Partner[] }) {
  const [activeTab, setActiveTab] = useState<'receiving' | 'production' | 'shipping' | 'defective' | 'history'>('receiving')
  
  const [recvPartnerId, setRecvPartnerId] = useState('')
  const [recvProducts, setRecvProducts] = useState<ProductRaw[]>([])
  const [isRecvLoading, setIsRecvLoading] = useState(false)

  useEffect(() => {
    if (!recvPartnerId) { setRecvProducts([]); return }
    const load = async () => {
      setIsRecvLoading(true)
      const data = await getProductsByPartner(recvPartnerId)
      setRecvProducts(data || [])
      setIsRecvLoading(false)
    }
    load()
  }, [recvPartnerId])

  return (
    <div>
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-8 min-w-max">
          <button onClick={() => setActiveTab('receiving')} className={`${activeTab === 'receiving' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}>1. 受入登録</button>
          <button onClick={() => setActiveTab('production')} className={`${activeTab === 'production' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}>2. 加工実績</button>
          <button onClick={() => setActiveTab('shipping')} className={`${activeTab === 'shipping' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}>3. 出荷登録</button>
          <button onClick={() => setActiveTab('defective')} className={`${activeTab === 'defective' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}>4. 不良品処理</button>
          <button onClick={() => setActiveTab('history')} className={`${activeTab === 'history' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-1`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>
            履歴・一括削除
          </button>
        </nav>
      </div>

      {activeTab === 'receiving' && (
        <div className="space-y-4">
          <div className="flex gap-4 items-end bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="w-1/3">
              <label className="block text-sm font-bold text-gray-700 mb-1">取引先を選択</label>
              <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2" value={recvPartnerId} onChange={(e) => setRecvPartnerId(e.target.value)}>
                <option value="">選択してください</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="text-sm text-gray-500 pb-2">{isRecvLoading && <span>読み込み中...</span>}</div>
          </div>
          {recvPartnerId && recvProducts.length > 0 && <ReceivingTable products={recvProducts} onComplete={() => { setRecvPartnerId(''); setRecvProducts([]) }} />}
        </div>
      )}

      {activeTab === 'production' && <ProductionForm partners={partners} />}
      {activeTab === 'shipping' && <ShippingForm partners={partners} />}
      {activeTab === 'defective' && <DefectiveProcessingForm partners={partners} />}
      {activeTab === 'history' && <HistoryTable />}
    </div>
  )
}

function ReceivingTable({ products, onComplete }: { products: ProductRaw[], onComplete: () => void }) {
  type RowInput = { qty: string; date: string }
  const [inputs, setInputs] = useState<Record<number, RowInput>>({})
  const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([])

  const handleChange = (id: number, field: keyof RowInput, value: string) => { setInputs(prev => ({ ...prev, [id]: { ...prev[id], qty: prev[id]?.qty || '', date: prev[id]?.date || defaultDate, [field]: value } })) }
  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (colIndex === 0) inputRefs.current[rowIndex][1]?.focus()
      else { if (rowIndex + 1 < products.length) inputRefs.current[rowIndex + 1][0]?.focus(); else document.getElementById('recv-submit-btn')?.focus() }
    }
  }
  const handleSubmit = async () => {
    const validRows = Object.entries(inputs).filter(([_, val]) => val.qty && Number(val.qty) > 0)
    if (validRows.length === 0) { alert('入力されていません'); return }
    if (!confirm(`${validRows.length}件登録しますか？`)) return
    setIsSubmitting(true)
    let successCount = 0
    for (const [idStr, val] of validRows) {
      const res = await registerReceiving({ productId: Number(idStr), quantity: Number(val.qty), dueDate: val.date || defaultDate })
      if (res.success) successCount++
    }
    setIsSubmitting(false)
    alert(`${successCount}件完了`)
    if (successCount > 0) { setInputs({}); onComplete() }
  }
  if (inputRefs.current.length !== products.length) inputRefs.current = Array(products.length).fill(null).map(() => [null, null])

  return (
    <div className="overflow-x-auto">
      <div className="mb-2 flex justify-end gap-2"><label className="text-xs font-bold text-gray-600">納期一括:</label><input type="date" value={defaultDate} onChange={e=>setDefaultDate(e.target.value)} className="rounded border-gray-300 text-xs py-1"/></div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200"><thead className="bg-indigo-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">型番</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">品名</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-24">受入数</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-32">納期</th></tr></thead>
        <tbody className="bg-white divide-y divide-gray-200">{products.map((p,i)=>{
          const row=inputs[p.id]||{qty:'',date:defaultDate}; const active=!!row.qty
          return <tr key={p.id} className={active?'bg-indigo-50/50':''}>
            <td className="px-4 py-2 text-sm font-mono">{p.product_code}</td><td className="px-4 py-2 text-sm">{p.name} {p.color}</td>
            <td className="px-4 py-2"><input ref={el=>{if(inputRefs.current[i])inputRefs.current[i][0]=el}} type="number" min="0" className="w-full rounded border-gray-300 py-1 px-2 text-right font-bold" value={row.qty} onChange={e=>handleChange(p.id,'qty',e.target.value)} onKeyDown={e=>handleKeyDown(e,i,0)}/></td>
            <td className="px-4 py-2"><input ref={el=>{if(inputRefs.current[i])inputRefs.current[i][1]=el}} type="date" className="w-full rounded border-gray-300 py-1 px-2" value={row.date} onChange={e=>handleChange(p.id,'date',e.target.value)} onKeyDown={e=>handleKeyDown(e,i,1)}/></td>
          </tr>
        })}</tbody></table>
      </div>
      <div className="mt-4 flex justify-end"><button id="recv-submit-btn" onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 text-white px-8 py-3 rounded-md font-bold hover:bg-indigo-500">一括登録を実行</button></div>
    </div>
  )
}

// ============================================================================
// サブコンポーネント: 2. 加工実績フォーム (入荷日選択 対応)
// ============================================================================
function ProductionForm({ partners }: { partners: Partner[] }) {
  const [partnerId, setPartnerId] = useState('')
  const [products, setProducts] = useState<ProductRawStock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // ★修正: sourceDate (選択された入荷日) を追加
  type ProdInput = { finished: string; defects: Record<string, number>; sourceDate: string }
  const [inputs, setInputs] = useState<Record<number, ProdInput>>({})
  
  const [modalTargetId, setModalTargetId] = useState<number | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!partnerId) { setProducts([]); return }
    const load = async () => {
      setIsLoading(true)
      const data = await getRawStockProductsByPartner(partnerId)
      setProducts(data || [])
      setInputs({}) 
      setIsLoading(false)
    }
    load()
  }, [partnerId])

  const handleChange = (id: number, field: keyof ProdInput, value: string) => {
    setInputs(prev => ({ ...prev, [id]: { finished: '', defects: {}, sourceDate: '', ...prev[id], [field]: value } }))
  }

  const handleDefectsSave = (productId: number, newDefects: Record<string, number>) => {
    setInputs(prev => ({ ...prev, [productId]: { finished: '', sourceDate: '', ...prev[productId], defects: newDefects } }))
    setModalTargetId(null)
  }

  const getDefectTotal = (defects: Record<string, number> | undefined) => {
    if (!defects) return 0
    return Object.values(defects).reduce((sum, val) => sum + val, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (index + 1 < products.length) inputRefs.current[index + 1]?.focus()
      else document.getElementById('prod-submit-btn')?.focus()
    }
  }

  const handleSubmit = async () => {
    const validRows = Object.entries(inputs).filter(([id, val]) => Number(val.finished || 0) > 0 || getDefectTotal(val.defects) > 0)
    if (validRows.length === 0) { alert('入力してください'); return }

    for (const [idStr, val] of validRows) {
      const pid = Number(idStr)
      const p = products.find(x => x.id === pid)
      const total = Number(val.finished || 0) + getDefectTotal(val.defects)
      if (p && total > p.stock_raw) { alert(`在庫不足: ${p.product_code}`); return }
    }

    if (!confirm(`${validRows.length}件登録しますか？`)) return
    setIsSubmitting(true)
    let successCount = 0
    for (const [idStr, val] of validRows) {
      const finished = Number(val.finished || 0)
      const defective = getDefectTotal(val.defects)
      const reasonStr = Object.entries(val.defects).filter(([_, q]) => q > 0).map(([n, q]) => `${n}(${q})`).join(', ')
      
      const res = await registerProduction({
        productId: Number(idStr),
        rawUsed: finished + defective,
        finished,
        defective,
        defectReason: reasonStr || undefined,
        sourceDate: val.sourceDate || undefined // ★追加
      })
      if (res.success) successCount++
    }
    setIsSubmitting(false)
    alert(`${successCount}件完了`)
    if (successCount > 0) { const data = await getRawStockProductsByPartner(partnerId); setProducts(data || []); setInputs({}) }
  }

  if (inputRefs.current.length !== products.length) inputRefs.current = Array(products.length).fill(null)

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end bg-gray-50 p-4 rounded-md border border-gray-200">
        <div className="w-1/3">
          <label className="block text-sm font-bold text-gray-700 mb-1">取引先を選択</label>
          <select className="block w-full rounded-md border-gray-300 shadow-sm py-2" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}><option value="">選択してください</option>{partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </div>
        <div className="text-sm text-gray-500 pb-2">{isLoading ? '確認中...' : (partnerId && `${products.length}件`)}</div>
      </div>

      {products.length > 0 ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden relative">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">型番/品名</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 w-20 bg-yellow-50">生地在庫</th>
                {/* ★追加: 入荷日選択列 */}
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 w-48">使用する生地の入荷日</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 w-32">良品数</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 w-40">不良数 (内訳)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((p, idx) => {
                const row = inputs[p.id] || { finished: '', defects: {}, sourceDate: '' }
                const defectiveTotal = getDefectTotal(row.defects)
                const isActive = Number(row.finished) > 0 || defectiveTotal > 0
                const isOver = (Number(row.finished) + defectiveTotal) > p.stock_raw

                return (
                  <tr key={p.id} className={isActive ? 'bg-indigo-50/30' : ''}>
                    <td className="px-4 py-2 text-sm">
                      <div className="font-mono text-gray-900">{p.product_code}</div>
                      <div className="text-gray-500 text-xs">{p.name} {p.color}</div>
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-bold text-gray-700 bg-yellow-50">{p.stock_raw.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      {/* ★入荷日選択プルダウン */}
                      <select 
                        className="w-full rounded border-gray-300 py-1 px-2 text-xs"
                        value={row.sourceDate}
                        onChange={(e) => handleChange(p.id, 'sourceDate', e.target.value)}
                      >
                        <option value="">指定なし (自動)</option>
                        {p.arrivals?.map((arr, i) => (
                          <option key={i} value={arr.label}>{arr.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        ref={el => { inputRefs.current[idx] = el }}
                        type="number" min="0" 
                        className={`w-full rounded border-gray-300 py-1 px-2 text-right font-bold ${isOver ? 'text-red-600 border-red-500' : ''}`}
                        placeholder="0" value={row.finished} 
                        onChange={(e) => handleChange(p.id, 'finished', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => setModalTargetId(p.id)} className={`w-full text-left border rounded px-3 py-1.5 text-sm flex justify-between items-center ${defectiveTotal > 0 ? 'bg-red-50 border-red-300 text-red-700 font-bold' : 'bg-white border-gray-300 text-gray-400'}`}>
                        <span>{defectiveTotal > 0 ? `${defectiveTotal}個` : 'なし'}</span>
                        <span className="text-xs ml-2">▼入力</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="p-4 bg-gray-50 text-right border-t border-gray-200"><button id="prod-submit-btn" onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-3 rounded-md font-bold hover:bg-blue-500 disabled:opacity-50">一括登録を実行</button></div>
          {modalTargetId !== null && <DefectInputModal product={products.find(p => p.id === modalTargetId)!} initialDefects={inputs[modalTargetId]?.defects || {}} onSave={(defects) => handleDefectsSave(modalTargetId, defects)} onClose={() => setModalTargetId(null)} />}
        </div>
      ) : (partnerId && !isLoading && <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">加工可能な製品なし</div>)}
    </div>
  )
}

function DefectInputModal({ product, initialDefects, onSave, onClose }: { product: ProductRawStock, initialDefects: Record<string, number>, onSave: (defects: Record<string, number>) => void, onClose: () => void }) {
  const [defects, setDefects] = useState<Record<string, number>>(initialDefects)
  const handleChange = (name: string, valStr: string) => { const val = valStr === '' ? 0 : parseInt(valStr, 10); setDefects(prev => ({ ...prev, [name]: val })) }
  const total = Object.values(defects).reduce((sum, v) => sum + v, 0)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0"><div><h3 className="text-lg font-bold text-gray-900">不良内訳入力</h3><p className="text-sm text-gray-500">{product.product_code} / {product.name}</p></div><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>
        <div className="p-6 space-y-6">
          <div><h4 className="font-bold text-red-700 border-b-2 border-red-100 mb-3 pb-1">社外起因</h4><div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{DEFECT_TYPES.external.map(type => (<div key={type}><label className="block text-xs font-bold text-gray-600 mb-1">{type}</label><input type="number" min="0" className="w-full rounded border-gray-300 py-2 text-center font-bold focus:ring-red-500 focus:border-red-500" value={defects[type] || ''} onChange={(e) => handleChange(type, e.target.value)} placeholder="0"/></div>))}</div></div>
          <div><h4 className="font-bold text-blue-700 border-b-2 border-blue-100 mb-3 pb-1">社内起因</h4><div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{DEFECT_TYPES.internal.map(type => (<div key={type}><label className="block text-xs font-bold text-gray-600 mb-1">{type}</label><input type="number" min="0" className="w-full rounded border-gray-300 py-2 text-center font-bold focus:ring-blue-500 focus:border-blue-500" value={defects[type] || ''} onChange={(e) => handleChange(type, e.target.value)} placeholder="0"/></div>))}</div></div>
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center sticky bottom-0"><div className="text-sm">不良合計: <span className="text-xl font-bold text-red-600 ml-2">{total} 個</span></div><div className="flex gap-2"><button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">キャンセル</button><button onClick={() => onSave(defects)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-500">確定する</button></div></div>
      </div>
    </div>
  )
}

function ShippingForm({ partners }: { partners: Partner[] }) {
  const [partnerId, setPartnerId] = useState('')
  const [shipDate, setShipDate] = useState(new Date().toISOString().split('T')[0])
  const [products, setProducts] = useState<ProductStock[]>([])
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // ★追加: 直近の出荷履歴
  const [recentShipments, setRecentShipments] = useState<any[]>([])

  useEffect(() => {
    // 初期ロード & 取引先変更時
    const load = async () => {
      setIsLoading(true)
      if (partnerId) {
        // 在庫
        const stock = await getStockProductsByPartner(partnerId)
        setProducts(stock || [])
        setQuantities({})
        
        // 直近出荷
        const recents = await getRecentShipments(partnerId)
        setRecentShipments(recents || [])
      } else {
        setProducts([])
        // 取引先未選択時は全件の直近を表示してもよいが、今回は空にする
        setRecentShipments([])
      }
      setIsLoading(false)
    }
    load()
  }, [partnerId])

  // 再読み込み用ヘルパー
  const reloadData = async () => {
    if (!partnerId) return
    const stock = await getStockProductsByPartner(partnerId)
    setProducts(stock || [])
    const recents = await getRecentShipments(partnerId)
    setRecentShipments(recents || [])
    setQuantities({})
  }

  const handleSubmit = async () => {
    const items = Object.entries(quantities).map(([pid,q])=>({productId:Number(pid),quantity:Number(q)})).filter(i=>i.quantity>0)
    if(items.length===0){alert('入力してください');return}
    for(const i of items){const p=products.find(x=>x.id===i.productId);if(p&&i.quantity>p.stock_finished){alert(`在庫不足: ${p.product_code}`);return}}
    if(!confirm(`${items.length}件出荷しますか？`))return
    setIsSubmitting(true)
    const res=await registerShipment({partnerId,shipmentDate:shipDate,items})
    setIsSubmitting(false)
    
    if(res.success){
      alert(res.message)
      reloadData() // 完了後にリロードして履歴などを更新
    } else {
      alert(res.message)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 左側: 出荷入力フォーム (2/3幅) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex gap-4 items-end bg-blue-50 p-4 rounded-md border border-blue-100">
          <div className="w-1/3"><label className="block text-sm font-bold text-gray-700 mb-1">出荷先</label><select className="block w-full rounded-md border-gray-300 shadow-sm py-2" value={partnerId} onChange={e=>setPartnerId(e.target.value)}><option value="">選択</option>{partners.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="w-1/4"><label className="block text-sm font-bold text-gray-700 mb-1">出荷日</label><input type="date" className="block w-full rounded-md border-gray-300 shadow-sm py-2" value={shipDate} onChange={e=>setShipDate(e.target.value)}/></div>
          <div className="text-sm text-gray-500 pb-2">{isLoading?'確認中...':(partnerId&&`${products.length}件`)}</div>
        </div>
        {products.length>0?(
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200"><thead className="bg-blue-100"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-600">型番/品名</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-600 w-24">在庫</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-600 w-32">出荷数</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">{products.map(p=>{
              const qty=quantities[p.id]||''; const isOver=Number(qty)>p.stock_finished
              return <tr key={p.id} className={qty?'bg-blue-50/30':''}>
                <td className="px-4 py-2 text-sm"><div className="font-mono text-gray-900">{p.product_code}</div><div className="text-gray-500 text-xs">{p.name} {p.color}</div></td>
                <td className="px-4 py-2 text-right text-sm font-bold text-gray-700">{p.stock_finished.toLocaleString()}</td>
                <td className="px-4 py-2"><input type="number" min="0" max={p.stock_finished} className={`w-full rounded border-gray-300 py-1 px-2 text-right font-bold ${isOver?'text-red-600 border-red-500':''}`} placeholder="0" value={qty} onChange={e=>setQuantities({...quantities,[p.id]:e.target.value})}/></td>
              </tr>
            })}</tbody></table>
            <div className="p-4 bg-gray-50 text-right"><button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-3 rounded-md font-bold hover:bg-blue-500 disabled:opacity-50">出荷を確定する</button></div>
          </div>
        ):(partnerId&&!isLoading&&<div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">出荷可能な在庫なし</div>)}
      </div>

      {/* 右側: 直近の納品書履歴 (1/3幅) */}
      <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg p-4 h-fit">
        <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">納品書履歴 / 印刷</h3>
        {recentShipments.length === 0 ? (
          <p className="text-sm text-gray-500">履歴がありません</p>
        ) : (
          <div className="space-y-3">
            {recentShipments.map(ship => (
              <div key={ship.id} className="flex flex-col p-3 bg-gray-50 rounded border border-gray-100 hover:bg-blue-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-gray-600">{new Date(ship.shipment_date).toLocaleDateString()}</span>
                  <span className="text-xs font-mono text-gray-400">#{ship.id.slice(0,6)}</span>
                </div>
                <div className="text-sm font-bold text-gray-800 mb-1">{ship.partners?.name}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-bold">¥{ship.total_amount.toLocaleString()}</span>
                  <a 
                    href={`/shipments/${ship.id}/print`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded hover:bg-gray-600 flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.5a.75.75 0 01-1.5 0v-2a.25.25 0 00-.25-.25h-6.5a.25.25 0 00-.25.25v2a.75.75 0 01-1.5 0v-3.5zm2.5 8.5a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75zm0 3a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75zM2 10a4 4 0 014-4h1.5a.75.75 0 010 1.5H6a2.5 2.5 0 00-2.5 2.5v5.5A2.5 2.5 0 006 18h1.5a.75.75 0 010 1.5H6a4 4 0 01-4-4v-5.5zm12 0a4 4 0 014-4h-1.5a.75.75 0 000 1.5H18a2.5 2.5 0 012.5 2.5v5.5a2.5 2.5 0 01-2.5 2.5h-1.5a.75.75 0 000 1.5H18a4 4 0 004-4v-5.5z" clipRule="evenodd" /></svg>
                    印刷
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DefectiveProcessingForm({ partners }: { partners: Partner[] }) {
  const [partnerId, setPartnerId] = useState('')
  const [products, setProducts] = useState<ProductDefectiveStock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  type DefInput = { rework: string; returnQty: string }
  const [inputs, setInputs] = useState<Record<number, DefInput>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!partnerId) { setProducts([]); return }
    const load = async () => { setIsLoading(true); const data = await getDefectiveProductsByPartner(partnerId); setProducts(data || []); setInputs({}); setIsLoading(false) }
    load()
  }, [partnerId])

  const handleChange = (id: number, field: keyof DefInput, value: string) => {
    setInputs(prev => ({ ...prev, [id]: { ...prev[id], rework: prev[id]?.rework || '', returnQty: prev[id]?.returnQty || '', [field]: value } }))
  }

  const handleSubmit = async () => {
    const validRows = Object.entries(inputs).filter(([_, val]) => Number(val.rework)>0 || Number(val.returnQty)>0)
    if (validRows.length === 0) { alert('処理数を入力してください'); return }

    for (const [idStr, val] of validRows) {
      const pid = Number(idStr)
      const p = products.find(prod => prod.id === pid)
      const total = Number(val.rework || 0) + Number(val.returnQty || 0)
      if (p && total > p.stock_defective) {
        alert(`在庫不足です: ${p.product_code} (不良在庫:${p.stock_defective})`)
        return
      }
    }

    if (!confirm(`${validRows.length}件の不良品処理を登録しますか？`)) return

    setIsSubmitting(true)
    let successCount = 0
    for (const [idStr, val] of validRows) {
      const res = await registerDefectiveProcessing({
        productId: Number(idStr),
        reworkQty: Number(val.rework || 0),
        returnQty: Number(val.returnQty || 0)
      })
      if (res.success) successCount++
    }
    setIsSubmitting(false)
    
    alert(`${successCount}件完了`)
    if (successCount > 0) {
      const data = await getDefectiveProductsByPartner(partnerId)
      setProducts(data || [])
      setInputs({})
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end bg-red-50 p-4 rounded-md border border-red-100">
        <div className="w-1/3">
          <label className="block text-sm font-bold text-gray-700 mb-1">取引先を選択</label>
          <select className="block w-full rounded-md border-gray-300 shadow-sm py-2" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
            <option value="">選択してください</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="text-sm text-gray-500 pb-2">{isLoading ? '確認中...' : (partnerId && `${products.length}件の不良在庫あり`)}</div>
      </div>

      {products.length > 0 ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-red-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">型番 / 品名</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 w-24">最終入荷</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">不良内容 / 発生日 (直近)</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 w-20">不良在庫</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 w-32">手直し (→完成)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-32">返却 (→消滅)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map(p => {
                const row = inputs[p.id] || { rework: '', returnQty: '' }
                const rework = Number(row.rework || 0)
                const ret = Number(row.returnQty || 0)
                const isActive = rework > 0 || ret > 0
                const isOver = (rework + ret) > p.stock_defective
                const hasDefects = p.recent_defects && p.recent_defects.length > 0
                const hasArrivals = p.recent_arrivals && p.recent_arrivals.length > 0

                return (
                  <tr key={p.id} className={isActive ? 'bg-red-50/30' : ''}>
                    <td className="px-4 py-2 text-sm">
                      <div className="font-mono text-gray-900">{p.product_code}</div>
                      <div className="text-gray-500 text-xs">{p.name} {p.color}</div>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {hasArrivals ? (
                        <div className="flex flex-col gap-0.5">
                          {p.recent_arrivals?.map((arr, i) => (
                            <div key={i} className="whitespace-nowrap">
                              <span className="font-medium">{arr.date}</span>: {arr.qty}個
                            </div>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {hasDefects ? (
                        <div className="flex flex-wrap gap-1">
                          {p.recent_defects?.map((def, i) => (
                            <span key={i} className="inline-block bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 shadow-sm">
                              {def.reason} <span className="text-gray-400 text-[10px] ml-1">{def.date}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-bold text-red-600">{p.stock_defective.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" min="0" 
                        className={`w-full rounded border-gray-300 py-1 px-2 text-right font-bold focus:ring-blue-500 focus:border-blue-500 ${isOver ? 'border-red-500' : ''}`}
                        placeholder="0" value={row.rework} onChange={(e) => handleChange(p.id, 'rework', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" min="0" 
                        className={`w-full rounded border-gray-300 py-1 px-2 text-right font-bold text-gray-500 focus:ring-gray-500 focus:border-gray-500 ${isOver ? 'border-red-500' : ''}`}
                        placeholder="0" value={row.returnQty} onChange={(e) => handleChange(p.id, 'returnQty', e.target.value)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="p-4 bg-gray-50 text-right border-t border-gray-200">
            <button onClick={handleSubmit} disabled={isSubmitting} className="bg-red-600 text-white px-8 py-3 rounded-md font-bold shadow hover:bg-red-500 disabled:opacity-50">処理を実行</button>
          </div>
        </div>
      ) : (partnerId && !isLoading && <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">不良在庫はありません</div>)}
    </div>
  )
}

function HistoryTable() {
  const [history, setHistory] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadHistory = async () => { setIsLoading(true); const data = await getGlobalHistory(); setHistory(data); setSelectedIds(new Set()); setIsLoading(false) }
  useEffect(() => { loadHistory() }, [])

  const toggleSelect = (id: string) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet) }
  const toggleAll = () => { if (selectedIds.size === history.length) setSelectedIds(new Set()); else setSelectedIds(new Set(history.map(h => h.id))) }
  const handleDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`選択した ${selectedIds.size} 件を取り消しますか？`)) return
    setIsDeleting(true)
    const res = await bulkDeleteMovements(Array.from(selectedIds))
    setIsDeleting(false)
    alert(res.message); loadHistory()
  }

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'receiving': return <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold">受入</span>
      case 'production_raw': return <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">消費</span>
      case 'production_finished': return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">完成</span>
      case 'production_defective': return <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">不良</span>
      case 'shipping': return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">出荷</span>
      case 'repair': return <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs border border-blue-200">手直し</span>
      case 'return_defective': return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs border border-gray-300">返却</span>
      default: return type
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-red-50 p-4 rounded-md border border-red-100">
        <div><h3 className="font-bold text-red-800">操作履歴の取り消し</h3><p className="text-xs text-red-600 mt-1">直近の操作履歴を選択して取り消せます（在庫も戻ります）。</p></div>
        <div className="flex gap-4 items-center">
          <button onClick={loadHistory} className="text-sm text-gray-500 hover:text-indigo-600 underline">再読み込み</button>
          <button onClick={handleDelete} disabled={selectedIds.size === 0 || isDeleting} className={`px-4 py-2 rounded-md font-bold text-white shadow-sm ${selectedIds.size > 0 ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-300 cursor-not-allowed'}`}>{isDeleting ? '処理中...' : `${selectedIds.size}件削除`}</button>
        </div>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow">
        {isLoading ? <div className="p-12 text-center text-gray-500">読み込み中...</div> : 
         history.length === 0 ? <div className="p-12 text-center text-gray-500">履歴なし</div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr><th className="px-4 py-3 w-12"><input type="checkbox" className="rounded border-gray-300" checked={selectedIds.size===history.length&&history.length>0} onChange={toggleAll}/></th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">日時</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">種類</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">取引先 / 品名</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500">数量</th></tr></thead>
              <tbody className="divide-y divide-gray-200 text-sm">{history.map(h=>{
                const isSelected=selectedIds.has(h.id)
                return <tr key={h.id} className={isSelected?'bg-red-50':'hover:bg-gray-50'}>
                  <td className="px-4 py-3 text-center"><input type="checkbox" className="rounded border-gray-300" checked={isSelected} onChange={()=>toggleSelect(h.id)}/></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(h.created_at).toLocaleString('ja-JP')}</td>
                  <td className="px-4 py-3">{getTypeLabel(h.movement_type)}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-500">{h.products?.partners?.name}</div>
                    <div className="font-bold text-gray-700">{h.products?.name}</div>
                    {h.reason && <div className="text-xs text-gray-400">{h.reason}</div>}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${h.quantity_change>0?'text-blue-600':'text-red-600'}`}>{h.quantity_change>0?'+':''}{h.quantity_change}</td>
                </tr>
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}