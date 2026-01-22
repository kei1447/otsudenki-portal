'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// 共通: 在庫がある製品のみ取得
// 共通: 完成と在庫がある製品のみ取得 (出荷登録用)
// 共通: 在庫がある製品のみ取得
// 共通: 完成と在庫がある製品のみ取得 (出荷登録用)
export async function getFinishedStockProductsByPartner(partnerId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('inventory')
    .select('stock_finished, products!inner(id, name, product_code, color_text, partner_id)')
    .gt('stock_finished', 0)
    .order('products(product_code)');

  if (partnerId) {
    query = query.eq('products.partner_id', partnerId);
  }

  const { data } = await query;

  return (
    data?.map((d) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = d.products as any;
      return {
        id: p.id,
        name: p.name,
        product_code: p.product_code,
        color_text: p.color_text,
        stock_finished: d.stock_finished,
      };
    }) || []
  );
}

// 共通: 生地在庫がある製品 ＋ 入荷履歴リスト を取得
export async function getRawStockProductsByPartner(partnerId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('inventory')
    .select(
      'product_id, stock_raw, products!inner(id, name, product_code, color_text, partner_id)'
    )
    .gt('stock_raw', 0)
    .order('products(product_code)');

  if (partnerId) {
    query = query.eq('products.partner_id', partnerId);
  }

  const { data: stockData } = await query;

  if (!stockData || stockData.length === 0) return [];

  const productIds = stockData.map((d) => d.product_id);
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('product_id, created_at, quantity_change, due_date')
    .in('product_id', productIds)
    .eq('movement_type', 'receiving')
    .order('created_at', { ascending: false })
    .limit(300);

  return stockData.map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = item.products as any;
    const arrivals =
      movements
        ?.filter((m) => m.product_id === item.product_id)
        .slice(0, 5)
        .map((m) => {
          const date = new Date(m.created_at).toLocaleDateString('ja-JP', {
            month: 'numeric',
            day: 'numeric',
          });
          const due = m.due_date
            ? `(納期:${new Date(m.due_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })})`
            : '';
          return {
            label: `${date}${due} : ${m.quantity_change}個入荷`,
            value: new Date(m.created_at).toISOString().split('T')[0],
          };
        }) || [];

    return {
      id: p.id,
      name: p.name,
      product_code: p.product_code,
      color_text: p.color_text,
      stock_raw: item.stock_raw,
      arrivals: arrivals,
    };
  });
}

// 追加: 取引先に紐づく全製品情報 (在庫0でも受入候補として表示するため)
// 戻り値の型は getRawStockProductsByPartner と揃える (在庫0とする)
export async function getProductsByPartner(partnerId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('products')
    .select('id, name, product_code, color_text')
    .eq('is_discontinued', false)
    .order('product_code');

  if (partnerId) {
    query = query.eq('partner_id', partnerId);
  }

  const { data } = await query;

  if (!data) return [];

  // 現在の在庫数を一括取得
  const productIds = data.map((p) => p.id);
  // Empty check
  if (productIds.length === 0) return [];

  const { data: stockData } = await supabase
    .from('inventory')
    .select('product_id, stock_raw')
    .in('product_id', productIds);

  const stockMap = new Map();
  stockData?.forEach((s) => stockMap.set(s.product_id, s.stock_raw));

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    product_code: p.product_code,
    color_text: p.color_text,
    stock_raw: stockMap.get(p.id) || 0,
    arrivals: [] as { label: string; value: string }[],
  }));
}

