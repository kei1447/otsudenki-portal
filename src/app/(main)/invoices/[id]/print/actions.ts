'use server';

import { createClient } from '@/utils/supabase/server';

// 請求書詳細（印刷用）
export async function getInvoiceForPrint(invoiceId: string) {
    const supabase = await createClient();

    // 請求書ヘッダー取得
    const { data: invoice } = await supabase
        .from('invoices')
        .select(`*, partners ( name, address, phone )`)
        .eq('id', invoiceId)
        .single();

    if (!invoice) return null;

    // 関連する出荷データを取得
    const { data: shipments } = await supabase
        .from('shipments')
        .select(`
      id,
      shipment_date,
      delivery_note_number,
      total_amount,
      shipment_items (
        id,
        quantity,
        unit_price,
        line_total,
        products ( name, product_code, color_text )
      )
    `)
        .eq('invoice_id', invoiceId)
        .order('shipment_date', { ascending: true });

    return {
        ...invoice,
        shipments: shipments || [],
    };
}
