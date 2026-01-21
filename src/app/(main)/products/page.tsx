import { createClient } from '@/utils/supabase/server';
import ProductList from './product-list';
import { Product, Partner } from '@/types/models';

// URLパラメータを受け取るための型定義
type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProductsPage(props: Props) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();

  // --- 検索条件の取得 ---
  const partnerName =
    typeof searchParams.partner === 'string' ? searchParams.partner : '';
  const keyword = typeof searchParams.q === 'string' ? searchParams.q : '';
  const showDiscontinued = searchParams.show_discontinued === 'true';

  // --- 1. 製品データの取得 (サーバーサイド検索) ---
  // !inner を使うことで、関連テーブル(partners)の条件で絞り込みが可能になります
  let query = supabase.from('products').select('*, partners!inner(id, name)');

  // (A) 取引先フィルタ
  if (partnerName) {
    query = query.eq('partners.name', partnerName);
  }

  // (B) 廃盤フィルタ (指定がなければ稼働のみ)
  if (!showDiscontinued) {
    query = query.eq('is_discontinued', false);
  }

  // (C) キーワード検索
  if (keyword) {
    // 型番、品名、色、備考のいずれかにヒットすればOK
    query = query.or(
      `product_code.ilike.%${keyword}%,name.ilike.%${keyword}%,color.ilike.%${keyword}%,memo.ilike.%${keyword}%`
    );
  }

  // ソートと件数制限（絞り込んだ上での上限なので、実質全件表示に近くなります）
  // ※上限は必要に応じて 5000, 10000 と増やしてください
  query = query.order('product_code', { ascending: true }).limit(2000);

  // --- 2. 取引先マスタの取得 (選択肢用) ---
  const partnersQuery = supabase
    .from('partners')
    .select('id, name')
    .order('name');

  // 並列実行
  const [productsResult, partnersResult] = await Promise.all([
    query,
    partnersQuery,
  ]);

  if (productsResult.error) {
    return (
      <div className="text-red-500">
        製品データ取得エラー: {productsResult.error.message}
      </div>
    );
  }
  if (partnersResult.error) {
    return (
      <div className="text-red-500">
        取引先データ取得エラー: {partnersResult.error.message}
      </div>
    );
  }

  return (
    <ProductList
      initialProducts={productsResult.data as Product[]}
      masterPartners={partnersResult.data as Partner[]}
    />
  );
}