// 共通: 不良在庫がある製品 ＋ 詳細
export async function getDefectiveProductsByPartner(partnerId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('inventory')
    .select(
      'product_id, stock_defective, products!inner(id, name, product_code, color_text, partner_id)'
    )
    .gt('stock_defective', 0)
    .order('products(product_code)');

  if (partnerId) {
    query = query.eq('products.partner_id', partnerId);
  }

  const { data: stockData } = await query;

  if (!stockData || stockData.length === 0) return [];

  const productIds = stockData.map((d) => d.product_id);
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select(
      'product_id, movement_type, quantity_change, defect_reason, created_at, due_date'
    )
    .in('product_id', productIds)
    .order('created_at', { ascending: false })
    .limit(300);

  return stockData.map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = item.products as any;
    const pLogs =
      movements?.filter((m) => m.product_id === item.product_id) || [];

    const defectLogs = pLogs
      .filter(
        (m) =>
          m.defect_reason !== null ||
          ['production_defective', 'defect_found'].includes(m.movement_type)
      )
      .slice(0, 3)
      .map((l) => ({
        reason: l.defect_reason || '理由なし',
        date: new Date(l.created_at).toLocaleDateString('ja-JP', {
          month: 'numeric',
          day: 'numeric',
        }),
      }));

    const arrivalLogs = pLogs
      .filter((m) => m.movement_type === 'receiving')
      .slice(0, 3)
      .map((l) => ({
        date: new Date(l.created_at).toLocaleDateString('ja-JP', {
          month: 'numeric',
          day: 'numeric',
        }),
        qty: l.quantity_change,
      }));

    return {
      id: p.id,
      name: p.name,
      product_code: p.product_code,
      color_text: p.color_text,
      stock_defective: item.stock_defective,
      recent_defects: defectLogs,
      recent_arrivals: arrivalLogs,
    };
  });
}



// 1. 受入登録
export async function registerReceiving(data: {
  productId: number;
  quantity: number;
  dueDate: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: '要ログイン' };

  try {
    await supabase.rpc('increment_stock', {
      p_product_id: data.productId,
      p_amount: data.quantity,
      p_field: 'stock_raw',
    });
    await supabase.from('inventory_movements').insert({
      product_id: data.productId,
      movement_type: 'receiving',
      quantity_change: data.quantity,
      due_date: data.dueDate,
      created_by: user.id,
    });
    revalidatePath('/inventory');
    return { success: true, message: '受入登録完了' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, message: msg };
  }
}

// 2. 加工実績登録
export async function registerProduction(data: {
  productId: number;
  rawUsed: number;
  finished: number;
  defective: number;
  defectReason?: string;
  sourceDate?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: '要ログイン' };

  try {
    const sourceMemo = data.sourceDate ? ` (入荷日: ${data.sourceDate})` : '';
    if (data.rawUsed > 0) {
      await supabase.rpc('increment_stock', {
        p_product_id: data.productId,
        p_amount: -data.rawUsed,
        p_field: 'stock_raw',
      });
      await supabase.from('inventory_movements').insert({
        product_id: data.productId,
        movement_type: 'production_raw',
        quantity_change: -data.rawUsed,
        reason: `加工投入${sourceMemo}`,
        created_by: user.id,
      });
    }
    if (data.finished > 0) {
      await supabase.rpc('increment_stock', {
        p_product_id: data.productId,
        p_amount: data.finished,
        p_field: 'stock_finished',
      });
      await supabase.from('inventory_movements').insert({
        product_id: data.productId,
        movement_type: 'production_finished',
        quantity_change: data.finished,
        reason: `良品完成${sourceMemo}`,
        created_by: user.id,
      });
    }
    if (data.defective > 0) {
      await supabase.rpc('increment_stock', {
        p_product_id: data.productId,
        p_amount: data.defective,
        p_field: 'stock_defective',
      });
      await supabase.from('inventory_movements').insert({
        product_id: data.productId,
        movement_type: 'production_defective',
        quantity_change: data.defective,
        defect_reason: data.defectReason,
        reason: `不良発生${sourceMemo}`,
        created_by: user.id,
      });
    }
    revalidatePath('/inventory');
    return { success: true, message: '加工実績登録完了' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, message: msg };
  }
}

