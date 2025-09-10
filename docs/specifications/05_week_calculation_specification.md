# Venus Ark 週次レポートシステム - 週計算仕様書

**プロジェクト名**: Venus Ark 週次レポートシステム  
**バージョン**: 7.0 (月またぎ週対応版)  
**最終更新**: 2025年1月28日  
**ドキュメント種別**: 週計算仕様書

## 1. 目的

本書は Venus Ark 週次レポートシステムにおける「週」の定義と計算方法を明確に規定し、システム全体で一貫した週次集計を実現することを目的とする。特に月またぎの週の処理と期間選択UIの動作を詳細に定義する。

## 2. 週の定義

### 2.1 基本原則
- **週の開始**: 土曜日
- **週の終了**: 金曜日
- **週が属する月**: その週の中心点である火曜日が属する月とする
- **月内週番号**: その月の1日を含む週を第1週として数える
- **タイムゾーン**: Asia/Tokyo (JST)

### 2.2 月またぎの週の定義
月またぎの週とは、週の開始日（土曜日）が属する月と、指定された月が異なる週を指す。

**例**:
- 7月5W: 2025-07-26(土)〜2025-08-01(金) → 8月1Wとして扱う
- 8月1W: 2025-07-26(土)〜2025-08-01(金) → 7月5Wとして扱う

## 3. 実装済み週計算システム

### 3.1 週の日付範囲計算
```typescript
/**
 * 年、月、月内週番号から、その週の開始日（土）と終了日（金）を取得する
 * @param year 年
 * @param month 月 (1-12)
 * @param weekInMonth 月内週番号
 * @returns { start: Date, end: Date }
 */
export function getWeekDateRange(year: number, month: number, weekInMonth: number): { start: Date; end: Date } {
  // その月の1日を取得
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = firstDayOfMonth.getUTCDay(); // 0:Sun, 6:Sat

  // その月の1日を含む週の開始日（土曜日）を計算
  const daysToSubtract = (firstDayOfWeek + 1) % 7;
  const firstWeekStartDate = new Date(firstDayOfMonth);
  firstWeekStartDate.setUTCDate(1 - daysToSubtract);

  // 目的の週の開始日（土曜日）を計算
  const targetWeekStartDate = new Date(firstWeekStartDate);
  targetWeekStartDate.setUTCDate(firstWeekStartDate.getUTCDate() + (weekInMonth - 1) * 7);

  const start = targetWeekStartDate;
  const end = new Date(targetWeekStartDate);
  end.setUTCDate(targetWeekStartDate.getUTCDate() + 6);

  return { start, end };
}
```

### 3.2 日付から週番号への変換
```typescript
/**
 * 日付から、その週が「何年の何月の第何週か」を計算する
 * @param date 基準日
 * @returns { year, month, weekInMonth }
 */
export function getWeekNumberFromDate(date: Date): { year: number; month: number; weekInMonth: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  // 1. 基準日を含む週の開始日（土曜日）を求める
  const dayOfWeek = d.getUTCDay(); // 0:Sun, 6:Sat
  const weekStartDate = new Date(d);
  weekStartDate.setUTCDate(d.getUTCDate() - ((dayOfWeek + 1) % 7));

  // 2. 週が属する年と月を、週の中心である火曜日から決定する
  const tuesday = new Date(weekStartDate);
  tuesday.setUTCDate(weekStartDate.getUTCDate() + 3);
  const year = tuesday.getUTCFullYear();
  const month = tuesday.getUTCMonth() + 1; // 1-12

  // 3. 決定した月の1日を含む週の開始日（土曜日）を求める
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeekInMonth = firstDayOfMonth.getUTCDay();
  const firstWeekStartDateOfMonth = new Date(firstDayOfMonth);
  firstWeekStartDateOfMonth.setUTCDate(1 - ((firstDayOfWeekInMonth + 1) % 7));

  // 4. 基準週の開始日と、月初の週の開始日の差から、月内週番号を計算
  const diffTime = weekStartDate.getTime() - firstWeekStartDateOfMonth.getTime();
  const weekInMonth = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;

  return { year, month, weekInMonth };
}
```

