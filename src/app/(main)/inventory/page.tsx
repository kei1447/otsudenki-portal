import { createClient } from '@/utils/supabase/server';
import OperationPanel from './operation-panel';
import InventoryList from './inventory-list';
import PartnerSelector from './partner-selector';
import {
  getProductsByPartner,
  getDefectiveProductsByPartner,
  getAllInventory,
} from './actions';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function InventoryPage(props: Props) {
  const searchParams = await props.searchParams;
  const partnerId = typeof searchParams.partner_id === 'string' ? searchParams.partner_id : '';

  const supabase = await createClient();

  // 1. 取引先一覧取得
  const { data: partners } = await supabase
    .from('partners')
    .select('id, name')
    .order('partner_code', { ascending: true }); // partner_code順

  // 2. 詳細データ取得 (partnerIdがある場合)
  // サーバーサイドで並列取得
  const [inventory, rawProducts, defectiveProducts] = await Promise.all([
    getAllInventory(),
    partnerId ? getProductsByPartner(partnerId) : Promise.resolve([]),
    partnerId ? getDefectiveProductsByPartner(partnerId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          業務管理 (入出荷・在庫)
        </h1>

        {/* 取引先切り替え (Client Component) */}
        <PartnerSelector
          partners={partners || []}
          selectedPartnerId={partnerId}
        />
      </div>

      {/* 1. 操作パネル (受入・加工・出荷など) */}
      <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
        {!partnerId ? (
          <div className="text-center text-gray-400 py-8">
            取引先を選択してください
          </div>
        ) : (
          <OperationPanel
            partnerId={partnerId}
            rawProducts={rawProducts}
            defectiveProducts={defectiveProducts}
          />
        )}
      </div>

      {/* 2. 在庫一覧リスト (下部) */}
      <div className="space-y-2">
        <div className="flex justify-between items-end px-2">
          <h2 className="text-lg font-bold text-gray-700">最新の在庫状況</h2>
          {/* 更新ボタンは router.refresh() 等が必要だが、
              Server Component化により操作パネルのアクション完了後に
              revalidatePathされれば自動更新されるため、手動更新ボタンは一旦削除するか、
              あるいは単にページリロードボタンとして機能させるか。
              ここではシンプルに削除、または "ブラウザの更新" を促す形でもよいが、
              Actions内で revalidatePath('/inventory') していれば自動反映されます。
           */}
        </div>
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <InventoryList inventory={inventory} />
        </div>
      </div>
    </div>
  );
}
