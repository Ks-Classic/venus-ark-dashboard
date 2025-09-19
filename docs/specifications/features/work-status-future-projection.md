# 稼働状況：稼働者将来見込み — 要件定義

最終更新: 2025-07-07
作成者: AI Assistant（要レビュー）

---
## 1. 概要
今後 3 か月分（当月＋翌月＋翌々月）の **予定ベース** の稼働見込みを可視化するタブ。
- KPI テーブル（予定）
- メンバー詳細ダイアログ

## 2. 画面構成
| ID | コンポーネント | 説明 |
|----|---------------|------|
| WS_FUTURE_01 | `MonthHeader` | 対象月ラベル（動的生成） |
| WS_FUTURE_02 | `DetailedStatusTable` | 指標テーブル（行×月列） |
| WS_FUTURE_03 | `MemberDetailDialog` | セルクリック時のメンバー一覧 |

## 2.1 UI モック（ASCII イメージ）
```text
┌──────────────────────────────────────────────────────────┐
│ 年・月セレクタ  [2025年] [6月] ▼                         │
├──────────────────────────────────────────────────────────┤
│            稼働者 将来見込み                             │
├────────┬────────────┬────────────┬────────────┤
│ 指標    │ 6月 (当月) │ 7月 (予定) │ 8月 (予定) │
├────────┼────────────┼────────────┼────────────┤
│ 見込総数稼働者数 │    120     │    132     │    140     │
│ 総開始見込み人数 │     55     │      2     │      0     │
│   ├─ 新規開始人数 │     55     │      1     │      0     │
│   └─ 切替完了人数 │      0     │      1     │      0     │
│ 総終了見込み人数 │     13     │      6     │      2     │
│   ├─ 案件終了人数 │     10     │      5     │      2     │
│   └─ 契約終了人数 │      3     │      1     │      0     │
├────────┴────────────┴────────────┴────────────┤
│ * セルクリック → MemberDetailDialog がポップアップ       │
└──────────────────────────────────────────────────────────┘
```

## 3. 指標定義
| 行ID | 表示名 | 算出定義 |
|------|--------|-----------|
| totalProjected | 見込総数稼働者数 | 継続稼働者数 + 新規開始人数 + 切替完了人数 - 案件終了人数 - 契約終了人数<br/>（継続稼働者数 = 該当月より前に開始し、該当月も継続して稼働する人数） |
| totalStarting | 総開始見込み人数 | `newStarting + switching` (UI 計算) |
| totalEnding    | 総終了見込み人数 | `projectEnding + contractEnding` (UI 計算) |
| newStarting    | 新規開始人数 | （`lastWorkStartDate` が該当月 かつ `lastWorkEndDate`がない）OR（Notionステータスが「案件斡旋」、「面接対策」、「面接」、「結果待ち」、「採用」のいずれか かつ `lastWorkStartDate`がない かつ `lastWorkEndDate`がない） |
| switching      | 切替完了人数 | （`lastWorkEndDate` が存在し、それより後、かつ、該当月内に `lastWorkStartDate`）OR（`lastWorkEndDate` が存在し、Notionステータスが「案件斡旋」、「面接対策」、「面接」、「結果待ち」、「採用」のいずれか） |
| projectEnding  | 案件終了人数 | `lastWorkEndDate` が該当月 |
| contractEnding | 契約終了人数 | `contractEndDate` が該当月 |

> **重要**: `totalProjected`は「継続稼働者数」と「開始見込み人数」の合算から「終了見込み人数」を差し引いて算出されます。これにより、該当月に実際に稼働する（予定を含む）メンバーの正確な総数を表現します。

