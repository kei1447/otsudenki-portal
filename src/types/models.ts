// データベースの定義をここで一元管理します

// 取引先 (Partners)
export type Partner = {
    id: string; // UUID
    name: string;
    code: string | null;
    address: string | null;
    phone: string | null;
    memo: string | null;
    closing_date: number | null;
    calculation_type: string | null;
    created_at: string;
  };
  
  // 製品 (Products)
  // DBカラム名の変更: customer_product_code -> product_code, color_text -> color
  export type Product = {
    id: number; // Integer
    partner_id: string; // UUID
    product_code: string | null; // 旧: customer_product_code
    name: string;
    color: string | null;        // 旧: color_text
    memo: string | null;
    unit_weight: number | null;
    surface_area: number | null;
    is_discontinued: boolean;
    created_at: string;
    
    // リレーション用（結合して取得する場合）
    partners?: Partner | null;
  };
  
  // 単価 (ProductPrices / 旧Prices)
  // DBテーブル/カラム名の変更: prices -> product_prices, valid_from -> start_date
  export type ProductPrice = {
    id: string; // UUID
    product_id: number;
    unit_price: number;
    start_date: string; // 旧: valid_from
    end_date: string | null; // 旧: valid_to
    change_reason: string | null; // 旧: reason
    status?: string; // 今回は一旦除外あるいはDBに残っているなら定義
    
    // リレーション用
    products?: Product | null;
  };