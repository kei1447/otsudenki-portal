import { createClient } from '@/utils/supabase/server'
import FormContent from './form-content'

export default async function NewPricePage() {
  const supabase = await createClient()

  // 修正: customer_product_code -> product_code, color_text -> color
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      product_code,
      color,
      partners ( name )
    `)
    .eq('is_discontinued', false) // 廃盤品は除外
    .order('product_code')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">単価新規登録</h1>
        <p className="text-gray-600 mt-2">
          既存の製品に対して、新しい適用単価を登録します。
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <FormContent products={products || []} />
      </div>
    </div>
  )
}