### 3.3 週の開始日ベースの週番号計算
```typescript
/**
 * 週の開始日（土曜日）が属する月で週番号を計算する
 * @param date 週の開始日（土曜日）
 * @returns { year: number, month: number, weekInMonth: number }
 */
export function getWeekNumberFromWeekStart(date: Date): { year: number; month: number; weekInMonth: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  
  // 週の開始日が属する月と年
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1; // 1-12
  
  // その月の1日を含む週の開始日（土曜日）を求める
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = firstDayOfMonth.getUTCDay();
  const firstWeekStartDateOfMonth = new Date(firstDayOfMonth);
  firstWeekStartDateOfMonth.setUTCDate(1 - ((firstDayOfWeek + 1) % 7));
  
  // 基準週の開始日と、月初の週の開始日の差から、月内週番号を計算
  const diffTime = d.getTime() - firstWeekStartDateOfMonth.getTime();
  const weekInMonth = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
  
  return { year, month, weekInMonth };
}
```

### 3.4 月またぎの週の判定
```typescript
/**
 * 月またぎの週を判定する
 * @param year 年
 * @param month 月 (1-12)
 * @param weekInMonth 月内週番号
 * @returns 月またぎの週かどうか
 */
export function isCrossMonthWeek(year: number, month: number, weekInMonth: number): boolean {
  // 指定された週の開始日を取得
  const { start: weekStart } = getWeekDateRange(year, month, weekInMonth);
  
  // 週の開始日（土曜日）が属する月を取得
  const weekStartMonth = weekStart.getUTCMonth() + 1;
  
  // 指定された月と週の開始日が属する月が異なる場合は月またぎ
  return weekStartMonth !== month;
}
```

### 3.5 有効な週の取得
```typescript
/**
 * 月またぎの週をスキップした週リストを生成する
 * @param year 年
 * @param month 月 (1-12)
 * @returns 月またぎの週をスキップした週番号の配列
 */
export function getValidWeeksInMonth(year: number, month: number): number[] {
  // その月の最終日を取得
  const lastDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  lastDayOfMonth.setUTCMonth(lastDayOfMonth.getUTCMonth() + 1);
  lastDayOfMonth.setUTCDate(0); // これでその月の最終日になる
  
  // その月の1日を含む週の開始日（土曜日）を求める
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = firstDayOfMonth.getUTCDay();
  const firstWeekStartDate = new Date(firstDayOfMonth);
  firstWeekStartDate.setUTCDate(1 - ((firstDayOfWeek + 1) % 7));
  
  // その月の最終日を含む週の開始日（土曜日）を求める
  const lastDayOfWeek = lastDayOfMonth.getUTCDay();
  const lastWeekStartDate = new Date(lastDayOfMonth);
  lastWeekStartDate.setUTCDate(lastDayOfMonth.getUTCDate() - ((lastDayOfWeek + 1) % 7));
  
  // 週数を計算（最大5週まで）
  const diffTime = lastWeekStartDate.getTime() - firstWeekStartDate.getTime();
  const calculatedWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
  const maxWeeks = Math.min(calculatedWeeks, 5); // 最大5週までに制限
  
  const validWeeks: number[] = [];
  
  for (let week = 1; week <= maxWeeks; week++) {
    // 月またぎの週でない場合のみ追加
    if (!isCrossMonthWeek(year, month, week)) {
      validWeeks.push(week);
    }
  }
  
  return validWeeks;
}
```

## 4. 期間選択UIの仕様

### 4.1 期間選択コンポーネント
**ファイル**: `components/ui/period-selector.tsx`

#### 機能概要
- 年、月、週の選択
- 月またぎの週を自動的にスキップ
- 選択された期間の日付範囲表示

