'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// 戻り値の型定義
export type State = {
  error?: string | null
  message?: string | null
}

export async function login(prevState: State, formData: FormData) {
  const supabase = await createClient()

  // フォームから入力値を取得
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Supabaseにログインリクエスト
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // リダイレクトせず、エラー内容を返して画面にとどまらせる
    return { error: 'メールアドレスまたはパスワードが間違っています。' }
  }

  // 成功時のみリダイレクト
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}