## 3.1 フィールド出典マッピング
| 指標 | Firestore フィールド | Notion / Sheets 元フィールド |
|------|---------------------|-----------------------------|
| totalProjected | computed (Aggregation) | Notion: members.lastWorkStartDate / lastWorkEndDate / contractEndDate |
| totalStarting | derived | 同上 |
| totalEnding | derived | 同上 |
| newStarting | members.lastWorkStartDate + members.status | Notion: メンバーDB.`最新業務開始日` + メンバーDB.`ステータス` |
| switching | members.lastWorkStartDate + members.lastWorkEndDate + members.status | Notion: メンバーDB.`最新業務開始日` + メンバーDB.`最新業務終了日` + メンバーDB.`ステータス` |
| projectEnding | members.lastWorkEndDate | Notion: メンバーDB.`最新業務終了日` |
| contractEnding | members.contractEndDate | Notion: メンバーDB.`業務委託契約終了日` |

> **原則**: Firestore の `members` コレクションは Notion 同期スクリプト (`enhanced-notion-sync.ts`) により 1:1 で反映されるため、UI ↔ Firestore ↔ Notion の一貫性が必須。

## 4. データソース
```
Firestore.members
 -> lib.analytics.enhanced-work-status-aggregation.ts
 -> Firestore.optimized_weekly_summaries (当月分)
 -> GET /api/work-status/future-projection
 -> useFutureProjection hook
 -> DetailedStatusTable
```

## 5. 算出ロジック詳細

### 5.1 見込総数稼働者数計算
```typescript
// 継続稼働者数 = 前月最終週の総稼働者数
let continuingActiveMembers = 0;

// 前月の最終日を取得
const previousMonth = month === 1 ? 12 : month - 1;
const previousYear = month === 1 ? year - 1 : year;
const lastDayOfPreviousMonth = new Date(previousYear, previousMonth, 0);

// 前月最終週の総稼働者数を計算
for (const member of members) {
  const startDate = member.lastWorkStartDate;
  const endDate = member.lastWorkEndDate;
  const contractEndDate = member.contractEndDate;
  
  // 開始がない、または前月最終日より後は非稼働
  if (!startDate || startDate > lastDayOfPreviousMonth) continue;
  
  // 契約終了で締まっていれば非稼働
  if (contractEndDate && contractEndDate <= lastDayOfPreviousMonth) continue;
  
  // 終了が未設定なら稼働
  if (!endDate) {
    continuingActiveMembers++;
    continue;
  }
  
  // 再稼働パターンは稼働
  if (endDate < startDate) {
    continuingActiveMembers++;
    continue;
  }
  
  // 前月最終日より後に終了 → 稼働
  if (endDate > lastDayOfPreviousMonth) {
    continuingActiveMembers++;
  }
}

// 見込総数稼働者数 = 継続稼働者数 + 新規開始人数 + 切替完了人数 - 案件終了人数 - 契約終了人数
const totalProjected = continuingActiveMembers + newStartingMembers.length + switchingMembers.length - projectEndingMembers.length - contractEndingMembers.length;
```

### 5.2 各指標の関係性について
**重要**: 見込総数稼働者数は以下の構成要素から算出されます：

1. **継続稼働者数**: 前月最終週の総稼働者数
2. **新規開始人数**: その月に新たに稼働を開始するメンバー数
3. **切替完了人数**: その月に案件切替を完了するメンバー数

**計算式**: `見込総数稼働者数 = 継続稼働者数 + 新規開始人数 + 切替完了人数 - 案件終了人数 - 契約終了人数`

これにより、「稼働中（稼働確定）している人」と「開始見込み人数」の合算から「終了見込み人数」を差し引いて、該当月の正確な稼働者数が算出されます。

**その他の指標**:
- **案件終了人数**: その月に案件を終了するメンバー数（見込総数から差し引かれる）
- **契約終了人数**: その月に契約を終了するメンバー数（見込総数から差し引かれる）

例：7月の場合
- 6月最終週総稼働者数: 100人 → 継続稼働者数
- 7月新規開始: 5人 → 新規開始人数  
- 7月切替完了: 2人 → 切替完了人数
- 7月案件終了: 3人 → 案件終了人数
- 7月契約終了: 1人 → 契約終了人数
- **7月見込総数**: 100 + 5 + 2 - 3 - 1 = 103人

