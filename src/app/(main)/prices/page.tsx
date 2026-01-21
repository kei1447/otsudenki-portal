import { createClient } from '@/utils/supabase/server';
import PriceMatrix from './price-list'; // ファイル名はそのままで中身を変えます
import { Partner } from '@/types/models';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PricesPage(props: Props) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();

  const partnerName =
    typeof searchParams.partner === 'string' ? searchParams.partner : '';
  const keyword = typeof searchParams.q === 'string' ? searchParams.q : '';
  // デフォルトでは廃盤を表示しない
  const showDiscontinued = searchParams.show_discontinued === 'true';

  // --- 1. 製品データを主軸に取得 ---
  // 製品に関連する「全ての」単価情報を取得します
  let query = supabase.from('products').select(`
      *,
      partners!inner ( name ),
      prices (
        id,
        unit_price,
        valid_from,
        reason,
        status
      )
    `);

  // (A) 廃盤フィルタ
  if (!showDiscontinued) {
    query = query.eq('is_discontinued', false);
  }

  // (B) 取引先フィルタ
  if (partnerName) {
    query = query.eq('partners.name', partnerName);
  }

  // (C) キーワード検索
  if (keyword) {
    query = query.or(
      `product_code.ilike.%${keyword}%,name.ilike.%${keyword}%,color.ilike.%${keyword}%,memo.ilike.%${keyword}%`
    );
  }

  // ソートと件数制限
  query = query
    .order('partners(name)', { ascending: true }) // 取引先順
    .order('product_code', { ascending: true }) // 型番順
    .limit(2000);

  // --- 2. 取引先マスタ取得 ---
  const partnersQuery = supabase
    .from('partners')
    .select('id, name')
    .order('name');

  // --- 3. ユーザー権限確認 ---
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const userRole = profile?.role || 'staff';

  const [productsResult, partnersResult] = await Promise.all([
    query,
    partnersQuery,
  ]);

  if (productsResult.error) {
    return (
      <div className="text-red-500">
        データ取得エラー: {productsResult.error.message}
      </div>
    );
  }

  return (
    <PriceMatrix
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      products={productsResult.data as any[]}
      masterPartners={partnersResult.data as Partner[]}
      userRole={userRole}
    />
  );
}
