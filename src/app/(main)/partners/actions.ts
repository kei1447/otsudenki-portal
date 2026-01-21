'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// 取引先一覧取得
export async function getPartners() {
  const supabase = await createClient();
  const { data } = await supabase.from('partners').select('*').order('code');
  return data || [];
}

// 取引先登録
export async function createPartner(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const code = formData.get('code') as string;
  const address = formData.get('address') as string;
  const phone = formData.get('phone') as string;
  const memo = formData.get('memo') as string;
  // 締め日は数値変換。空なら99(末)
  const closingDate = Number(formData.get('closing_date') || 99);

  try {
    const { error } = await supabase.from('partners').insert({
      name,
      code,
      address,
      phone,
      memo,
      closing_date: closingDate,
    });
    if (error) throw error;
    revalidatePath('/partners');
    return { success: true, message: '登録しました' };
  } catch (e: unknown) {
    return { success: false, message: (e instanceof Error ? e.message : 'Unknown error') };
  }
}

// 取引先更新 (ここがエラーの原因でした)
export async function updatePartner(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const code = formData.get('code') as string;
  const address = formData.get('address') as string;
  const phone = formData.get('phone') as string;
  const memo = formData.get('memo') as string;
  const closingDate = Number(formData.get('closing_date') || 99);

  try {
    const { error } = await supabase
      .from('partners')
      .update({
        name,
        code,
        address,
        phone,
        memo,
        closing_date: closingDate,
      })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/partners');
    return { success: true, message: '更新しました' };
  } catch (e: unknown) {
    return { success: false, message: (e instanceof Error ? e.message : 'Unknown error') };
  }
}

// 取引先削除
export async function deletePartner(id: string) {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('partners').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/partners');
    return { success: true, message: '削除しました' };
  } catch {
    return {
      success: false,
      message: '削除エラー: 関連データがある可能性があります',
    };
  }
}
