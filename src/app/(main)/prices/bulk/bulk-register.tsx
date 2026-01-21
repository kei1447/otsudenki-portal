'use client'

import { useState, useRef } from 'react'
import { bulkUpsertPrices } from './actions'
import { useRouter } from 'next/navigation'

// マスタ照合用の製品型
// 修正: DBのカラム名に合わせてプロパティ名を変更
type ProductMaster = {
  id: number
  product_code: string
  name: string
  color: string | null
  partners: { name: string } | null
}

// 画面表示用の行データ型
type RowData = {
  isValid: boolean
  errorMessage?: string
  productCode: string // CSVから
  unitPrice: string   // CSVから
  validFrom: string   // CSVから
  reason: string      // CSVから
  matchedProduct?: ProductMaster // マスタ照合結果
}

export default function BulkRegister({ products }: { products: ProductMaster[] }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [rows, setRows] = useState<RowData[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // --- 機能1: テンプレートCSVのダウンロード ---
  const handleDownloadTemplate = () => {
    // 1. ヘッダー行
    const header = ['型番(変更不可)', '取引先(参照)', '品名(参照)', '色(参照)', '新単価(入力)', '適用開始日(YYYY-MM-DD)', '改定理由']
    
    // 2. データ行（全製品分を作成）
    const csvRows = products.map(p => {
      // CSVのエスケープ処理
      const escape = (val: string | null) => {
        const str = val || ''
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      return [
        escape(p.product_code), // 修正: product_code を使用
        escape(p.partners?.name || ''),
        escape(p.name),
        escape(p.color), // 修正: color を使用
        '', // 新単価 (空欄)
        '', // 適用開始日 (空欄)
        ''  // 理由 (空欄)
      ].join(',')
    })

    // 3. BOM付きUTF-8で結合
    const csvContent = '\uFEFF' + header.join(',') + '\n' + csvRows.join('\n')

    // 4. ダウンロード発火
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `price_template_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- 機能2: CSVファイルのアップロードと解析 ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(file)
    
    e.target.value = ''
  }

  // CSV解析ロジック
  const parseCSV = (text: string) => {
    const lines = text.split(/\r\n|\n|\r/).filter(line => line.trim() !== '')
    const dataLines = lines.slice(1)

    const parsedRows: RowData[] = dataLines.map((line) => {
      // 簡易的なCSV分割
      const cols = line.split(',') 
      // [0]型番, [1]取引先, [2]品名, [3]色, [4]単価, [5]日付, [6]理由

      const clean = (str: string | undefined) => str ? str.replace(/^"|"$/g, '').replace(/""/g, '"').trim() : ''

      const code = clean(cols[0])
      const price = clean(cols[4]).replace(/,/g, '')
      const date = clean(cols[5])
      const reason = clean(cols[6])

      if (!code && !price) return null

      // --- バリデーション & マッチング ---
      let error = ''
      
      // 1. 製品マスタ検索 (修正: product_code で検索)
      const product = products.find(p => p.product_code === code)
      if (!product) {
        error = 'マスタ未登録の型番です'
      }

      if (price && isNaN(Number(price))) {
        error = error || '単価が数値ではありません'
      }
      
      if (price && (!date || isNaN(Date.parse(date)))) {
        error = error || '日付形式が不正です (YYYY-MM-DD)'
      }

      return {
        isValid: !error && !!price,
        errorMessage: error,
        productCode: code,
        unitPrice: price,
        validFrom: date,
        reason: reason,
        matchedProduct: product
      }
    }).filter((r): r is RowData => r !== null && (r.unitPrice !== '' || r.errorMessage !== '')) 

    setRows(parsedRows)
    setResultMsg(null)
  }

  // 登録実行
  const handleSubmit = async () => {
    if (rows.length === 0) return
    if (rows.some(r => r.unitPrice && !r.isValid)) {
      alert('エラーの行が含まれています。修正するか、CSVから削除してください。')
      return
    }

    const validRows = rows.filter(r => r.isValid && r.unitPrice)
    if (validRows.length === 0) {
      alert('登録対象のデータがありません。単価を入力してください。')
      return
    }

    setIsSubmitting(true)
    
    // サーバーに送るデータ形式に変換
    const submitData = validRows.map(r => ({
      product_id: r.matchedProduct!.id,
      unit_price: Number(r.unitPrice),
      valid_from: new Date(r.validFrom).toISOString(),
      reason: r.reason
    }))

    const result = await bulkUpsertPrices(submitData)

    if (result.success) {
      alert(`処理が完了しました。\n・新規登録: ${result.count}件\n・内容更新: ${result.updatedCount}件`)
      router.push('/prices')
      router.refresh()
    } else {
      setResultMsg({ type: 'error', text: result.message })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* エリア1: テンプレートダウンロード */}
      <div className="bg-white p-6 shadow rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">1. テンプレートの準備</h3>
        <p className="text-sm text-gray-500 mb-4">
          最新の製品リストが入ったCSVファイルをダウンロードし、Excelで「新単価」「適用開始日」を入力してください。
        </p>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          テンプレートCSVをダウンロード
        </button>
      </div>

      {/* エリア2: アップロード */}
      <div className="bg-white p-6 shadow rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">2. CSVファイルのアップロード</h3>
        <p className="text-sm text-gray-500 mb-4">
          作成したファイルをアップロードしてください。品名や色は無視され、型番をキーにして単価が登録されます。
        </p>
        
        <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
            </svg>
            <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
              >
                <span>ファイルを選択</span>
                <input id="file-upload" name="file-upload" type="file" accept=".csv" className="sr-only" onChange={handleFileUpload} ref={fileInputRef} />
              </label>
              <p className="pl-1">またはドラッグ＆ドロップ</p>
            </div>
            <p className="text-xs leading-5 text-gray-600">CSV up to 10MB</p>
          </div>
        </div>
      </div>

      {/* エリア3: プレビュー */}
      {rows.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">
              3. 内容確認 ({rows.filter(r => r.unitPrice).length}件の登録対象)
            </h3>
            <button
              onClick={() => { setRows([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="text-sm text-gray-500 hover:text-red-600 underline"
            >
              クリア
            </button>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">判定</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">型番 (CSV)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">品名 (マスタ)</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">新単価</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">開始日</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">理由</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-sm">
              {rows.map((row, idx) => {
                if (!row.unitPrice) {
                  return (
                    <tr key={idx} className="bg-gray-50 opacity-50">
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-400">対象外</td>
                      <td className="px-4 py-2 font-mono text-gray-400">{row.productCode}</td>
                      <td className="px-4 py-2 text-gray-400">{row.matchedProduct?.name}</td>
                      <td className="px-4 py-2 text-right text-gray-400">-</td>
                      <td className="px-4 py-2 text-gray-400">-</td>
                      <td className="px-4 py-2 text-gray-400">-</td>
                    </tr>
                  )
                }
                
                return (
                  <tr key={idx} className={row.isValid ? 'hover:bg-gray-50' : 'bg-red-50'}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {row.isValid ? (
                        <span className="text-green-600 font-bold">OK</span>
                      ) : (
                        <span className="text-red-600 font-bold text-xs">{row.errorMessage}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono">{row.productCode}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {row.matchedProduct 
                        ? `${row.matchedProduct.partners?.name} / ${row.matchedProduct.name}`
                        : '-'}
                    </td>
                    <td className="px-4 py-2 text-right font-bold">{Number(row.unitPrice).toLocaleString()}</td>
                    <td className="px-4 py-2">{row.validFrom}</td>
                    <td className="px-4 py-2 text-gray-500">{row.reason}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || rows.some(r => r.unitPrice && !r.isValid) || rows.every(r => !r.unitPrice)}
              className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '処理中...' : '一括登録/更新を実行'}
            </button>
          </div>
        </div>
      )}

      {resultMsg && (
        <div className={`p-4 rounded-md ${resultMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {resultMsg.text}
        </div>
      )}
    </div>
  )
}