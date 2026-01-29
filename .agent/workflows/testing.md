---
description: テスト実施時のデータ作成・検証・破棄ルール
---

# テスト実施ワークフロー

## 基本方針

テストは以下の順序で実施する：

1. **既存データでの確認を優先**
   - まず既存のデータで動作確認が可能か検討
   - 既存データで確認できる場合は追加指示なしでテスト完了

2. **新規データが必要な場合**
   - ブラウザ操作でのデータ追加を試みる
   - ブラウザ操作が複雑または失敗する場合は、**Supabase MCP**でDBを直接操作してテストデータを作成

3. **テスト完了後**
   - 作成したテストデータは**必ず破棄**する
   - Supabase MCPの`execute_sql`でDELETE文を実行

## DB直接操作でのテストデータ作成

```sql
-- 例: テスト用shipment_itemを追加
INSERT INTO shipment_items (shipment_id, product_id, quantity, unit_price, line_total, defect_reason)
VALUES ('existing-shipment-id', 123, 1, 0, 0, 'テスト理由');
```

## テストデータ破棄

```sql
-- 例: テストデータを削除
DELETE FROM shipment_items WHERE defect_reason LIKE 'テスト%';
```

## 注意事項

- テストデータには識別可能なプレフィックス（例: `テスト`、`TEST_`）を付与
- 本番データとの混同を避けるため、テスト完了後は速やかに削除
- 複雑なUI操作が必要な場合は、ユーザーへテスト指示書を提供する選択肢も検討