#### 実装詳細
```typescript
export function usePeriodSelection(initialYear?: number, initialMonth?: number, initialWeek?: number) {
  const now = new Date();
  const currentWeekInfo = getWeekNumberFromDate(now);
  
  // 初期値を設定
  const initialYearValue = initialYear || currentWeekInfo.year;
  const initialMonthValue = initialMonth || currentWeekInfo.month;
  const initialWeekValue = initialWeek || currentWeekInfo.weekInMonth;
  
  // 初期週の妥当性をチェック
  const initialValidWeeks = getValidWeeksInMonth(initialYearValue, initialMonthValue);
  const validInitialWeek = initialValidWeeks.includes(initialWeekValue) ? initialWeekValue : initialValidWeeks[0] || 1;
  
  const [selectedYear, setSelectedYear] = useState<number>(initialYearValue);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonthValue);
  const [selectedWeekInMonth, setSelectedWeekInMonth] = useState<number>(validInitialWeek);

  // 年または月が変更されたときに、週の選択が妥当かチェックし、必要であれば調整する
  useEffect(() => {
    const validWeeks = getValidWeeksInMonth(selectedYear, selectedMonth);
    if (validWeeks.length === 0) {
      // 有効な週がない場合は、その月の第1週を選択（月を変更しない）
      setSelectedWeekInMonth(1);
    } else if (!validWeeks.includes(selectedWeekInMonth)) {
      // 選択された週が有効でない場合は、最初の有効な週を選択
      setSelectedWeekInMonth(validWeeks[0]);
    }
  }, [selectedYear, selectedMonth]);

  return {
    selectedYear,
    selectedMonth,
    selectedWeekInMonth,
    setSelectedYear,
    setSelectedMonth,
    setSelectedWeekInMonth
  };
}
```

### 4.2 週選択の動作
1. **月選択時**: 選択された月の有効な週のみを表示
2. **週選択時**: 月またぎの週は自動的にスキップ
3. **初期化時**: 現在の日付から適切な週を自動選択

## 5. APIエンドポイントの週計算

### 5.1 週次稼働状況詳細API
**ファイル**: `app/api/work-status/weekly-detail/route.ts`

#### 週計算ロジック
```typescript
// 選択された月内の週を基準に4週間のデータを生成
const weekOffsets = [-2, -1, 0, 1, 2]; // 前2週、前1週、選択週、後1週、後2週
let validWeekCount = 0;
const maxWeeks = 4; // 最大4週間表示

for (let i = 0; i < weekOffsets.length && validWeekCount < maxWeeks; i++) {
  const offset = weekOffsets[i];
  const weekSaturday = new Date(targetSaturday);
  weekSaturday.setDate(targetSaturday.getDate() + offset * 7);
  
  const weekStart = new Date(weekSaturday); // 土曜日開始
  const weekEnd = new Date(weekSaturday);
  weekEnd.setDate(weekEnd.getDate() + 6); // 金曜日終了
  
  // 週ラベルを生成
  const weekStartMonth = weekStart.getUTCMonth() + 1; // 週の開始日（土曜日）が属する月
  const weekStartWeekInfo = getWeekNumberFromWeekStart(weekStart);
  const weekInMonth = weekStartWeekInfo.weekInMonth;
  
  const weekLabel = `${weekStartMonth}月${weekInMonth}W`;
  
  // 月またぎの週かどうかをチェック
  const isCrossMonth = isCrossMonthWeek(weekStartWeekInfo.year, weekStartMonth, weekInMonth);
  
  if (isCrossMonth) {
    continue; // 月またぎの週はスキップ
  }
  
  // 週のデータを計算して追加
  const weekDetail = calculateWeeklyStatusWithDetails(members, weekStart, weekEnd, weekLabel, validWeekCount + 1);
  weekDetails.push(weekDetail);
  validWeekCount++;
}
```

#### レスポンス形式
```typescript
interface WeeklyWorkStatusDetailOptimized {
  year: number;
  month: number;
  weekDetails: WeeklyDetailOptimized[];
}

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
  memberDetails: {
    newStarted: MemberDetailWithDates[];
    switching: MemberDetailWithDates[];
    projectEnded: MemberDetailWithDates[];
    contractEnded: MemberDetailWithDates[];
    counselingStarted: MemberDetailWithDates[];
  };
}
```

## 6. 週計算の具体例

### 6.1 2025年8月の週計算例
```
8月1週目: 2025-07-26(土)〜2025-08-01(金) → 月またぎの週（スキップ）
8月2週目: 2025-08-02(土)〜2025-08-08(金) → 有効
8月3週目: 2025-08-09(土)〜2025-08-15(金) → 有効
8月4週目: 2025-08-16(土)〜2025-08-22(金) → 有効
8月5週目: 2025-08-23(土)〜2025-08-29(金) → 有効
```

