'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 共通: 在庫がある製品のみ取得
export async function getStockProductsByPartner(partnerId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inventory')
    .select('stock_finished, products!inner(id, name, product_code, color)')
    .eq('products.partner_id', partnerId)
    .gt('stock_finished', 0)
    .order('products(product_code)')
  
  return data?.map(d => {
    // ★修正: 型エラー回避のため as any でキャスト
    const p = d.products as any
    return {
      id: p.id,
      name: p.name,
      product_code: p.product_code,
      color: p.color,
      stock_finished: d.stock_finished
    }
  }) || []
}

// 共通: 生地在庫がある製品 ＋ 入荷履歴リスト を取得
export async function getRawStockProductsByPartner(partnerId: string) {
  const supabase = await createClient()
  
  // 1. 生地在庫がある製品
  const { data: stockData } = await supabase
    .from('inventory')
    .select('product_id, stock_raw, products!inner(id, name, product_code, color)')
    .eq('products.partner_id', partnerId)
    .gt('stock_raw', 0)
    .order('products(product_code)')
  
  if (!stockData || stockData.length === 0) return []

  // 2. 入荷履歴を取得
  const productIds = stockData.map(d => d.product_id)
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('product_id, created_at, quantity_change, due_date')
    .in('product_id', productIds)
    .eq('movement_type', 'receiving')
    .order('created_at', { ascending: false })
    .limit(300)

  // 3. 結合
  return stockData.map(item => {
    // ★修正: 型エラー回避
    const p = item.products as any

    const arrivals = movements
      ?.filter(m => m.product_id === item.product_id)
      .slice(0, 5) // 直近5件まで
      .map(m => {
        const date = new Date(m.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
        const due = m.due_date ? `(納期:${new Date(m.due_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })})` : ''
        return {
          label: `${date}${due} : ${m.quantity_change}個入荷`,
          value: new Date(m.created_at).toISOString().split('T')[0] // YYYY-MM-DD
        }
      }) || []

    return {
      id: p.id,
      name: p.name,
      product_code: p.product_code,
      color: p.color,
      stock_raw: item.stock_raw,
      arrivals: arrivals 
    }
  })
}

// 共通: 不良在庫がある製品 ＋ 詳細
export async function getDefectiveProductsByPartner(partnerId: string) {
  const supabase = await createClient()
  
  // 1. 不良在庫がある製品
  const { data: stockData } = await supabase
    .from('inventory')
    .select('product_id, stock_defective, products!inner(id, name, product_code, color)')
    .eq('products.partner_id', partnerId)
    .gt('stock_defective', 0)
    .order('products(product_code)')
  
  if (!stockData || stockData.length === 0) return []

  // 2. 履歴取得
  const productIds = stockData.map(d => d.product_id)
  
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('product_id, movement_type, quantity_change, defect_reason, created_at, due_date')
    .in('product_id', productIds)
    .order('created_at', { ascending: false })
    .limit(300)

  // 3. データ結合
  return stockData.map(item => {
    // ★修正: 型エラー回避
    const p = item.products as any

    const pLogs = movements?.filter(m => m.product_id === item.product_id) || []

    // A. 不良履歴
    const defectLogs = pLogs.filter(m => 
      m.defect_reason !== null || 
      ['production_defective', 'defect_found'].includes(m.movement_type)
    ).slice(0, 3).map(l => ({
      reason: l.defect_reason || '理由なし',
      date: new Date(l.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
    }))

    // B. 入荷履歴
    const arrivalLogs = pLogs
      .filter(m => m.movement_type === 'receiving')
      .slice(0, 3)
      .map(l => ({
        date: new Date(l.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
        qty: l.quantity_change
      }))

    return {
      id: p.id,
      name: p.name,
      product_code: p.product_code,
      color: p.color,
      stock_defective: item.stock_defective,
      recent_defects: defectLogs,
      recent_arrivals: arrivalLogs
    }
  })
}

// 共通: 特定取引先の製品取得
export async function getProductsByPartner(partnerId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('id, name, product_code, color')
    .eq('partner_id', partnerId)
    .eq('is_discontinued', false)
    .order('product_code')
  return data || []
}

// 1. 受入登録
export async function registerReceiving(data: { productId: number, quantity: number, dueDate: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: '要ログイン' }

  try {
    await supabase.rpc('increment_stock', { p_product_id: data.productId, p_amount: data.quantity, p_field: 'stock_raw' })
    await supabase.from('inventory_movements').insert({
      product_id: data.productId,
      movement_type: 'receiving',
      quantity_change: data.quantity,
      due_date: data.dueDate,
      created_by: user.id
    })
    revalidatePath('/inventory')
    return { success: true, message: '受入登録完了' }
  } catch (e: any) {
    return { success: false, message: e.message }
  }
}

// 2. 加工実績登録
export async function registerProduction(data: { 
  productId: number, rawUsed: number, finished: number, defective: number, 
  defectReason?: string, sourceDate?: string 
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: '要ログイン' }

  try {
    const sourceMemo = data.sourceDate ? ` (入荷日: ${data.sourceDate})` : ''

    if (data.rawUsed > 0) {
      await supabase.rpc('increment_stock', { p_product_id: data.productId, p_amount: -data.rawUsed, p_field: 'stock_raw' })
      await supabase.from('inventory_movements').insert({
        product_id: data.productId,
        movement_type: 'production_raw',
        quantity_change: -data.rawUsed,
        reason: `加工投入${sourceMemo}`,
        created_by: user.id
      })
    }
    if (data.finished > 0) {
      await supabase.rpc('increment_stock', { p_product_id: data.productId, p_amount: data.finished, p_field: 'stock_finished' })
      await supabase.from('inventory_movements').insert({
        product_id: data.productId,
        movement_type: 'production_finished',
        quantity_change: data.finished,
        reason: `良品完成${sourceMemo}`,
        created_by: user.id
      })
    }
    if (data.defective > 0) {
      await supabase.rpc('increment_stock', { p_product_id: data.productId, p_amount: data.defective, p_field: 'stock_defective' })
      await supabase.from('inventory_movements').insert({
        product_id: data.productId,
        movement_type: 'production_defective',
        quantity_change: data.defective,
        defect_reason: data.defectReason,
        reason: `不良発生${sourceMemo}`,
        created_by: user.id
      })
    }
    revalidatePath('/inventory')
    return { success: true, message: '加工実績登録完了' }
  } catch (e: any) {
    return { success: false, message: e.message }
  }
}

// 3. 出荷登録
export async function registerShipment(data: { partnerId: string, shipmentDate: string, items: { productId: number, quantity: number }[] }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: '要ログイン' }

  try {
    const { data: shipment, error: sErr } = await supabase
      .from('shipments')
      .insert({ partner_id: data.partnerId, shipment_date: data.shipmentDate, status: 'confirmed', created_by: user.id })
      .select()
      .single()
    if (sErr) throw sErr

    let total = 0
    for (const item of data.items) {
      const { data: price } = await supabase.from('prices')
        .select('unit_price').eq('product_id', item.productId).eq('status', 'active')
        .lte('valid_from', data.shipmentDate).order('valid_from', { ascending: false }).limit(1).single()
      
      const unitPrice = price?.unit_price || 0
      const lineTotal = unitPrice * item.quantity
      total += lineTotal

      await supabase.from('shipment_items').insert({
        shipment_id: shipment.id, product_id: item.productId, quantity: item.quantity, unit_price: unitPrice, line_total: lineTotal
      })

      await supabase.rpc('increment_stock', { p_product_id: item.productId, p_amount: -item.quantity, p_field: 'stock_finished' })
      await supabase.from('inventory_movements').insert({
        product_id: item.productId,
        movement_type: 'shipping',
        quantity_change: -item.quantity,
        reason: `出荷No.${shipment.id.substring(0,8)}`,
        created_by: user.id
      })
    }

    await supabase.from('shipments').update({ total_amount: total }).eq('id', shipment.id)
    revalidatePath('/inventory')
    return { success: true, message: '出荷登録完了' }
  } catch (e: any) {
    return { success: false, message: '出荷エラー: ' + e.message }
  }
}

// 4. 不良品処理
export async function registerDefectiveProcessing(data: { productId: number, reworkQty: number, returnQty: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: '要ログイン' }

  try {
    if (data.reworkQty > 0) {
      await supabase.rpc('increment_stock', { p_product_id: data.productId, p_amount: -data.reworkQty, p_field: 'stock_defective' })
      await supabase.rpc('increment_stock', { p_product_id: data.productId, p_amount: data.reworkQty, p_field: 'stock_finished' })
      await supabase.from('inventory_movements').insert({
        product_id: data.productId,
        movement_type: 'repair',
        quantity_change: data.reworkQty,
        reason: '不良手直し完了',
        created_by: user.id
      })
    }
    if (data.returnQty > 0) {
      await supabase.rpc('increment_stock', { p_product_id: data.productId, p_amount: -data.returnQty, p_field: 'stock_defective' })
      await supabase.from('inventory_movements').insert({
        product_id: data.productId,
        movement_type: 'return_defective',
        quantity_change: -data.returnQty,
        reason: '不良品返却',
        created_by: user.id
      })
    }
    revalidatePath('/inventory')
    return { success: true, message: '処理完了' }
  } catch (e: any) {
    return { success: false, message: e.message }
  }
}

// 履歴取得
export async function getProductHistory(productId: number) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(20)
  return data || []
}

// 履歴削除
export async function deleteMovement(movementId: string) {
  const supabase = await createClient()
  const { data: movement } = await supabase.from('inventory_movements').select('*').eq('id', movementId).single()
  if (!movement) return { success: false, message: 'データなし' }

  let field = ''
  switch (movement.movement_type) {
    case 'receiving': field = 'stock_raw'; break
    case 'production_raw': field = 'stock_raw'; break
    case 'production_finished': field = 'stock_finished'; break
    case 'production_defective': field = 'stock_defective'; break
    case 'shipping': field = 'stock_finished'; break
    case 'repair': 
      try {
        await supabase.rpc('increment_stock', { p_product_id: movement.product_id, p_amount: -movement.quantity_change, p_field: 'stock_finished' })
        await supabase.rpc('increment_stock', { p_product_id: movement.product_id, p_amount: movement.quantity_change, p_field: 'stock_defective' })
        await supabase.from('inventory_movements').delete().eq('id', movementId)
        revalidatePath('/inventory')
        return { success: true, message: '取り消しました' }
      } catch(e:any) { return { success: false, message: e.message } }
    case 'return_defective': field = 'stock_defective'; break
    default: return { success: false, message: '削除不可' }
  }

  const reverseAmount = -movement.quantity_change
  try {
    await supabase.rpc('increment_stock', { p_product_id: movement.product_id, p_amount: reverseAmount, p_field: field })
    await supabase.from('inventory_movements').delete().eq('id', movementId)
    revalidatePath('/inventory')
    return { success: true, message: '取り消しました' }
  } catch (e: any) {
    return { success: false, message: e.message }
  }
}

// 全体履歴取得
export async function getGlobalHistory() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inventory_movements')
    .select(`
      *,
      products (
        name,
        product_code,
        color,
        partners ( name )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

// 一括削除（在庫戻し）
export async function bulkDeleteMovements(ids: string[]) {
  let successCount = 0
  let errorCount = 0
  for (const id of ids) {
    const res = await deleteMovement(id)
    if (res.success) successCount++
    else errorCount++
  }
  revalidatePath('/inventory')
  return { success: true, message: `${successCount}件成功 ${errorCount > 0 ? `(${errorCount}件失敗)` : ''}` }
}

// 履歴完全削除（物理削除）
export async function purgeMovements(ids: string[]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_movements')
    .delete()
    .in('id', ids)

  if (error) {
    return { success: false, message: '削除エラー: ' + error.message }
  }
  revalidatePath('/inventory')
  return { success: true, message: `${ids.length}件の履歴を完全に削除しました` }
}

// 納品書データの取得 (印刷用)
export async function getShipmentForPrint(shipmentId: string) {
  const supabase = await createClient()
  
  // 1. ヘッダーと取引先
  const { data: shipment } = await supabase
    .from('shipments')
    .select(`
      *,
      partners ( name, address, phone )
    `)
    .eq('id', shipmentId)
    .single()
  
  if (!shipment) return null

  // 2. 明細と製品情報
  const { data: items } = await supabase
    .from('shipment_items')
    .select(`
      *,
      products ( name, product_code, color, unit_weight )
    `)
    .eq('shipment_id', shipmentId)
    .order('products(product_code)')

  return { ...shipment, items: items || [] }
}

// 直近の出荷履歴を取得 (出荷画面表示用)
export async function getRecentShipments(partnerId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('shipments')
    .select('id, shipment_date, total_amount, partners(name), created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (partnerId) {
    query = query.eq('partner_id', partnerId)
  }

  const { data } = await query
  return data || []
}

// 納品書一覧の取得 (管理画面用)
export async function getShipmentList() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('shipments')
    .select(`
      *,
      partners ( name )
    `)
    .order('shipment_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  return data || []
}

// 納品書の取り消し (削除)
export async function deleteShipment(shipmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: '要ログイン' }

  const { data: shipment } = await supabase
    .from('shipments')
    .select('*, shipment_items(*)')
    .eq('id', shipmentId)
    .single()

  if (!shipment) return { success: false, message: 'データが見つかりません' }

  try {
    // 2. 在庫を戻す
    for (const item of shipment.shipment_items) {
      await supabase.rpc('increment_stock', { 
        p_product_id: item.product_id, 
        p_amount: item.quantity, 
        p_field: 'stock_finished' 
      })

      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        movement_type: 'shipping_cancel',
        quantity_change: item.quantity,
        reason: `納品書取消(No.${shipment.id.substring(0,8)})`,
        created_by: user.id
      })
    }

    // 3. 納品書データを削除
    const { error } = await supabase.from('shipments').delete().eq('id', shipmentId)
    if (error) throw error

    revalidatePath('/inventory')
    revalidatePath('/shipments')
    return { success: true, message: '納品書を取り消しました（在庫を戻しました）' }
  } catch (e: any) {
    return { success: false, message: '削除エラー: ' + e.message }
  }
}