'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type BulkRegistrationResult = {
  success: boolean
  message: string
  count?: number
  updatedCount?: number // 更新件数も返すようにする
}

// 登録データの型定義
type PriceInput = {
  product_id: number
  unit_price: number
  valid_from: string
  reason?: string
}

export async function bulkUpsertPrices(data: PriceInput[]): Promise<BulkRegistrationResult> {
  const supabase = await createClient()
  
  // 1. ユーザー確認
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'ログインしていません' }

  // 2. 権限確認
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const defaultStatus = (profile?.role === 'admin' || profile?.role === 'manager') 
    ? 'active' 
    : 'pending'

  let insertCount = 0
  let updateCount = 0

  try {
    // 3. ループ処理で1件ずつ「確認 -> 登録or更新」を行う
    // (件数が数千件レベルなら bulk upsert SQL の方が速いが、数百件ならこの方が安全確実)
    for (const item of data) {
      
      // 同じ製品・同じ開始日のデータがあるか探す
      const { data: existing } = await supabase
        .from('prices')
        .select('id')
        .eq('product_id', item.product_id)
        .eq('valid_from', item.valid_from)
        .single()

      if (existing) {
        // --- ある場合：更新 (UPDATE) ---
        const { error } = await supabase
          .from('prices')
          .update({
            unit_price: item.unit_price,
            reason: item.reason || null,
            // 修正時はステータスをどうするか？
            // Adminならそのままactive維持でもいいが、金額が変わるので再承認フローに載せるか？
            // ここでは「AdminならActive、それ以外はPending」にリセットする仕様にします
            status: defaultStatus, 
            created_by: user.id, // 最終更新者として記録
            approved_by: defaultStatus === 'active' ? user.id : null,
            approved_at: defaultStatus === 'active' ? new Date().toISOString() : null,
          })
          .eq('id', existing.id)

        if (error) throw error
        updateCount++

      } else {
        // --- ない場合：新規登録 (INSERT) ---
        const { error } = await supabase
          .from('prices')
          .insert({
            product_id: item.product_id,
            unit_price: item.unit_price,
            valid_from: item.valid_from,
            reason: item.reason || null,
            status: defaultStatus,
            created_by: user.id,
            approved_by: defaultStatus === 'active' ? user.id : null,
            approved_at: defaultStatus === 'active' ? new Date().toISOString() : null,
          })
        
        if (error) throw error
        insertCount++
      }
    }

    revalidatePath('/prices')
    return { 
      success: true, 
      message: '処理完了', 
      count: insertCount, 
      updatedCount: updateCount 
    }

  } catch (error: any) {
    console.error('Bulk Upsert Error:', error)
    return { success: false, message: 'エラーが発生しました: ' + error.message }
  }
}