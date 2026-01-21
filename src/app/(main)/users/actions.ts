'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateUserRole(userId: string, newRole: string) {
  const supabase = await createClient();

  // 実行者の権限チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'ログインしていません' };

  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentUserProfile?.role !== 'admin') {
    return { success: false, message: '権限変更は管理者のみ可能です' };
  }

  // 更新実行
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/users');
  return { success: true, message: '権限を更新しました' };
}
