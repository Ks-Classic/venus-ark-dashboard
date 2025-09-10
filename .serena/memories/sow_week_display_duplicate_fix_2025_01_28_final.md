# Venus Ark ダッシュボード週表記重複問題修正完了 - 2025年1月28日 (最終版)

## 🎯 SOW完了報告

### 問題の特定と修正
1. **週表記重複問題の根本原因**: `generateFourWeekRange`関数の`isTarget`判定で常に`i === 0`を評価していた
2. **数値が0になる問題の根本原因**: 各詳細取得関数の判定ロジックが不適切で、実際のメンバーデータにマッチしない条件だった

### 主要修正項目

#### 1. 週計算ロジック修正 (`lib/date.ts`)
- `isTarget = i === 0`に統一（選択週は常にi=0）
- `isPrediction = (targetWeekPosition === 2) ? i === 1 : false`に修正
- 月またぎ週での予定表示無効化追加

#### 2. フロントエンド修正 (`components/work-status/detailed-status-table.tsx`)
- `weekLabels`と`weeklyMetrics`で`targetWeekPosition=2`を明示的指定
- 稼働者状況では選択週が3列目に配置される

#### 3. データ計算ロジック修正 (`app/api/work-status/weekly-detail/route.ts`)
- `getNewStartedDetails`: 終了日がある人も適切に判定するロジックに修正
- `getSwitchingDetails`: より現実的な切替完了条件に修正
- `getProjectEndedDetails`: 切替完了と重複しない案件終了判定に修正
- 詳細デバッグログを全関数に追加

### 期待される動作
- **週表記**: 「7月4W, 7月5W/8月1W, 8月1W, 8月2W(予定)」のように4列が異なる週を表示
- **数値反映**: 総稼働者数以外の指標（新規開始、案件終了等）も実際のメンバー数を反映
- **選択週位置**: 稼働者状況では3列目がハイライト、採用活動では4列目がハイライト

### 技術的改善点
- パラメータ化による柔軟な週配置制御
- 現実的なデータ判定条件への改善
- 詳細なデバッグログによる問題追跡改善
- 統一された土曜日開始基準の維持