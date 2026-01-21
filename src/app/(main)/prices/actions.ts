'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPrices() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('prices')
    .select(
      `
      *,
      products ( name, product_code, color )
    `
    )
    .order('valid_from', { ascending: false });

  return (
    data?.map((d) => ({
      ...d,
      products: Array.isArray(d.products) ? d.products[0] : d.products,
    })) || []
  );
}

export async function createPrice(formData: FormData) {
  const supabase = await createClient();
  const rawData = {
    product_id: formData.get('product_id'),
    unit_price: formData.get('unit_price'),
    valid_from: formData.get('valid_from'),
    status: 'active',
  };

  try {
    const { error } = await supabase.from('prices').insert(rawData);
    if (error) throw error;
    revalidatePath('/prices');
    return { success: true, message: '登録しました' };
  } catch (e: unknown) {
    return { success: false, message: (e instanceof Error ? e.message : 'Unknown error') };
  }
}

export async function deletePrice(id: string) {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('prices').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/prices');
    return { success: true, message: '削除しました' };
  } catch (e: unknown) {
    return { success: false, message: (e instanceof Error ? e.message : 'Unknown error') };
  }
}
