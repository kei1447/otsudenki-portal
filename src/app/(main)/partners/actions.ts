'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 取引先データの型定義
export type Partner = {
  id: string
  name: string
  code: string | null
  address: string | null
  phone: string | null
  memo: string | null
  closing_date: number // ★追加
}

// 一覧取得
export async function getPartners() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partners')
    .select('*')
    .order('code', { ascending: true }) // コード順
    .order('created_at', { ascending: true }) // コードがなければ登録順

  return (data as Partner[]) || []
}

// 新規登録・更新 (Upsert)
export async function upsertPartner(data: Partial<Partner>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'ログインしていません' }

  const payload = {
    name: data.name,
    code: data.code,
    address: data.address,
    phone: data.phone,
    memo: data.memo,
    closing_date: data.closing_date || 99, // デフォルト末締め
    updated_at: new Date().toISOString()
  }

  let error
  if (data.id) {
    // 更新
    const res = await supabase.from('partners').update(payload).eq('id', data.id)
    error = res.error
  } else {
    // 新規登録
    const res = await supabase.from('partners').insert(payload)
    error = res.error
  }

  if (error) {
    console.error('Partner Upsert Error:', error)
    return { success: false, message: '保存エラー: ' + error.message }
  }

  revalidatePath('/partners')
  revalidatePath('/inventory') // 入荷・出荷画面のプルダウンも更新
  return { success: true, message: '保存しました' }
}

// 削除
export async function deletePartner(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'ログインしていません' }

  const { error } = await supabase.from('partners').delete().eq('id', id)

  if (error) {
    return { success: false, message: '削除エラー: ' + error.message }
  }

  revalidatePath('/partners')
  return { success: true, message: '削除しました' }
}