'use server';

import { createClient, getAuthUser } from '@/utils/supabase/server';
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
            quantity: m.quantity_change,
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
    .limit(1000);

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
  arrivalDate?: string;
}) {
  const supabase = await createClient();
  const { user } = await getAuthUser();
  if (!user) return { success: false, message: '要ログイン' };

  try {
    await supabase.rpc('increment_stock', {
      p_product_id: data.productId,
      p_amount: data.quantity,
      p_field: 'stock_raw',
    });

    // arrivalDateがあれば時刻を含める（一日の終わりにするか、現在時刻にするかは要件次第だが、通常は日付指定なら00:00 or 12:00JST）
    // SupabaseはTimestamptz. string 'YYYY-MM-DD' を渡すと UTC 00:00 になる可能性がある。
    // User expects JST.
    // However, simpler is to just pass the string if it's YYYY-MM-DD, DB might interpret it.
    // Better to append time if we want to be safe, but existing code uses `created_at` default.
    // Let's assume input is YYYY-MM-DD.

    const insertData: any = {
      product_id: data.productId,
      movement_type: 'receiving',
      quantity_change: data.quantity,
      due_date: data.dueDate,
      created_by: user.id,
    };

    if (data.arrivalDate) {
      insertData.created_at = data.arrivalDate; // YYYY-MM-DD input, Postgres tolerates it
    }

    await supabase.from('inventory_movements').insert(insertData);
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
  const { user } = await getAuthUser();
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

// 2.5 加工実績一括登録
export async function registerBulkProduction(
  items: {
    productId: number;
    rawUsed: number;
    finished: number;
    defective: number;
    defectReason?: string;
    sourceDate?: string;
  }[]
) {
  let successCount = 0;
  let errorCount = 0;

  for (const item of items) {
    const res = await registerProduction(item);
    if (res.success) successCount++;
    else errorCount++;
  }

  revalidatePath('/inventory');
  return {
    success: true,
    message: `${successCount}件の登録に成功しました${errorCount > 0 ? ` (${errorCount}件失敗)` : ''}`,
  };
}

// 3. 出荷登録
// 統合: 通常出荷(Finished)と不良返却(Defective)を扱う
// type: 'standard' | 'return_billable' | 'return_free'
// ★重要: partnerIdパラメータは参考用。実際は各製品のpartner_idを使用して自動グルーピング
export async function registerShipment(data: {
  partnerId: string; // 参考用（UIから渡されるが、実際は製品のpartner_idを使用）
  items: { productId: number; quantity: number; unitPrice?: number }[];
  date: string; // YYYY-MM-DD
  type?: 'standard' | 'return_billable' | 'return_free';
  reason?: string;
}) {
  const supabase = await createClient();
  const { user } = await getAuthUser();
  if (!user) return { success: false, message: '要ログイン' };
  if (data.items.length === 0) return { success: false, message: '出荷アイテムがありません' };

  try {
    const shipmentType = data.type || 'standard';
    const shipmentReason = data.reason || '';

    // 1. 製品ごとの取引先IDを取得
    const productIds = data.items.map(i => i.productId);
    const { data: products } = await supabase
      .from('products')
      .select('id, partner_id')
      .in('id', productIds);

    if (!products || products.length === 0) {
      return { success: false, message: '製品情報の取得に失敗しました' };
    }

    // 製品ID → 取引先ID のマッピング
    const productPartnerMap: Record<number, string> = {};
    products.forEach(p => {
      productPartnerMap[p.id] = p.partner_id;
    });

    // 2. アイテムを取引先別にグルーピング
    const itemsByPartner: Record<string, typeof data.items> = {};
    for (const item of data.items) {
      const partnerId = productPartnerMap[item.productId];
      if (!partnerId) {
        return { success: false, message: `製品ID ${item.productId} の取引先が見つかりません` };
      }
      if (!itemsByPartner[partnerId]) {
        itemsByPartner[partnerId] = [];
      }
      itemsByPartner[partnerId].push(item);
    }

    const partnerIds = Object.keys(itemsByPartner);
    const createdShipmentIds: string[] = [];

    // 3. 取引先ごとに納品書を作成
    for (const partnerId of partnerIds) {
      const partnerItems = itemsByPartner[partnerId];

      // 同日・同取引先の出荷伝票を探す (Consolidation)
      const { data: existingShipment } = await supabase
        .from('shipments')
        .select('id, total_amount')
        .eq('partner_id', partnerId)
        .eq('shipment_date', data.date)
        .eq('status', 'confirmed')
        .maybeSingle();

      let shipmentId = existingShipment?.id;

      // ない場合のみ作成
      if (!shipmentId) {
        const { data: newShipment, error: shipError } = await supabase
          .from('shipments')
          .insert({
            partner_id: partnerId,
            shipment_date: data.date,
            status: 'confirmed',
            total_amount: 0,
            created_by: user.id,
          })
          .select()
          .single();

        if (shipError) throw shipError;
        shipmentId = newShipment.id;
      }

      createdShipmentIds.push(shipmentId);

      let addedAmount = 0;

      // 4. 明細登録 & 在庫引き落とし
      for (const item of partnerItems) {
        // 単価決定ロジック
        let unitPrice = item.unitPrice || 0;

        if (shipmentType === 'return_free') {
          unitPrice = 0;
        } else if (unitPrice === 0) {
          // unitPriceが指定されていない場合はマスタから取得
          const { data: priceData } = await supabase
            .from('prices')
            .select('unit_price')
            .eq('product_id', item.productId)
            .eq('status', 'active')
            .lte('valid_from', data.date)
            .order('valid_from', { ascending: false })
            .limit(1)
            .single();

          unitPrice = priceData?.unit_price || 0;
        }

        const lineTotal = unitPrice * item.quantity;
        addedAmount += lineTotal;

        // 明細追加
        await supabase.from('shipment_items').insert({
          shipment_id: shipmentId,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
        });

        // 在庫引き落とし & パンくず (Inventory Movement)
        if (shipmentType === 'standard') {
          // 良品在庫から引き落とし
          await supabase.rpc('increment_stock', {
            p_product_id: item.productId,
            p_amount: -item.quantity,
            p_field: 'stock_finished',
          });
          await supabase.from('inventory_movements').insert({
            product_id: item.productId,
            movement_type: 'shipping',
            quantity_change: -item.quantity,
            created_by: user.id,
          });
        } else {
          // 不良在庫から引き落とし (有償/無償返却)
          await supabase.rpc('increment_stock', {
            p_product_id: item.productId,
            p_amount: -item.quantity,
            p_field: 'stock_defective',
          });
          await supabase.from('inventory_movements').insert({
            product_id: item.productId,
            movement_type: shipmentType,
            quantity_change: -item.quantity,
            defect_reason: shipmentReason,
            created_by: user.id,
          });
        }
      }

      // 合計金額更新
      if (existingShipment) {
        await supabase
          .from('shipments')
          .update({ total_amount: existingShipment.total_amount + addedAmount })
          .eq('id', shipmentId);
      } else {
        await supabase
          .from('shipments')
          .update({ total_amount: addedAmount })
          .eq('id', shipmentId);
      }
    }

    revalidatePath('/inventory');
    revalidatePath('/shipments');

    if (partnerIds.length === 1) {
      return { success: true, message: '出荷登録完了' };
    } else {
      return { success: true, message: `${partnerIds.length}社分の納品書を作成しました` };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    return { success: false, message: msg };
  }
}

// 4. 不良品処理 (修理完了・廃棄のみ)
// 返却(Shipment)は出荷登録へ移動
export async function registerDefectiveProcessing(data: {
  productId: number;
  quantity: number;
  processingType: 'repair' | 'dispose';
}) {
  const supabase = await createClient();
  const { user } = await getAuthUser();
  if (!user) return { success: false, message: '要ログイン' };

  try {
    if (data.processingType === 'repair') {
      // 修理完了: 不良在庫減、良品在庫増
      await supabase.rpc('increment_stock', {
        p_product_id: data.productId,
        p_amount: -data.quantity,
        p_field: 'stock_defective',
      });
      await supabase.rpc('increment_stock', {
        p_product_id: data.productId,
        p_amount: data.quantity,
        p_field: 'stock_finished',
      });

      await supabase.from('inventory_movements').insert({
        product_id: data.productId,
        movement_type: 'repair',
        quantity_change: data.quantity,
        created_by: user.id,
      });
      revalidatePath('/inventory');
      return { success: true, message: '手直し完了登録しました' };

    } else if (data.processingType === 'dispose') {
      // 廃棄: 不良在庫減
      await supabase.rpc('increment_stock', {
        p_product_id: data.productId,
        p_amount: -data.quantity,
        p_field: 'stock_defective',
      });
      await supabase.from('inventory_movements').insert({
        product_id: data.productId,
        movement_type: 'dispose',
        quantity_change: -data.quantity,
        created_by: user.id,
      });
      revalidatePath('/inventory');
      return { success: true, message: '廃棄登録しました' };
    }

    return { success: false, message: '不明な処理タイプ' };
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
} // End of deleteMovement

// 全体履歴取得
export async function getGlobalHistory() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('inventory_movements')
    .select(`*, products ( name, product_code, color_text, partners ( name ) )`)
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
    .select(`*, products ( name, product_code, color_text, unit_weight )`)
    .eq('shipment_id', shipmentId)
    .order('products(product_code)');

  if (!items) return { ...shipment, items: [], defectiveCounts: {} };

  // 不良返却の内訳を取得
  // shipment_date (YYYY-MM-DD) と一致する inventory_movements を探す
  // JSTでの日付一致が必要だが、とりあえずUTC日付範囲で検索して JS側でフィルタリングする

  const productIds = items.map(i => i.product_id);
  const targetDateStr = shipment.shipment_date; // YYYY-MM-DD

  // タイムゾーン考慮: targetDateStr の 00:00 JST から 24時間
  const start = new Date(`${targetDateStr}T00:00:00+09:00`);
  const end = new Date(`${targetDateStr}T23:59:59.999+09:00`);

  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('product_id, movement_type, quantity_change, created_at')
    .in('product_id', productIds)
    .in('movement_type', ['return_billable', 'return_free'])
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const defectiveCounts: Record<number, { billable: number; free: number }> = {};

  if (movements) {
    movements.forEach(m => {
      // movement_type は 'return_billable' | 'return_free'
      if (!defectiveCounts[m.product_id]) {
        defectiveCounts[m.product_id] = { billable: 0, free: 0 };
      }
      // quantity_changeは負の値(在庫減) OR 正? 
      // registerDefectiveProcessing では:
      // return_billable/free -> Stock decreases? OR increases?
      // "Defective Return" usually means Customer sends back to Us. So Stock Increases?
      // Wait. `registerDefectiveProcessing`:
      // `quantity` is passed.
      // `increment_stock` p_amount: quantity (for defective/finished?)
      // Wait. If it's a RETURN TO FACTORY (We send back), stock decr.
      // Defective Processing:
      // 'repair' -> Raw decr, Defective incr.
      // 'return_billable' -> Stock?
      // Let's check `registerDefectiveProcessing` implementation inside `actions.ts`.

      const qty = Math.abs(m.quantity_change); // use absolute just in case
      if (m.movement_type === 'return_billable') {
        defectiveCounts[m.product_id].billable += qty;
      } else if (m.movement_type === 'return_free') {
        defectiveCounts[m.product_id].free += qty;
      }
    });
  }

  return { ...shipment, items: items || [], defectiveCounts };
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

// 納品書の備考を更新
export async function updateShipmentRemarks(shipmentId: string, remarks: string) {
  const supabase = await createClient();
  const { user } = await getAuthUser();
  if (!user) return { success: false, message: '要ログイン' };

  const { error } = await supabase
    .from('shipments')
    .update({ remarks })
    .eq('id', shipmentId);

  if (error) return { success: false, message: 'エラー: ' + error.message };

  revalidatePath('/shipments');
  revalidatePath(`/shipments/${shipmentId}/print`);
  return { success: true, message: '備考を保存しました' };
}

// 納品書詳細の取得 (プレビュー用)
export async function getShipmentDetail(shipmentId: string) {
  const supabase = await createClient();

  const { data: shipment } = await supabase
    .from('shipments')
    .select(`*, partners ( name, address, phone )`)
    .eq('id', shipmentId)
    .single();

  if (!shipment) return null;

  const { data: items } = await supabase
    .from('shipment_items')
    .select(`*, products ( name, product_code, color_text )`)
    .eq('shipment_id', shipmentId)
    .order('id');

  return { ...shipment, items: items || [] };
}

// 納品書の取り消し
export async function deleteShipment(shipmentId: string) {
  const supabase = await createClient();
  const { user } = await getAuthUser();
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
      shipment_items ( id, quantity, unit_price, line_total, products ( name, product_code, color_text ) ),
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
  const { user } = await getAuthUser();
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
        color_text,
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
          color_text: p.color_text,
          partners: partner,
        },
      };
    }) || []
  );
}