### 5.3 その他の算出ロジック
1. `newStarting`（新規開始人数）
   - 条件1: `lastWorkStartDate` が対象月 かつ `lastWorkEndDate` が未設定
   - 条件2: Notionステータスが「案件斡旋」、「面接対策」、「面接」、「結果待ち」、「採用」のいずれか かつ `lastWorkStartDate` が未設定

2. `switching`（切替完了人数）
   - 条件1: `lastWorkEndDate` が存在し、それより後に対象月内で `lastWorkStartDate` が設定
   - 条件2: `lastWorkEndDate` が存在し、Notionステータスが「案件斡旋」、「面接対策」、「面接」、「結果待ち」、「採用」のいずれか

3. `projectEnding`（案件終了人数）
   - `lastWorkEndDate` が対象月内

4. `contractEnding`（契約終了人数）
   - `contractEndDate` が対象月内

## 6. エラーハンドリング
| 種類 | 対応 |
|------|------|
| Invalid Date | API で `null` 返却、フロントは "未定" 表示 |
| データ不足 | 0 として表示し、右上に `InfoToast` を表示 |

## 7. 依存ファイル一覧
- `app/api/work-status/future-projection/route.ts`
- `components/work-status/detailed-status-table.tsx`

## 8. 実装済み機能

### 8.1 データ整合性確保
- **概要**: 現在の稼働状況と将来見込みで統一された総稼働者数計算ロジック
- **実装内容**:
  - 同一の計算定義を使用（月終了日基準の稼働判定）
  - 現在・将来タブ間でのデータ一貫性確保
  - 各指標の独立性確保（重複カウント防止）
- **効果**: 全体的なデータ整合性向上、ユーザー混乱防止

### 8.2 メンバー詳細情報の充実
- **概要**: 将来見込みでの具体的なメンバー情報表示
- **実装内容**:
  - 実際のFirestoreデータから具体的なメンバー名を抽出
  - 確度情報（high/medium/low）の表示・更新機能
  - 開始日・終了日・理由の詳細表示
- **効果**: 将来見込みの具体性向上、計画精度向上

### 8.3 エラーハンドリング強化
- **概要**: 日付変換エラーやデータ不整合に対する堅牢性向上
- **実装内容**:
  - 安全な日付変換処理
  - 不正な日付値でのアプリケーションクラッシュ防止
  - ユーザーフレンドリーなエラーメッセージ表示
- **効果**: システム安定性向上

## 9. 重複除去とメンバー月選択機能

### 9.1 問題定義
現在の計算ロジックでは、同一メンバーが複数月に重複してカウントされる問題が発生している。

**例**: 田中さんのケース
- `lastWorkStartDate`: 2025-07-15
- Notionステータス: "案件斡旋"

この場合、田中さんは以下のように重複カウントされる：
- 7月: 新規開始人数（`lastWorkStartDate`基準）
- 8月: 新規開始人数（ステータス基準）  
- 9月: 新規開始人数（ステータス基準）

### 9.2 段階的実装計画

#### **Phase 1: 重複除去ロジック実装** 🎯
**目的**: 同一メンバーの複数月重複を防止  
**工数**: 0.5日  
**優先度**: 高

**実装内容**:
- 同一メンバーが複数カテゴリ（新規開始、切替、終了等）に重複しないよう制御
- 優先順位: 具体的日付指定 > ステータス推定
- 日付未定メンバーは当月に一律割り当て

**判定ロジック**:
```typescript
// 優先順位による重複除去
if (member.lastWorkStartDate) {
  // 具体的な日付がある場合、その月のみにカウント
  const startMonth = getMonthFromDate(member.lastWorkStartDate);
  categorizeByMonth(member, startMonth, 'newStarting');
} else if (isProjectMatchingStatus(member.status)) {
  // 日付未定の場合、当月にカウント（重複回避）
  categorizeByMonth(member, currentMonth, 'newStarting');
}
```

