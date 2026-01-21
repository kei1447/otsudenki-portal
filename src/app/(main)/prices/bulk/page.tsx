import { createClient } from '@/utils/supabase/server';
import BulkRegister from './bulk-register';
import Link from 'next/link';

export default async function BulkRegisterPage() {
  const supabase = await createClient();

  // テンプレート生成用に、廃盤でない全製品を取得
  // カラム名を修正: customer_product_code -> product_code, color_text -> color
  const { data: products } = await supabase
    .from('products')
    .select(
      `
      id,
      product_code, 
      name,
      color,
      partners ( name )
    `
    )
    .eq('is_discontinued', false)
    .order('product_code');

  // Supabaseのリレーションは配列で返るため、1件だけ取り出して型を合わせる
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedProducts = (products || []).map((p: any) => ({
    ...p,
    partners: Array.isArray(p.partners) ? (p.partners[0] ?? null) : p.partners,
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">単価一括登録</h1>
          <p className="text-gray-600 mt-2">
            製品リスト入りテンプレートをダウンロードし、単価を入力してアップロードしてください。
          </p>
        </div>
        <Link
          href="/prices"
          className="text-sm font-semibold text-gray-900 hover:text-gray-700"
        >
          一覧に戻る
        </Link>
      </div>

      <BulkRegister products={normalizedProducts} />
    </div>
  );
}