// 12. ダッシュボード用データ取得
export async function getDashboardMetrics() {
  const supabase = await createClient();

  // 今日の日付 (JST)
  const now = new Date();
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
  const yyyyMm = today.substring(0, 7); // YYYY-MM

  // 1. 今日の出荷実績
  const { data: todayShipments } = await supabase
    .from('shipments')
    .select('id, total_amount')
    .eq('status', 'confirmed')
    .eq('shipment_date', today);

  const todayCount = todayShipments?.length || 0;
  const todayAmount = todayShipments?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

  // 2. 今月の出荷売上 (日付範囲で取得)
  const monthStart = `${yyyyMm}-01`;
  // 来月1日を算出 (月末+1日)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = nextMonth.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });

  const { data: monthShipments } = await supabase
    .from('shipments')
    .select('total_amount')
    .eq('status', 'confirmed')
    .gte('shipment_date', monthStart)
    .lt('shipment_date', monthEnd);

  const monthAmount = monthShipments?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

  // 3. 最近のアクティビティ (Movement)
  const { data: recentMovements } = await supabase
    .from('inventory_movements')
    .select(`
      id,
      created_at,
      movement_type,
      quantity_change,
      reason,
      products (
        name,
        product_code
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  // 4. 最近の出荷 (Shipment)
  const { data: recentShipments } = await supabase
    .from('shipments')
    .select(`
      id,
      shipment_date,
      total_amount,
      partners (
        name
      )
    `)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    today: {
      date: today,
      count: todayCount,
      amount: todayAmount,
    },
    month: {
      yyyymm: yyyyMm,
      amount: monthAmount,
    },
    recentMovements: recentMovements || [],
    recentShipments: recentShipments || [],
  };
}

// 13. 在庫調整用: 取引先別の全製品在庫を取得
export async function getInventoryForAdjustment(partnerId: string) {
  const supabase = await createClient();

  // 取引先の全製品を取得（在庫有無に関わらず）
  const { data: products } = await supabase
    .from('products')
    .select('id, name, product_code, color_text, is_discontinued')
    .eq('partner_id', partnerId)
    .eq('is_discontinued', false)
    .order('product_code');

  if (!products || products.length === 0) return [];

  const productIds = products.map((p) => p.id);

  // 在庫データを取得
  const { data: inventoryData } = await supabase
    .from('inventory')
    .select('product_id, stock_raw, stock_finished, stock_defective')
    .in('product_id', productIds);

  // 製品と在庫をマージ
  return products.map((p) => {
    const inv = inventoryData?.find((i) => i.product_id === p.id);
    return {
      product_id: p.id,
      product_code: p.product_code,
      name: p.name,
      color_text: p.color_text,
      stock_raw: inv?.stock_raw ?? 0,
      stock_finished: inv?.stock_finished ?? 0,
      stock_defective: inv?.stock_defective ?? 0,
    };
  });
}

// 14. 在庫調整: 在庫数を直接設定（差分を履歴に記録）
export async function adjustInventory(
  partnerId: string,
  adjustments: Array<{
    productId: number;
    stock_raw: number;
    stock_finished: number;
    stock_defective: number;
  }>,
  reason?: string
) {
  const supabase = await createClient();
  const { user } = await getAuthUser();
  if (!user) return { success: false, message: '要ログイン' };

  try {
    for (const adj of adjustments) {
      // 現在の在庫を取得
      const { data: current } = await supabase
        .from('inventory')
        .select('stock_raw, stock_finished, stock_defective')
        .eq('product_id', adj.productId)
        .single();

      const oldRaw = current?.stock_raw ?? 0;
      const oldFinished = current?.stock_finished ?? 0;
      const oldDefective = current?.stock_defective ?? 0;

      const diffRaw = adj.stock_raw - oldRaw;
      const diffFinished = adj.stock_finished - oldFinished;
      const diffDefective = adj.stock_defective - oldDefective;

      // 変更がない場合はスキップ
      if (diffRaw === 0 && diffFinished === 0 && diffDefective === 0) continue;

      // 在庫テーブルをUpsert
      const { error: invError } = await supabase
        .from('inventory')
        .upsert({
          product_id: adj.productId,
          stock_raw: adj.stock_raw,
          stock_finished: adj.stock_finished,
          stock_defective: adj.stock_defective,
          last_updated_at: new Date().toISOString(),
        }, { onConflict: 'product_id' });

      if (invError) throw invError;

      // 履歴を記録 (adjustment タイプ)
      // 部材、完成品、不良それぞれに差分があれば記録
      const movementsToInsert = [];

      if (diffRaw !== 0) {
        movementsToInsert.push({
          product_id: adj.productId,
          movement_type: 'adjustment_raw',
          quantity_change: diffRaw,
          reason: reason || '在庫調整',
          created_by: user.id,
        });
      }
      if (diffFinished !== 0) {
        movementsToInsert.push({
          product_id: adj.productId,
          movement_type: 'adjustment_finished',
          quantity_change: diffFinished,
          reason: reason || '在庫調整',
          created_by: user.id,
        });
      }
      if (diffDefective !== 0) {
        movementsToInsert.push({
          product_id: adj.productId,
          movement_type: 'adjustment_defective',
          quantity_change: diffDefective,
          reason: reason || '在庫調整',
          created_by: user.id,
        });
      }

      if (movementsToInsert.length > 0) {
        const { error: movError } = await supabase
          .from('inventory_movements')
          .insert(movementsToInsert);
        if (movError) throw movError;
      }
    }

    revalidatePath('/inventory');
    return { success: true, message: `${adjustments.length}件の在庫を調整しました` };
  } catch (e: unknown) {
    console.error('adjustInventory error:', e);
    return {
      success: false,
      message: '調整エラー: ' + (e instanceof Error ? e.message : 'Unknown error'),
    };
  }
}