// 3. 出荷登録
export async function registerShipment(data: {
  partnerId: string;
  shipmentDate: string;
  items: { productId: number; quantity: number }[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: '要ログイン' };

  try {
    const { data: shipment, error: sErr } = await supabase
      .from('shipments')
      .insert({
        partner_id: data.partnerId,
        shipment_date: data.shipmentDate,
        status: 'confirmed',
        created_by: user.id,
      })
      .select()
      .single();
    if (sErr) throw sErr;

    let total = 0;
    for (const item of data.items) {
      const { data: price } = await supabase
        .from('prices')
        .select('unit_price')
        .eq('product_id', item.productId)
        .eq('status', 'active')
        .lte('valid_from', data.shipmentDate)
        .order('valid_from', { ascending: false })
        .limit(1)
        .single();

      const unitPrice = price?.unit_price || 0;
      const lineTotal = unitPrice * item.quantity;
      total += lineTotal;

      await supabase.from('shipment_items').insert({
        shipment_id: shipment.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
      });

      await supabase.rpc('increment_stock', {
        p_product_id: item.productId,
        p_amount: -item.quantity,
        p_field: 'stock_finished',
      });
      await supabase.from('inventory_movements').insert({
        product_id: item.productId,
        movement_type: 'shipping',
        quantity_change: -item.quantity,
        reason: `出荷No.${shipment.id.substring(0, 8)}`,
        created_by: user.id,
      });
    }

    await supabase
      .from('shipments')
      .update({ total_amount: total })
      .eq('id', shipment.id);
    revalidatePath('/inventory');
    return { success: true, message: '出荷登録完了' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, message: '出荷エラー: ' + msg };
  }
}

// 4. 不良品処理
export async function registerDefectiveProcessing(data: {
  productId: number;
  reworkQty: number;
  returnQty: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: '要ログイン' };

  try {
    if (data.reworkQty > 0) {
      await supabase.rpc('increment_stock', {
        p_product_id: data.productId,
        p_amount: -data.reworkQty,
        p_field: 'stock_defective',
      });
      await supabase.rpc('increment_stock', {
        p_product_id: data.productId,
        p_amount: data.reworkQty,
        p_field: 'stock_finished',
      });
      await supabase.from('inventory_movements').insert({
        product_id: data.productId,
        movement_type: 'repair',
        quantity_change: data.reworkQty,
        reason: '不良手直し完了',
        created_by: user.id,
      });
    }
    if (data.returnQty > 0) {
      await supabase.rpc('increment_stock', {
        p_product_id: data.productId,
        p_amount: -data.returnQty,
        p_field: 'stock_defective',
      });
      await supabase.from('inventory_movements').insert({
        product_id: data.productId,
        movement_type: 'return_defective',
        quantity_change: -data.returnQty,
        reason: '不良品返却',
        created_by: user.id,
      });
    }
    revalidatePath('/inventory');
    return { success: true, message: '処理完了' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, message: msg };
  }
}

// 履歴取得
export async function getProductHistory(productId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(20);
  return data || [];
}

// 履歴削除
export async function deleteMovement(movementId: string) {
  const supabase = await createClient();
  const { data: movement } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('id', movementId)
    .single();
  if (!movement) return { success: false, message: 'データなし' };

  let field = '';
  switch (movement.movement_type) {
    case 'receiving':
      field = 'stock_raw';
      break;
    case 'production_raw':
      field = 'stock_raw';
      break;
    case 'production_finished':
      field = 'stock_finished';
      break;
    case 'production_defective':
      field = 'stock_defective';
      break;
    case 'shipping':
      field = 'stock_finished';
      break;
    case 'repair':
      try {
        await supabase.rpc('increment_stock', {
          p_product_id: movement.product_id,
          p_amount: -movement.quantity_change,
          p_field: 'stock_finished',
        });
        await supabase.rpc('increment_stock', {
          p_product_id: movement.product_id,
          p_amount: movement.quantity_change,
          p_field: 'stock_defective',
        });
        await supabase
          .from('inventory_movements')
          .delete()
          .eq('id', movementId);
        revalidatePath('/inventory');
        return { success: true, message: '取り消しました' };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return { success: false, message: msg };
      }
    case 'return_defective':
      field = 'stock_defective';
      break;
    default:
      return { success: false, message: '削除不可' };
  }

  const reverseAmount = -movement.quantity_change;
  try {
    await supabase.rpc('increment_stock', {
      p_product_id: movement.product_id,
      p_amount: reverseAmount,
      p_field: field,
    });
    await supabase.from('inventory_movements').delete().eq('id', movementId);
    revalidatePath('/inventory');
    return { success: true, message: '取り消しました' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, message: msg };
  }
}

// 全体履歴取得
export async function getGlobalHistory() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('inventory_movements')
    .select(`*, products ( name, product_code, color, partners ( name ) )`)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

// 一括削除
export async function bulkDeleteMovements(ids: string[]) {
  let successCount = 0;
  let errorCount = 0;
  for (const id of ids) {
    const res = await deleteMovement(id);
    if (res.success) successCount++;
    else errorCount++;
  }
  revalidatePath('/inventory');
  return {
    success: true,
    message: `${successCount}件成功 ${errorCount > 0 ? `(${errorCount}件失敗)` : ''}`,
  };
}

// 履歴完全削除（物理削除）
export async function purgeMovements(ids: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('inventory_movements')
    .delete()
    .in('id', ids);
  if (error) return { success: false, message: '削除エラー: ' + error.message };
  revalidatePath('/inventory');
  return {
    success: true,
    message: `${ids.length}件の履歴を完全に削除しました`,
  };
}

// 納品書データの取得 (印刷用)
export async function getShipmentForPrint(shipmentId: string) {
  const supabase = await createClient();
  const { data: shipment } = await supabase
    .from('shipments')
    .select(`*, partners ( name, address, phone )`)
    .eq('id', shipmentId)
    .single();

  if (!shipment) return null;
  const { data: items } = await supabase
    .from('shipment_items')
    .select(`*, products ( name, product_code, color, unit_weight )`)
    .eq('shipment_id', shipmentId)
    .order('products(product_code)');
  return { ...shipment, items: items || [] };
}

// 直近の出荷履歴を取得 (出荷画面表示用)
export async function getRecentShipments(partnerId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('shipments')
    .select('id, shipment_date, total_amount, partners(name), created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  if (partnerId) query = query.eq('partner_id', partnerId);
  const { data } = await query;
  return data || [];
}

// 納品書一覧の取得 (管理画面用)
export async function getShipmentList() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shipments')
    .select(`*, partners ( name )`)
    .order('shipment_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);
  return data || [];
}

// 納品書の取り消し
export async function deleteShipment(shipmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: '要ログイン' };
  const { data: shipment } = await supabase
    .from('shipments')
    .select('*, shipment_items(*)')
    .eq('id', shipmentId)
    .single();
  if (!shipment) return { success: false, message: 'データが見つかりません' };

  try {
    for (const item of shipment.shipment_items) {
      await supabase.rpc('increment_stock', {
        p_product_id: item.product_id,
        p_amount: item.quantity,
        p_field: 'stock_finished',
      });
      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        movement_type: 'shipping_cancel',
        quantity_change: item.quantity,
        reason: `納品書取消(No.${shipment.id.substring(0, 8)})`,
        created_by: user.id,
      });
    }
    const { error } = await supabase
      .from('shipments')
      .delete()
      .eq('id', shipmentId);
    if (error) throw error;
    revalidatePath('/inventory');
    revalidatePath('/shipments');
    return { success: true, message: '納品書を取り消しました' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, message: '削除エラー: ' + msg };
  }
}

