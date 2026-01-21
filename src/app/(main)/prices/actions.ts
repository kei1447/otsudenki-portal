'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type PriceUpdateInput = {
  id: string // 既存データの更新用
  unit_price: number
  valid_from: string
  reason?: string
}

export async function updatePrices(data: PriceUpdateInput[]) {
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

  let successCount = 0

  try {
    // 3. 一括更新ループ
    for (const item of data) {
      const { error } = await supabase
        .from('prices')
        .update({
          unit_price: item.unit_price,
          valid_from: item.valid_from,
          reason: item.reason || null,
          // 修正時はステータスをリセット（再承認フローへ）
          status: defaultStatus, 
          created_by: user.id,
          approved_by: defaultStatus === 'active' ? user.id : null,
          approved_at: defaultStatus === 'active' ? new Date().toISOString() : null,
        })
        .eq('id', item.id)

      if (error) throw error
      successCount++
    }

    revalidatePath('/prices')
    return { success: true, message: `${successCount}件のデータを更新しました` }

  } catch (error: any) {
    console.error('Update Error:', error)
    return { success: false, message: '更新エラー: ' + error.message }
  }
}