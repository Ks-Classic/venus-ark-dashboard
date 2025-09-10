# 将来見込み重複除去・月選択機能実装 TODO

作成日: 2025-07-07  
対象機能: 稼働状況：稼働者将来見込み  
関連仕様: [work-status-future-projection.md](../specifications/features/work-status-future-projection.md)

---

## 📋 Phase 1: 重複除去ロジック実装 (優先度: 高)

**目標**: 同一メンバーの複数月重複カウントを防止  
**工数見積もり**: 0.5日  
**期限**: 即座に対応

### バックエンド修正
- [ ] **重複除去ロジックの実装**
  - ファイル: `app/api/work-status/future-projection/route.ts`
  - 優先順位による判定: 具体的日付 > ステータス推定
  - 日付未定メンバーの当月割り当て

- [ ] **メンバー分類ロジックの修正**
  - 同一メンバーが複数カテゴリに重複しないよう制御
  - `newStarting`, `switching`, `projectEnding`, `contractEnding` の重複チェック

- [ ] **デバッグログの強化**
  - 重複除去前後の人数変化をログ出力
  - どのメンバーがどの月に分類されたかを詳細記録

### テストケース作成
- [ ] **重複パターンのテストデータ作成**
  - 日付指定 + ステータス重複パターン
  - 複数月にまたがる重複パターン
  - エッジケース（日付未定、ステータス不明等）

- [ ] **計算結果の検証**
  - 重複除去前後の数値比較
  - 各月の合計値が正しく算出されることを確認

---

## 🔄 Phase 2: ローカル月選択機能 (優先度: 中)

**目標**: メンバーごとの開始予定月を手動調整可能にする  
**工数見積もり**: 1-2日  
**期限**: Phase 1完了後

### フロントエンド実装
- [ ] **月選択ドロップダウンの追加**
  - ファイル: `components/work-status/future-member-details-list.tsx`
  - 7月、8月、9月の選択肢
  - 初期値は現在のロジック結果

- [ ] **ローカル状態管理の実装**
  - `useState` + `localStorage` による永続化
  - インターフェース定義: `MemberScheduleAdjustments`
  - 状態変更時のリアルタイム更新

- [ ] **メインテーブル数値の動的更新**
  - ファイル: `components/work-status/detailed-status-table.tsx`
  - 月選択変更時の即座な数値反映
  - `useMemo` による効率的な再計算

### UI/UX改善
- [ ] **設定リセット機能**
  - 「初期設定に戻す」ボタンの追加
  - 確認ダイアログの実装

- [ ] **視覚的フィードバック**
  - 手動調整されたメンバーの視覚的区別
  - 変更内容の一時的ハイライト表示

- [ ] **操作性向上**
  - 一括変更機能（同じステータスのメンバーを一括調整）
  - キーボードショートカット対応

### データ設計
- [ ] **型定義の追加**
  ```typescript
  interface MemberScheduleAdjustments {
    [memberId: string]: {
      adjustedStartMonth: number; // 1-12
      adjustedAt: string; // ISO timestamp
    }
  }
  ```

- [ ] **ローカルストレージ管理**
  - キー名: `venus-ark-member-schedules`
  - データ形式のバリデーション
  - 古いデータの自動クリーンアップ

---

## 🌐 Phase 3: リアルタイム同期機能 (優先度: 低)

**目標**: 複数ユーザー間でのリアルタイム調整内容共有  
**工数見積もり**: 3-4日  
**実装時期**: 将来（必要性が高まった時点）

### Firestore設計
- [ ] **新コレクションの作成**
  - コレクション名: `member_schedule_adjustments`
  - インデックス設計: `memberId`, `reportType`

- [ ] **型定義の追加**
  ```typescript
  interface MemberScheduleAdjustment {
    id: string;
    memberId: string;
    adjustedStartMonth: number;
    adjustedBy: string;
    adjustedAt: Timestamp;
    reportType: 'future_projection';
  }
  ```

### リアルタイム同期実装
- [ ] **カスタムフックの作成**
  - ファイル: `hooks/use-member-schedule-adjustments.ts`
  - Firestoreリアルタイムリスナー
  - デバウンス処理による書き込み最適化

- [ ] **競合解決ロジック**
  - 最後の更新を優先（Last Writer Wins）
  - 変更履歴の保持
  - ユーザー通知機能

### パフォーマンス最適化
- [ ] **読み取り・書き込み最適化**
  - 必要最小限のデータ同期
  - オフライン対応
  - エラーハンドリング強化

---

## 🧪 テスト計画

### Phase 1 テスト
- [ ] **単体テスト**
  - 重複除去ロジックのテスト
  - エッジケースの検証

- [ ] **統合テスト**
  - API → フロントエンド連携
  - 数値整合性の確認

### Phase 2 テスト
- [ ] **UI テスト**
  - 月選択操作のテスト
  - ローカルストレージの永続化テスト

- [ ] **ユーザビリティテスト**
  - 操作性の確認
  - レスポンス性能の測定

---

## 📝 完了基準

### Phase 1
- ✅ 同一メンバーが複数月に重複表示されない
- ✅ 数値の整合性が確保されている
- ✅ デバッグログで重複除去が確認できる

### Phase 2
- ✅ メンバーごとに月選択が可能
- ✅ 選択変更がメインテーブルに即座に反映される
- ✅ ブラウザ再起動後も設定が保持される
- ✅ 設定リセット機能が正常動作する

### Phase 3
- ✅ 複数ユーザー間でリアルタイム同期される
- ✅ 競合発生時も適切に解決される
- ✅ オフライン時も基本機能が動作する

---

## 🔗 関連ファイル

### 修正対象ファイル
- `app/api/work-status/future-projection/route.ts` (Phase 1)
- `components/work-status/future-member-details-list.tsx` (Phase 2)
- `components/work-status/detailed-status-table.tsx` (Phase 2)
- `hooks/use-member-schedule-adjustments.ts` (Phase 3)

### 参照ファイル
- `docs/specifications/features/work-status-future-projection.md`
- `lib/types/work_status_report.ts`
- `lib/analytics/enhanced-work-status-aggregation.ts`

---

## 📋 進捗管理

- [ ] Phase 1 開始
- [ ] Phase 1 完了・テスト
- [ ] Phase 2 開始
- [ ] Phase 2 完了・テスト
- [ ] Phase 3 設計検討
- [ ] 全体レビュー・ドキュメント更新 