### 6.2 8月2週目を選択した場合の表示週
```
前2週: 7月4W (2025-07-19〜2025-07-25)
前1週: 7月5W (2025-07-26〜2025-08-01)
選択週: 8月2W (2025-08-02〜2025-08-08)
後1週: 8月3W (2025-08-09〜2025-08-15) - 予定
```

## 7. データ計算ロジック

### 7.1 総稼働者数の計算
```typescript
function calculateTotalActive(members: Member[], weekEnd: Date): number {
  return members.filter(member => {
    const startDate = member.lastWorkStartDate;
    const endDate = member.lastWorkEndDate;
    
    if (!startDate || startDate > weekEnd) {
      return false;
    }
    
    // 終了日がないか、終了日が週終了日以降なら稼働中
    return !endDate || endDate >= weekEnd;
  }).length;
}
```

### 7.2 新規開始者の計算
```typescript
function getNewStartedDetails(members: Member[], weekStart: Date, weekEnd: Date): MemberDetailWithDates[] {
  return members
    .filter(member => {
      if (!member.lastWorkStartDate) return false;
      const startDate = new Date(member.lastWorkStartDate);
      if (!(startDate >= weekStart && startDate <= weekEnd)) return false;
      
      // 新規開始の判定: 終了日が存在しない場合のみ新規開始
      if (!member.lastWorkEndDate) return true;
      
      return false; // 終了日が存在する場合は新規開始ではない（切替完了に分類される）
    })
    .map(member => ({
      id: member.id,
      name: member.name,
      lastWorkStartDate: formatDate(member.lastWorkStartDate),
      lastWorkEndDate: formatDate(member.lastWorkEndDate),
      contractEndDate: formatDate(member.contractEndDate),
      firstCounselingDate: formatDate(member.firstCounselingDate),
      status: member.status,
      projectName: '新規開始'
    }));
}
```

### 7.3 切替完了者の計算
```typescript
function getSwitchingDetails(members: Member[], weekStart: Date, weekEnd: Date): MemberDetailWithDates[] {
  return members
    .filter(member => {
      if (!member.lastWorkStartDate || !member.lastWorkEndDate) return false;
      const startDate = new Date(member.lastWorkStartDate);
      const endDate = new Date(member.lastWorkEndDate);
      
      // 切替完了の判定: lastWorkEndDateが存在し、それより後に週範囲内でlastWorkStartDate
      return endDate < startDate && startDate >= weekStart && startDate <= weekEnd;
    })
    .map(member => ({
      id: member.id,
      name: member.name,
      lastWorkStartDate: formatDate(member.lastWorkStartDate),
      lastWorkEndDate: formatDate(member.lastWorkEndDate),
      contractEndDate: formatDate(member.contractEndDate),
      firstCounselingDate: formatDate(member.firstCounselingDate),
      status: member.status,
      projectName: '切替完了'
    }));
}
```

## 8. エラーハンドリング

### 8.1 週選択エラー
- 無効な週が選択された場合、自動的に有効な週に調整
- 有効な週が存在しない月の場合、第1週を選択

### 8.2 データ計算エラー
- 日付フォーマットエラーの場合、nullを返す
- メンバーデータが存在しない場合、空配列を返す

## 9. パフォーマンス考慮事項

### 9.1 週計算の最適化
- 週計算は`useMemo`を使用してキャッシュ
- 月またぎの週判定は事前計算で高速化

### 9.2 データ取得の最適化
- メンバーデータは一度取得して再利用
- 週次計算は必要な期間のみ実行

## 10. テスト仕様

### 10.1 週計算テスト
- 月またぎの週の正しい判定
- 有効な週リストの生成
- 週ラベルの正しい生成

### 10.2 UIテスト
- 期間選択の動作確認
- 週選択の妥当性チェック
- エラー時の適切な処理

### 10.3 データ計算テスト
- 各指標の正しい計算
- 重複データの適切な処理
- エッジケースの処理 