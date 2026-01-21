import { createClient } from '@/utils/supabase/server'
import OperationPanel from './operation-panel'
import InventoryList from './inventory-list'

export default async function InventoryPage() {
  const supabase = await createClient()

  // 1. 在庫データ取得 (直近の更新順に50件程度など、表示用のみ取得)
  const { data: inventory } = await supabase
    .from('inventory')
    .select(`
      *,
      products (
        id, name, product_code, color,
        partners ( name )
      )
    `)
    .order('last_updated_at', { ascending: false })
    .limit(100) // 全件表示は重いので、直近100件に絞るのが一般的

  // 2. 製品リスト取得は「削除」します（OperationPanel内で動的に取得するため）

  // 3. 取引先リスト
  const { data: partners } = await supabase
    .from('partners')
    .select('id, name')
    .order('name')

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">業務管理</h1>
        <p className="text-gray-600 mt-2">
          受入・加工・出荷の登録を行います。
        </p>
      </div>

      {/* 操作パネル */}
      <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
        <OperationPanel partners={partners || []} />
      </div>

      {/* 在庫一覧 */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">最新の在庫状況 (直近更新)</h2>
        <InventoryList inventory={inventory || []} />
      </div>
    </div>
  )
}