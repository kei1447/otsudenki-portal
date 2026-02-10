# Otsu Denki Portal

取引先・製品マスタ・価格・在庫・出荷・請求書の管理を一元化した業務ポータルです。

## 技術構成

| 項目           | 技術                      |
| -------------- | ------------------------- |
| フレームワーク | Next.js 16（App Router）  |
| 言語           | TypeScript 5              |
| 認証 / DB      | Supabase（PostgreSQL 17） |
| UI             | Tailwind CSS 4            |
| ホスティング   | Vercel                    |
| テスト         | Playwright                |

## ディレクトリ構成

```
src/
├── app/
│   ├── layout.tsx              # ルートレイアウト
│   ├── globals.css             # グローバルCSS
│   ├── login/                  # ログインページ
│   └── (main)/                 # 認証済みルートグループ
│       ├── layout.tsx          # サイドバー + 認証チェック
│       ├── page.tsx            # ダッシュボード
│       ├── inventory/          # 在庫管理・業務管理
│       ├── invoices/           # 請求書管理
│       ├── shipments/          # 納品書管理
│       ├── partners/           # 取引先マスタ
│       ├── products/           # 製品マスタ
│       ├── prices/             # 価格マスタ
│       └── users/              # ユーザー管理
├── components/
│   ├── Sidebar.tsx             # サイドバーナビゲーション
│   └── ui/                     # 共通UIコンポーネント
├── types/
│   └── models.ts               # DB型定義
└── utils/
    └── supabase/
        ├── client.ts           # ブラウザ用Supabaseクライアント
        ├── server.ts           # サーバー用クライアント（React.cache）
        └── middleware.ts       # セッション管理ミドルウェア
```

## 主要画面

| 画面           | 説明                                                       |
| -------------- | ---------------------------------------------------------- |
| ダッシュボード | 当日売上・月次売上・直近の在庫移動と出荷履歴を集約表示     |
| 業務管理       | 部材受入・加工実績・出荷登録・不良品処理・操作履歴と取消   |
| 在庫調整       | 取引先単位で在庫数を一括補正（理由入力・変更行の確認付き） |
| 納品書管理     | 出荷登録から発行された納品書の一覧・備考追記・印刷         |
| 請求書管理     | 請求書一覧と印刷、締め日指定による未請求出荷の集計         |
| 取引先マスタ   | 取引先の新規作成・編集・削除、締め日やメモの管理           |
| 製品マスタ     | 製品の検索・絞込み・並び替え・表示列切替・廃番管理         |
| 価格マスタ     | 現在/過去/将来の単価をマトリクス表示、価格履歴の確認       |
| ユーザー管理   | 役割（admin / manager / staff）の確認と変更（admin のみ）  |

## データベース構成

### テーブル一覧

| テーブル              | 説明                                                  |  RLS  |
| --------------------- | ----------------------------------------------------- | :---: |
| `profiles`            | ユーザープロフィール（role: admin / manager / staff） |   ✅   |
| `partners`            | 取引先（type: customer / supplier / outsourcer）      |   ✅   |
| `products`            | 製品マスタ                                            |   ✅   |
| `prices`              | 単価マスタ（status: pending / active / rejected）     |   ✅   |
| `inventory`           | 在庫（素材 / 完成品 / 不良品の3区分）                 |   ✅   |
| `inventory_movements` | 在庫移動履歴                                          |   ✅   |
| `shipments`           | 出荷ヘッダ                                            |   ✅   |
| `shipment_items`      | 出荷明細                                              |   ✅   |
| `invoices`            | 請求書                                                |   ✅   |

### DB関数

| 関数名            | 用途                                                   |
| ----------------- | ------------------------------------------------------ |
| `handle_new_user` | 新規ユーザー登録時に `profiles` へ自動挿入（トリガー） |
| `increment_stock` | 在庫数の増減（動的SQL、業務管理から RPC 呼び出し）     |

### 権限モデル

| 操作             | admin | manager | staff |
| ---------------- | :---: | :-----: | :---: |
| 価格の編集       |   ✅   |    ✅    |   ❌   |
| ユーザー権限変更 |   ✅   |    ❌    |   ❌   |
| 一般業務操作     |   ✅   |    ✅    |   ✅   |

## セットアップ

### 環境変数

`.env.example` を `.env.local` にコピーし、以下を設定します。

```
NEXT_PUBLIC_SUPABASE_URL=<Supabase プロジェクト URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase Anon Key>
```

### 起動

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) で確認できます。
