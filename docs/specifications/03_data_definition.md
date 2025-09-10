# データ定義書 (Data Dictionary)

## 1. 目的

本ドキュメントは、プロジェクトで使用されるデータモデル、特にFirestoreのコレクションスキーマと、フロントエンドで利用される主要なデータ型を厳密に定義する。これにより、開発者間の認識齟齬を防ぎ、データの一貫性と品質を保証する。

## 2. Firestoreコレクションスキーマ

### 2.1. `weekly_reports` (2025-07-18 更新)

週次のレポートデータを格納する、複数のレポートタイプが混在するコレクション。`reportType` フィールドによって、ドキュメントの構造が異なる。

| フィールド名 | 型 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | `string` | ○ | ドキュメントID。`YYYY-WSS-JOB_CATEGORY` または `YYYY-WSS-REPORT_TYPE` 形式。 |
| `reportType` | `string` | ○ | レポート種別。`'recruitment'`, `'staff_status'` など。 |
| `year` | `number` | ○ | レポート対象年 (例: `2025`)。 |
| `weekNumber` | `number` | ○ | 年初からの通算週番号。 |
| `startDate` | `string` | ○ | 週の開始日 (土曜日)、`YYYY-MM-DD` 形式。 |
| `endDate` | `string` | ○ | 週の終了日 (金曜日)、`YYYY-MM-DD` 形式。 |
| `jobCategory`| `string` | △ | `reportType`が`'recruitment'`の場合に必須。`'sns_operation'`, `'video_creator'` など。 |
| `recruitmentMetrics` | `map` | △ | `reportType`が`'recruitment'`の場合に必須。詳細は下記参照。 |
| `staffMetrics` | `map` | △ | `reportType`が`'staff_status'`の場合に必須。 |
| `createdAt` | `Timestamp`| ○ | ドキュメント作成日時。 |
| `updatedAt` | `Timestamp`| ○ | ドキュメント最終更新日時。 |
| `generatedAt`| `Timestamp`| ○ | データが自動生成された日時。 |
| `isManuallyEdited` | `boolean`| ○ | 手動編集フラグ。 |

#### `recruitmentMetrics` オブジェクト

| フィールド名 | 型 | 説明 |
| :--- | :--- | :--- |
| `applyCount` | `number` | 応募数 |
| `applyRejectCount` | `number` | 内不採用数（応募段階） |
| `applyContinueCount` | `number` | 内選考継続数（応募段階） |
| `documentSubmitted` | `number` | 書類提出数 |
| `documentRejectCount`| `number` | 内不採用数（書類段階） |
| `documentContinueCount`| `number` | 内選考継続数（書類段階） |
| `interviewScheduled` | `number` | 面接予定数 |
| `interviewConducted` | `number` | 内面接実施数 |
| `interviewCancelled` | `number` | 内面接辞退数 |
| `hireCount` | `number` | 採用者数 |
| `offerAcceptedCount` | `number` | 内定受諾数 |
| `interviewRate` | `number` | 面接実施率 (%) |
| `hireRate` | `number` | 採用率 (%) |
| `acceptanceRate` | `number` | 内定受諾率 (%) |
| `rejectionBreakdown` | `map` | 不採用理由の内訳。キーは理由、値は件数。 |

---

### 2.1.1 書類提出に関する業務ルール（2025-08-12 追記）

- 書類提出日は、原則として「求人エントリーフォーム」のタイムスタンプを採用する。
  - 採用管理シートに `書類提出日` 列が存在しない/空の場合でも、フォーム提出があれば提出日として扱う。
  - フォームの「名前」を正規化したキーで名寄せ（全角/半角・スペース除去・かなカナ統一・英字大文字化・全角数字->半角）。
- 週次集計の算出方法:
  - `documentSubmitted`: `documentSubmitDate` が週範囲に入る件数（= フォーム提出が週内にある件数）。
  - `documentContinueCount`: 管理シートのステータス更新が未反映でも、`documentSubmitted` を下限値として採用する（= 提出者は少なくとも書類段階の継続とみなす）。
    - すなわち `documentContinueCount = max(documentContinueCount, documentSubmitted)`。


### 2.2. `recruitment_detail_items`

ユーザーによって作成される「主要項目詳細」コメントを格納するコレクション。

