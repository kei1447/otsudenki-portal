'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getProducts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*, partners(id, name)')
    .order('product_code');

  // 安全な型変換
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?.map((d: any) => ({
      ...d,
      partners: Array.isArray(d.partners) ? d.partners[0] : d.partners,
    })) || []
  );
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  const rawData = {
    partner_id: formData.get('partner_id'),
    name: formData.get('name'),
    product_code: formData.get('product_code'),
    color_text: formData.get('color_text'),
    unit_weight: Number(formData.get('unit_weight')) || 0,
    surface_area: Number(formData.get('surface_area')) || 0,
    memo: formData.get('memo'),
    material_memo: formData.get('material_memo'),
    process_memo: formData.get('process_memo'),
    is_discontinued: formData.get('is_discontinued') === 'true',
  };

  try {
    const { data: product, error } = await supabase.from('products').insert(rawData).select().single();
    if (error) throw error;

    // Initialize inventory
    await supabase.from('inventory').insert({
      product_id: product.id,
      stock_raw: 0,
      stock_finished: 0,
      stock_defective: 0
    });

    revalidatePath('/products');
    return { success: true, message: '登録しました' };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient();

  const rawData = {
    partner_id: formData.get('partner_id'),
    name: formData.get('name'),
    product_code: formData.get('product_code'),
    color_text: formData.get('color_text'),
    unit_weight: Number(formData.get('unit_weight')) || 0,
    surface_area: Number(formData.get('surface_area')) || 0,
    memo: formData.get('memo'),
    material_memo: formData.get('material_memo'),
    process_memo: formData.get('process_memo'),
    is_discontinued: formData.get('is_discontinued') === 'true',
  };

  try {
    const { error } = await supabase
      .from('products')
      .update(rawData)
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/products');
    return { success: true, message: '更新しました' };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/products');
    return { success: true, message: '削除しました' };
  } catch (e: unknown) {
    return { success: false, message: e instanceof Error ? e.message : 'Unknown error' };
  }
}