// 請求書作成候補の検索
export type InvoiceCandidate = {
  partner: { id: string; name: string };
  shipment_count: number;
  total_amount_excl_tax: number;
};
export async function getUnbilledSummary(
  closingDate: number,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();
  const { data: shipments } = await supabase
    .from('shipments')
    .select(`total_amount, partners!inner ( id, name, closing_date )`)
    .is('invoice_id', null)
    .eq('partners.closing_date', closingDate)
    .gte('shipment_date', startDate)
    .lte('shipment_date', endDate);

  if (!shipments) return [];

  const summaryMap = new Map<string, InvoiceCandidate>();

  shipments.forEach((s) => {
    // ★修正: 型エラー回避のために any にキャストして安全にアクセス
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = s.partners as any;
    const pId = p.id;

    if (!summaryMap.has(pId)) {
      summaryMap.set(pId, {
        partner: { id: pId, name: p.name },
        shipment_count: 0,
        total_amount_excl_tax: 0,
      });
    }
    const current = summaryMap.get(pId)!;
    current.shipment_count += 1;
    current.total_amount_excl_tax += s.total_amount;
  });

  return Array.from(summaryMap.values());
}

// 未請求出荷データ（詳細）取得
export async function getUnbilledShipments(
  partnerId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();
  const { data: shipments } = await supabase
    .from('shipments')
    .select(
      `
      id, shipment_date, delivery_note_number, total_amount,
      shipment_items ( id, quantity, unit_price, line_total, products ( name, product_code, color ) ),
      partners ( name )
    `
    )
    .eq('partner_id', partnerId)
    .is('invoice_id', null)
    .gte('shipment_date', startDate)
    .lte('shipment_date', endDate)
    .order('shipment_date', { ascending: true });
  return shipments || [];
}

