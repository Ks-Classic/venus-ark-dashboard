# 週表示修正完了報告（最終版） - 2025年1月28日

## 問題の整理
1. **採用活動ダッシュボード**: 選択週が3列目に来ている（4列目が正しい）
2. **稼働者状況**: フロントエンドで数値が0になっている

## 根本原因の特定
1. **週計算ロジックの順序問題**: `generateFourWeekRange`で選択週の位置が固定されていた
2. **APIレスポンスのデータ不整合**: フロントエンドとAPIで週のマッピングが合わない

## 修正内容

### 1. 週計算ロジックの柔軟化
- **`lib/date.ts`**: `generateFourWeekRange`関数に`targetWeekPosition`パラメータを追加
  - `targetWeekPosition=2`: 選択週を3列目に配置（稼働者状況用）
  - `targetWeekPosition=3`: 選択週を4列目に配置（採用活動用）

### 2. 土曜日開始基準の統一
- すべての週計算で`getWeekDateRangeSaturdayBased`を使用
- 月またぎの週の統一表示（「7月5W/8月1W」）を適用

### 3. 詳細なデバッグログの追加
- 週生成プロセスの詳細ログ
- APIレスポンスとフロントエンドの週ラベルマッピングログ
- データ検索結果の詳細ログ

## 修正ファイル
1. **`lib/date.ts`**: 週計算ロジックの柔軟化
2. **`app/api/work-status/weekly-detail/route.ts`**: API側で明示的に`targetWeekPosition=2`を指定
3. **`components/recruitment-collection-table.tsx`**: 採用活動用に`targetWeekPosition=3`を指定
4. **`components/recruitment-interview-table.tsx`**: 採用活動用に`targetWeekPosition=3`を指定
5. **`components/rejection-reason-table.tsx`**: 採用活動用に`targetWeekPosition=3`を指定

## 期待される結果
- **採用活動ダッシュボード**: 選択週が4列目に正しく配置
- **稼働者状況ダッシュボード**: 選択週が3列目に正しく配置
- **週表示の統一**: 土曜日開始基準で統一された週表示
- **数値の表示**: APIとフロントエンドで週ラベルが一致し、正しい数値が表示

## 技術的改善点
- パラメータ化による柔軟な週配置制御
- 土曜日開始基準の統一
- 詳細なデバッグログによる問題追跡の改善
- 共通ロジックの再利用性向上