'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 更新用データ型
type ProductUpdateInput = {
  id: number
  product_code: string // 修正
  name: string
  color: string | null // 修正
  memo: string | null
  is_discontinued: boolean
}

export async function updateProducts(data: ProductUpdateInput[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'ログインしていません' }

  let successCount = 0

  try {
    for (const item of data) {
      const { error } = await supabase
        .from('products')
        .update({
          product_code: item.product_code, // 修正
          name: item.name,
          color: item.color, // 修正
          memo: item.memo,
          is_discontinued: item.is_discontinued,
        })
        .eq('id', item.id)

      if (error) throw error
      successCount++
    }

    revalidatePath('/products')
    revalidatePath('/prices') 
    
    return { success: true, message: `${successCount}件の製品情報を更新しました` }

  } catch (error: any) {
    console.error('Update Error:', error)
    return { success: false, message: '更新エラー: ' + error.message }
  }
}