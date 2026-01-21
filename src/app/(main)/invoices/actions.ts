'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 請求書作成候補の型
export type InvoiceCandidate = {
  partner: { id: string, name: string }
  shipment_count: number
  total_amount_excl_tax: number // 税抜合計
}

// 1. 未請求データの検索 (対象選択画面用)
export async function getUnbilledSummary(closingDate: number, startDate: string, endDate: string) {
  const supabase = await createClient()

  // 指定期間・締め日の取引先に関連する「未請求(invoice_id is null)」の出荷を取得
  const { data: shipments } = await supabase
    .from('shipments')
    .select(`
      total_amount,
      partners!inner ( id, name, closing_date )
    `)
    .is('invoice_id', null) // 未請求
    .eq('partners.closing_date', closingDate) // 締め日一致
    .gte('shipment_date', startDate)
    .lte('shipment_date', endDate)

  if (!shipments) return []

  // 取引先ごとに集計
  const summaryMap = new Map<string, InvoiceCandidate>()

  shipments.forEach(s => {
    const pId = s.partners.id
    if (!summaryMap.has(pId)) {
      summaryMap.set(pId, {
        partner: { id: pId, name: s.partners.name },
        shipment_count: 0,
        total_amount_excl_tax: 0
      })
    }
    const current = summaryMap.get(pId)!
    current.shipment_count += 1
    current.total_amount_excl_tax += s.total_amount
  })

  return Array.from(summaryMap.values())
}

// 2. 特定取引先の未請求出荷データ（詳細）を取得 (確認画面用)
export async function getUnbilledShipments(partnerId: string, startDate: string, endDate: string) {
  const supabase = await createClient()

  // 指定期間・指定取引先の未請求出荷を、明細付きで取得
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
        products ( name, product_code, color )
      ),
      partners ( name )
    `)
    .eq('partner_id', partnerId)
    .is('invoice_id', null) // 未請求
    .gte('shipment_date', startDate)
    .lte('shipment_date', endDate)
    .order('shipment_date', { ascending: true })

  return shipments || []
}

// 3. 1件の請求書を作成（確定処理）
export async function createSingleInvoice(
  partnerId: string,
  periodStart: string,
  periodEnd: string,
  totalExclTax: number // 画面で確認した税抜合計
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: '要ログイン' }

  try {
    // 消費税計算 (10% 端数切り捨て) ※インボイス制度対応の再計算
    const subtotal = totalExclTax
    const tax = Math.floor(subtotal * 0.1)
    const total = subtotal + tax

    // A. 請求書ヘッダー作成
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        partner_id: partnerId,
        period_start: periodStart,
        period_end: periodEnd,
        issue_date: new Date().toISOString(), // 発行日は今日
        subtotal: subtotal,
        tax_amount: tax,
        total_amount: total,
        status: 'confirmed',
        created_by: user.id
      })
      .select()
      .single()

    if (invError) throw invError

    // B. 出荷データに請求書IDを紐付け (これが「請求済み」の証になる)
    const { error: shipError } = await supabase
      .from('shipments')
      .update({ invoice_id: invoice.id })
      .eq('partner_id', partnerId)
      .is('invoice_id', null)
      .gte('shipment_date', periodStart)
      .lte('shipment_date', periodEnd)

    if (shipError) throw shipError

    revalidatePath('/invoices')
    return { success: true, message: '請求書を作成しました' }

  } catch (e: any) {
    console.error(e)
    return { success: false, message: '作成エラー: ' + e.message }
  }
}

// 4. 請求書一覧取得 (一覧画面用)
export async function getInvoices() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('invoices')
    .select(`
      *,
      partners ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}