'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type State = {
  error?: string | null
  message?: string | null
}

export async function createPrice(prevState: State, formData: FormData) {
  const supabase = await createClient()

  const product_id = formData.get('product_id')
  const unit_price = formData.get('unit_price')
  const valid_from = formData.get('valid_from')
  const reason = formData.get('reason')

  if (!product_id || !unit_price || !valid_from) {
    return { error: '必須項目が入力されていません。' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ログインしていません' }

  // 権限チェック (Admin/Managerはactive, Staffはpending)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const initialStatus = (profile?.role === 'admin' || profile?.role === 'manager') 
    ? 'active' 
    : 'pending'

  // DB登録
  const { error } = await supabase.from('prices').insert({
    product_id: Number(product_id),
    unit_price: Number(unit_price),
    valid_from: String(valid_from),
    reason: String(reason) || null,
    status: initialStatus,
    created_by: user.id,
    approved_by: initialStatus === 'active' ? user.id : null,
    approved_at: initialStatus === 'active' ? new Date().toISOString() : null,
  })

  if (error) {
    return { error: '登録に失敗しました: ' + error.message }
  }

  revalidatePath('/prices')
  redirect('/prices')
}