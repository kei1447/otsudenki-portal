'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import OperationPanel from './operation-panel'
import InventoryList from './inventory-list'
import { 
  getRawStockProductsByPartner, 
  getDefectiveProductsByPartner,
  getAllInventory 
} from './actions'

// 取引先型定義
type Partner = { id: string, name: string }

export default function InventoryPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('')
  
  // 各種データ
  const [inventory, setInventory] = useState<any[]>([])
  const [rawProducts, setRawProducts] = useState<any[]>([])
  const [defectiveProducts, setDefectiveProducts] = useState<any[]>([])
  
  const [isLoading, setIsLoading] = useState(true)

  // 初期ロード (取引先一覧 ＆ 全在庫)
  useEffect(() => {
    const loadInit = async () => {
      const supabase = createClient()
      
      // 1. 取引先取得
      const { data: pData } = await supabase
        .from('partners')
        .select('id, name')
        .order('code')
      setPartners(pData || [])
      
      // デフォルトで最初の取引先を選択
      if (pData && pData.length > 0) {
        setSelectedPartnerId(pData[0].id)
      }

      // 2. 在庫一覧取得
      const invData = await getAllInventory()
      setInventory(invData)
      
      setIsLoading(false)
    }
    loadInit()
  }, [])

  // 取引先変更時に、操作パネル用の詳細データを取得
  useEffect(() => {
    if (!selectedPartnerId) return

    const loadDetails = async () => {
      const [raw, defective] = await Promise.all([
        getRawStockProductsByPartner(selectedPartnerId),
        getDefectiveProductsByPartner(selectedPartnerId)
      ])
      setRawProducts(raw)
      setDefectiveProducts(defective)
    }
    loadDetails()
  }, [selectedPartnerId])

  // データリロード用ハンドラ (操作パネルでの更新後に呼ぶ)
  const handleRefresh = async () => {
    // 在庫一覧を更新
    const invData = await getAllInventory()
    setInventory(invData)
    
    // 操作パネル用データも更新
    if (selectedPartnerId) {
      const [raw, defective] = await Promise.all([
        getRawStockProductsByPartner(selectedPartnerId),
        getDefectiveProductsByPartner(selectedPartnerId)
      ])
      setRawProducts(raw)
      setDefectiveProducts(defective)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">業務管理 (入出荷・在庫)</h1>
        
        {/* 取引先切り替えプルダウン */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-gray-600">操作対象:</label>
          <select 
            className="border rounded px-3 py-2 bg-white shadow-sm min-w-[200px]"
            value={selectedPartnerId}
            onChange={(e) => setSelectedPartnerId(e.target.value)}
          >
            {partners.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. 操作パネル (受入・加工・出荷など) */}
      <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
        {!selectedPartnerId ? (
          <div className="text-center text-gray-400 py-8">取引先を選択してください</div>
        ) : (
          <OperationPanel 
            partnerId={selectedPartnerId}
            rawProducts={rawProducts}
            defectiveProducts={defectiveProducts}
            // 操作後に一覧を更新するためにkeyを変えるテクニック、またはリロード関数を渡す設計も可
            // 今回はシンプルにデータ更新のみ行います
          />
        )}
      </div>

      {/* 2. 在庫一覧リスト (下部) */}
      <div className="space-y-2">
        <div className="flex justify-between items-end px-2">
          <h2 className="text-lg font-bold text-gray-700">最新の在庫状況</h2>
          <button 
            onClick={handleRefresh}
            className="text-sm text-blue-600 hover:underline"
          >
            情報を更新
          </button>
        </div>
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          {isLoading ? (
            <div className="text-center py-10 text-gray-500">読み込み中...</div>
          ) : (
            <InventoryList inventory={inventory} />
          )}
        </div>
      </div>
    </div>
  )
}