// 請求書作成（確定）
export async function createSingleInvoice(
  partnerId: string,
  periodStart: string,
  periodEnd: string,
  totalExclTax: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: '要ログイン' };
  try {
    const subtotal = totalExclTax;
    const tax = Math.floor(subtotal * 0.1);
    const total = subtotal + tax;
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        partner_id: partnerId,
        period_start: periodStart,
        period_end: periodEnd,
        issue_date: new Date().toISOString(),
        subtotal: subtotal,
        tax_amount: tax,
        total_amount: total,
        status: 'confirmed',
        created_by: user.id,
      })
      .select()
      .single();
    if (invError) throw invError;
    const { error: shipError } = await supabase
      .from('shipments')
      .update({ invoice_id: invoice.id })
      .eq('partner_id', partnerId)
      .is('invoice_id', null)
      .gte('shipment_date', periodStart)
      .lte('shipment_date', periodEnd);
    if (shipError) throw shipError;
    revalidatePath('/invoices');
    return { success: true, message: '請求書を作成しました' };
  } catch (e: unknown) {
    return { success: false, message: '作成エラー: ' + (e instanceof Error ? e.message : 'Unknown error') };
  }
}

// 請求書一覧取得
export async function getInvoices() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('invoices')
    .select(`*, partners ( name )`)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

// 全在庫データの取得 (型エラー回避済み)
export async function getAllInventory() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('inventory')
    .select(
      `
      stock_raw,
      stock_finished,
      stock_defective,
      last_updated_at,
      products!inner (
        id,
        name,
        product_code,
        color,
        partners ( name )
      )
    `
    )
    .order('last_updated_at', { ascending: false });

  return (
    data?.map((d) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = d.products as any;
      const partner = Array.isArray(p.partners) ? p.partners[0] : p.partners;

      return {
        product_id: p.id,
        stock_raw: d.stock_raw,
        stock_finished: d.stock_finished,
        stock_defective: d.stock_defective,
        last_updated_at: d.last_updated_at,
        products: {
          name: p.name,
          product_code: p.product_code,
          color: p.color,
          partners: partner,
        },
      };
    }) || []
  );
}