#### **Phase 2: ローカル月選択機能** 🔄
**目的**: メンバーごとの開始予定月を手動調整可能にする  
**工数**: 1-2日  
**優先度**: 中

**実装内容**:
- メンバー詳細リストに月選択ドロップダウン追加
- ローカルストレージベースの状態管理
- メインテーブル数値のリアルタイム更新
- 設定リセット機能

**UI仕様**:
```text
┌─ 新規開始見込み (6名) ──────────────────────────────┐
│ │ 氏名    │ ステータス │ 開始予定月 │ 確度    │   │
│ ├─────────────────────────────────────────────┤   │
│ │ 山田花子 │ 案件斡旋   │ [7月▼]    │ [高▼] │   │
│ │ 佐藤次郎 │ 面接対策   │ [8月▼]    │ [中▼] │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### **Phase 3: リアルタイム同期機能** 🌐
**目的**: 複数ユーザー間でのリアルタイム調整内容共有  
**工数**: 3-4日  
**優先度**: 低（将来実装）

**実装内容**:
- Firestore `member_schedule_adjustments` コレクション
- リアルタイムリスナー実装
- デバウンス処理
- 変更履歴管理

### 9.3 データ設計

#### Phase 2: ローカルストレージ
```typescript
interface MemberScheduleAdjustments {
  [memberId: string]: {
    adjustedStartMonth: number; // 1-12
    adjustedAt: string; // ISO timestamp
  }
}
```

#### Phase 3: Firestore コレクション
```typescript
// collection: member_schedule_adjustments
interface MemberScheduleAdjustment {
  id: string;
  memberId: string;
  adjustedStartMonth: number;
  adjustedBy: string;
  adjustedAt: Timestamp;
  reportType: 'future_projection';
}
```

## 10. TODO / 今後の改善
- [ ] `confidence` フィールドの保存先検討（現在ローカルのみ）
- [ ] 月数を可変にするオプション追加
- [ ] 将来見込み精度の追跡・分析機能
- [ ] 自動更新スケジュールの実装

## 2.2 主要項目詳細 UI
```text
┌─ 2025年7月の詳細 ────────────────────────────────────────┐
│                                                         │
│ ┌─ 新規開始見込み (2名) ──────────────────────────────┐   │
│ │ ▼ [緑アイコン] 新規開始見込み                       │   │
│ │   ┌─────────────────────────────────────────────┐   │   │
│ │   │ 氏名    │ ステータス │ 開始予定日 │ 確度    │   │   │
│ │   ├─────────────────────────────────────────────┤   │   │
│ │   │ 山田花子 │ 学習中     │ 7/15      │ [高▼] │   │   │
│ │   │ 佐藤次郎 │ 採用活動中  │ 7/20      │ [中▼] │   │   │
│ │   └─────────────────────────────────────────────┘   │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─ 切替完了見込み (1名) ──────────────────────────────┐   │
│ │ ▶ [橙アイコン] 切替完了見込み                       │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─ 案件終了見込み (5名) ──────────────────────────────┐   │
│ │ ▶ [赤アイコン] 案件終了見込み                       │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─ 契約終了見込み (1名) ──────────────────────────────┐   │
│ │ ▶ [濃赤アイコン] 契約終了見込み                     │   │
│ └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

* カード形式・アコーディオン式のUI（現在の稼働状況タブと統一）
* 各カードはクリックで展開/折りたたみ
* テーブル形式でメンバー詳細を表示
* 確度はプルダウンで変更可能（ローカル保存のみ）
* アイコンと色分けで視覚的に区別
```

---
**ドキュメント変更時の注意**
- メンバーコレクション schema 変更時は `03_data_definition.md` の `members` / `work_history` 節を更新。