| フィールド名 | 型 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | `string` | ○ | (ドキュメントID) Firestoreが自動生成する一意のID。 |
| `title` | `string` | ○ | ユーザーが入力するコメントのタイトル。 |
| `comment` | `string` | - | ユーザーが入力する詳細コメント。空文字許容。 |
| `jobCategory` | `string` | ○ | この項目が作成された際の「職種」フィルタの状態。`'all'`, `'sns'`など。 |
| `platform` | `string` | ○ | この項目が作成された際の「媒体」フィルタの状態。現状は`'all'`固定。 |
| `order` | `number` | ○ | 表示順序を制御するための数値。 |
| `createdAt` | `Timestamp` | ○ | ドキュメントの作成日時。 |
| `updatedAt` | `Timestamp` | ○ | ドキュメントの最終更新日時。 |
| `sourceData` | `map` | ○ | コメントの元となったセル情報を格納するオブジェクト。 |
| `sourceData.weekId` | `string` | ○ | 元データの週ID (例: `'2025-W26'`)。 |
| `sourceData.tableType`| `string` | ○ | 元データのテーブル種別 (例: `'collection'`, `'interview'`)。 |
| `sourceData.rowLabel` | `string` | ○ | 元データの行ラベル (例: `'応募数'`)。 |
| `sourceData.value` | `number` | ○ | 元データのセルの数値。 |

**サンプルデータ:**
```json
{
  "id": "aBcDeFgHiJkLmNoPqRsT",
  "title": "応募数：10件 (2025-W26)",
  "comment": "Indeed広告の出稿強化が要因。",
  "jobCategory": "all",
  "platform": "all",
  "order": 1,
  "createdAt": "2025-07-17T10:00:00Z",
  "updatedAt": "2025-07-17T10:00:00Z",
  "sourceData": {
    "weekId": "2025-W26",
    "tableType": "collection",
    "rowLabel": "応募数",
    "value": 10
  }
}
```

---

## 3. フロントエンド主要データ型

### 3.1. `DetailItem`

Firestoreの`recruitment_detail_items`ドキュメントに対応するフロントエンドの型。

```typescript
interface DetailItem {
  id: string;
  title: string;
  comment: string;
  jobCategory: string;
  platform: string;
  order: number;
  createdAt: Date; // FirestoreのTimestampはDateオブジェクトに変換
  updatedAt: Date;
  sourceData: {
    weekId: string;
    tableType: string;
    rowLabel: string;
    value: number;
  };
}
```

### 3.2. 週計算関連データ型

#### `WeekInfo`
週の基本情報を表す型。

```typescript
interface WeekInfo {
  year: number;
  month: number;
  weekInMonth: number;
}
```

#### `WeekDateRange`
週の日付範囲を表す型。

```typescript
interface WeekDateRange {
  start: Date;
  end: Date;
}
```

#### `PeriodSelection`
期間選択の状態を表す型。

```typescript
interface PeriodSelection {
  selectedYear: number;
  selectedMonth: number;
  selectedWeekInMonth: number;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedWeekInMonth: (week: number) => void;
}
```

### 3.3. 稼働状況関連データ型

#### `MemberDetailWithDates`
メンバーの詳細情報を表す型。

```typescript
interface MemberDetailWithDates {
  id: string;
  name: string;
  lastWorkStartDate: string | null;
  lastWorkEndDate: string | null;
  contractEndDate: string | null;
  firstCounselingDate: string | null;
  status: string;
  projectName?: string;
  reason?: string;
}
```

#### `WeeklyDetailOptimized`
週次稼働状況の詳細データを表す型。

```typescript
interface WeeklyDetailOptimized {
  weekLabel: string; // 例: "7月4W", "8月2W"
  weekNumber: number;
  totalWorkers: number;
  totalStarted: number;
  newStarted: number;
  switching: number;
  totalEnded: number;
  projectEnded: number;
  contractEnded: number;
  counselingStarted: number;
  otherLeft: number;
  startedMembers: MemberDetailWithDates[];
  endedMembers: MemberDetailWithDates[];
  otherItems: any[];
  memberDetails: {
    newStarted: MemberDetailWithDates[];
    switching: MemberDetailWithDates[];
    projectEnded: MemberDetailWithDates[];
    contractEnded: MemberDetailWithDates[];
    counselingStarted: MemberDetailWithDates[];
  };
}
```

#### `WeeklyWorkStatusDetailOptimized`
週次稼働状況APIのレスポンス型。

```typescript
interface WeeklyWorkStatusDetailOptimized {
  year: number;
  month: number;
  weekDetails: WeeklyDetailOptimized[];
}
```

## 4. APIレスポンス形式

### 4.1. 週次稼働状況詳細API

**エンドポイント**: `GET /api/work-status/weekly-detail`

**クエリパラメータ**:
- `year`: 年 (例: 2025)
- `month`: 月 (1-12)
- `week`: 月内週番号 (1-5)

**レスポンス例**:
```json
{
  "year": 2025,
  "month": 8,
  "weekDetails": [
    {
      "weekLabel": "7月4W",
      "weekNumber": 1,
      "totalWorkers": 56,
      "totalStarted": 0,
      "newStarted": 0,
      "switching": 0,
      "totalEnded": 0,
      "projectEnded": 0,
      "contractEnded": 0,
      "counselingStarted": 0,
      "otherLeft": 0,
      "startedMembers": [],
      "endedMembers": [],
      "otherItems": [],
      "memberDetails": {
        "newStarted": [],
        "switching": [],
        "projectEnded": [],
        "contractEnded": [],
        "counselingStarted": []
      }
    },
    {
      "weekLabel": "7月5W",
      "weekNumber": 2,
      "totalWorkers": 54,
      "totalStarted": 1,
      "newStarted": 1,
      "switching": 0,
      "totalEnded": 4,
      "projectEnded": 0,
      "contractEnded": 4,
      "counselingStarted": 1,
      "otherLeft": 0,
      "startedMembers": [],
      "endedMembers": [],
      "otherItems": [],
      "memberDetails": {
        "newStarted": [
          {
            "id": "224efecd-6152-80d6-989f-de2279f2d82a",
            "name": "藤井翔（ふじいかける）",
            "lastWorkStartDate": "2025-07-29",
            "lastWorkEndDate": null,
            "contractEndDate": null,
            "firstCounselingDate": "2025-07-09",
            "status": "working",
            "projectName": "新規開始"
          }
        ],
        "switching": [],
        "projectEnded": [],
        "contractEnded": [
          {
            "id": "183efecd-6152-80e3-bb20-fcfc35795ea7",
            "name": "山口千尋（やまぐち ちひろ）",
            "lastWorkStartDate": "2025-02-03",
            "lastWorkEndDate": "2025-07-31",
            "contractEndDate": "2025-07-31",
            "firstCounselingDate": "2025-01-28",
            "status": "project_released",
            "reason": "契約終了"
          }
        ],
        "counselingStarted": [
          {
            "id": "23fefecd-6152-80ed-b517-d94e5d9815c3",
            "name": "木﨑佑栞子（きさきゆかこ）",
            "lastWorkStartDate": "2025-08-04",
            "lastWorkEndDate": null,
            "contractEndDate": null,
            "firstCounselingDate": "2025-07-29",
            "status": "working",
            "reason": "カウンセリング開始"
          }
        ]
      }
    }
  ]
}
```

## 5. 週計算ロジックのデータ仕様

### 5.1. 週の定義
- **週の開始**: 土曜日
- **週の終了**: 金曜日
- **週が属する月**: その週の開始日（土曜日）が属する月
- **月内週番号**: その月の1日を含む週を第1週として数える

### 5.2. 月またぎの週の処理
月またぎの週とは、週の開始日（土曜日）が属する月と、指定された月が異なる週を指す。

**判定ロジック**:
```typescript
function isCrossMonthWeek(year: number, month: number, weekInMonth: number): boolean {
  const { start: weekStart } = getWeekDateRange(year, month, weekInMonth);
  const weekStartMonth = weekStart.getUTCMonth() + 1;
  return weekStartMonth !== month;
}
```

**例**:
- 7月5W: 2025-07-26(土)〜2025-08-01(金) → 8月1Wとして扱う
- 8月1W: 2025-07-26(土)〜2025-08-01(金) → 7月5Wとして扱う

### 5.3. 有効な週の取得
月またぎの週をスキップした週リストを生成する。

```typescript
function getValidWeeksInMonth(year: number, month: number): number[] {
  // 最大5週までに制限
  const maxWeeks = Math.min(calculatedWeeks, 5);
  
  const validWeeks: number[] = [];
  for (let week = 1; week <= maxWeeks; week++) {
    if (!isCrossMonthWeek(year, month, week)) {
      validWeeks.push(week);
    }
  }
  return validWeeks;
}
```

## 6. データ整合性ルール

### 6.1. 週計算の整合性
- 週の開始日は必ず土曜日
- 週の終了日は必ず金曜日
- 週の長さは必ず7日間
- 月またぎの週は自動的にスキップ

### 6.2. データ計算の整合性
- 総稼働者数 = 新規開始 + 切替完了 + 既存稼働者
- 総終了数 = 案件終了 + 契約終了 + その他離脱
- 各指標は重複を避けて計算

### 6.3. 日付フォーマットの統一
- すべての日付は `YYYY-MM-DD` 形式
- 時刻は UTC で統一
- タイムゾーンは Asia/Tokyo (JST) を基準

## 7. エラーハンドリング

### 7.1. データ検証
- 無効な日付形式の場合は `null` を返す
- 存在しない週番号の場合はエラーを返す
- 月またぎの週の場合は自動的にスキップ

### 7.2. フォールバック処理
- 有効な週が存在しない月の場合は第1週を選択
- データが存在しない場合は空配列を返す
- 計算エラーの場合は0を返す