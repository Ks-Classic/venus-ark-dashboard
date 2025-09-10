# 採用活動レポート ゼロ問題 解決TODO

## 根本原因分析結果

### 現在の0問題の直接原因
1. **書類提出日の補完不足**: `sync-week` でフォームMapを取得していない
2. **列名マッピングの不備**: 実際のシート列名とエイリアスが一致しない
3. **日付型の混在**: 文字列/Timestamp/ISO文字列が混在
4. **職種決定の誤り**: 列「職種」を使用せず、シート名推定のみ

### 仕様と実装の差分
- **書類提出日**: 仕様では「フォームタイムスタンプで補完」だが、実装では `sync-week` で補完していない
- **職種決定**: 仕様では「列職種をマッピング」だが、実装ではシート名推定のみ
- **マッピング管理**: 仕様では「一元管理」だが、実装では分散している
- **日付型**: 仕様では「YYYY-MM-DD統一」だが、実装では混在

## Phase 1: 緊急修正（1-2日）

### ✅ タスク1: sync-week のフォームMap取得実装
**ファイル**: `app/api/recruitment/sync-week/route.ts`
**目的**: 選択週同期でも書類提出日を補完できるようにする

**実装内容**:
```typescript
// フォームMap取得を追加
const formTimestampMap = await getEntryFormTimestampMap();
appendToLog({ traceId, phase: 'formMapFetch', mapSize: formTimestampMap.size });

// validateAndTransform後、documentSubmitDate補完
for (const application of validatedApplications) {
  if (!application.documentSubmitDate) {
    const normalizedName = normalizePersonName(application.applicantName);
    if (formTimestampMap.has(normalizedName)) {
      const formTimestamp = formTimestampMap.get(normalizedName);
      application.documentSubmitDate = formatDateToYYYYMMDD(formTimestamp);
      appendToLog({ traceId, phase: 'documentSubmitDateSupplemented', 
                   applicantName: application.applicantName, 
                   originalDate: application.documentSubmitDate, 
                   supplementedDate: formTimestamp });
    }
  }
}
```

**受け入れ基準**:
- [ ] `sync-week` 実行時にフォームMapが取得される
- [ ] `documentSubmitDate` が空の場合、フォームタイムスタンプで補完される
- [ ] 補完処理のログが出力される

### ✅ タスク2: 列名エイリアスの拡充
**ファイル**: `lib/data-processing/validation.ts`
**目的**: 実際のシート列名に対応するエイリアスを追加

**実装内容**:
```typescript
const HEADER_ALIASES = {
  documentSubmitDate: [
    '書類提出日', '書類提出', '提出日', 'フォーム提出日',
    '書類提出日時', '提出日時', '書類提出完了日'
  ],
  interviewDate: [
    '面接日', '面接日時', '面談予定日時', '面談日時',
    '一次面談日', '一次面接日', '面談日', '面接日',
    '面接予定日', '面談予定日'
  ],
  interviewImplementedDate: [
    '面接実施日', '面談実施日', '実施日', '面談実施',
    '面接完了日', '面談完了日', '面接実施日時'
  ],
  hireDate: [
    '採用日', '入社日', '採用決定日', '採用決定',
    '採用完了日', '採用日時'
  ],
  acceptanceDate: [
    '内定受諾日', '内定承諾日', '承諾日', '受諾日',
    '内定受諾', '内定承諾', '受諾完了日'
  ]
};
```

**受け入れ基準**:
- [ ] 実際のシート列名が検出される
- [ ] `headerMatches` ログで `true` が表示される
- [ ] 対応する日付フィールドが正しくパースされる

### ✅ タスク3: 集計のフォールバック実装
**ファイル**: `lib/analytics/weekly-aggregation.ts`
**目的**: `documentSubmitDate` が0の場合の代替手段を提供

**実装内容**:
```typescript
// documentSubmitted のフォールバック
let documentSubmitted = await countByDateFieldRange('documentSubmitDate', start, end, jobCategory);
if (documentSubmitted === 0) {
  // formSubmissionTimestamp も対象に追加
  const formBasedCount = await countByFormSubmissionTimestamp(start, end, jobCategory);
  documentSubmitted = formBasedCount;
  logger.debug({ documentSubmitted, formBasedCount }, 
               '[AGG] documentSubmitted fallback to formSubmissionTimestamp');
}
```

**受け入れ基準**:
- [ ] `documentSubmitDate` が0の場合、`formSubmissionTimestamp` で代替集計される
- [ ] フォールバック処理のログが出力される
- [ ] 最終的な `documentSubmitted` が正しい値になる

## Phase 2: 構造改善（3-5日）

### 🔄 タスク4: マッピング定義の一元化
**ファイル**: `lib/integrations/recruitment-mapping.ts` (新規作成)
**目的**: 列名マッピングを専用ファイルに集約

**実装内容**:
```typescript
export const RECRUITMENT_HEADER_MAPPING = {
  // 基本情報
  applicantName: ['氏名', '名前', '応募者名', '名前（漢字）'],
  email: ['メールアドレス', 'メール', 'Eメール', 'メールアドレス'],
  phone: ['電話番号', '電話', '連絡先', '電話番号'],
  
  // 応募情報
  applicationDate: ['応募日', '応募日時', '応募', '応募完了日'],
  status: ['ステータス', '現状ステータス', '選考状況', '状況'],
  
  // ステージ日付（Phase 1で拡充したエイリアスを含む）
  documentSubmitDate: [/* Phase 1で定義したエイリアス */],
  interviewDate: [/* Phase 1で定義したエイリアス */],
  interviewImplementedDate: [/* Phase 1で定義したエイリアス */],
  hireDate: [/* Phase 1で定義したエイリアス */],
  acceptanceDate: [/* Phase 1で定義したエイリアス */],
  
  // 結果情報
  rejectionReason: ['不採用理由', '不採用', '理由', '不採用詳細'],
  rejectionDetail: ['不採用詳細', '詳細', '備考', 'コメント']
};

export const JOB_CATEGORY_MAPPING = {
  'SNS運用': JobCategory.SNS_OPERATION,
  '動画クリエイター': JobCategory.VIDEO_CREATOR,
  'AIライター': JobCategory.AI_WRITER,
  '撮影スタッフ': JobCategory.PHOTOGRAPHY_STAFF,
  'その他': JobCategory.OTHER
};
```

**受け入れ基準**:
- [ ] マッピング定義が専用ファイルに集約される
- [ ] `validateAndTransformSheetData` が新しいマッピングを使用する
- [ ] 既存の機能が正常に動作する

### 🔄 タスク5: 職種決定ロジックの改善
**ファイル**: `lib/data-processing/validation.ts`
**目的**: 列「職種」を最優先にした職種決定

**実装内容**:
```typescript
function determineJobCategory(
  row: any[], 
  headers: string[], 
  sheetName: string
): JobCategory {
  // 1. 列「職種」を最優先
  const jobCategoryColumnIndex = headers.findIndex(h => 
    ['職種', '希望職種', '応募職種'].includes(h)
  );
  
  if (jobCategoryColumnIndex !== -1) {
    const jobCategoryValue = row[jobCategoryColumnIndex];
    if (jobCategoryValue) {
      const mappedCategory = JOB_CATEGORY_MAPPING[jobCategoryValue];
      if (mappedCategory) {
        return mappedCategory;
      }
    }
  }
  
  // 2. シート名から推定（フォールバック）
  return getJobCategoryFromSheetName(sheetName);
}
```

**受け入れ基準**:
- [ ] 列「職種」が存在する場合、その値が優先される
- [ ] 列「職種」が存在しない場合、シート名から推定される
- [ ] 職種決定のログが出力される

### 🔄 タスク6: 日付型の統一
**ファイル**: `lib/firestore/applications.ts`
**目的**: 検索対象フィールドを YYYY-MM-DD 文字列に統一

**実装内容**:
```typescript
export async function countByDateFieldRange(
  field: 'documentSubmitDate' | 'interviewDate' | 'interviewImplementedDate' | 'hireDate' | 'acceptanceDate',
  startDate: Date,
  endDate: Date,
  jobCategory?: JobCategory
): Promise<number> {
  // YYYY-MM-DD 文字列のみでクエリ（Timestampは削除）
  const startStr = formatDateToYYYYMMDD(startDate);
  const endStr = formatDateToYYYYMMDD(endDate);
  
  let query = adminDbInstance.collection(COLLECTION_NAME)
    .where(field, '>=', startStr)
    .where(field, '<=', endStr);
    
  if (jobCategory) {
    query = query.where('jobCategory', '==', jobCategory);
  }
  
  const snapshot = await query.get();
  return snapshot.size;
}
```

**受け入れ基準**:
- [ ] 検索対象フィールドが全て YYYY-MM-DD 文字列で保存される
- [ ] `countByDateFieldRange` が文字列のみでクエリする
- [ ] 日付型の混在が解消される

## Phase 3: 品質向上（2-3日）

### 🔄 タスク7: データ検証の強化
**ファイル**: `lib/data-processing/validation.ts`
**目的**: データ品質を向上させる検証機能を追加

### 🔄 タスク8: エラーハンドリングの改善
**ファイル**: `lib/error-handling.ts`
**目的**: より詳細なエラー情報を提供

### 🔄 タスク9: ログ・監視の充実
**ファイル**: `lib/logger.ts`
**目的**: 問題の早期発見と原因特定を支援

## 全体の受け入れ基準

### 機能要件
- [ ] 書類提出数が正しく表示される
- [ ] 面接予定数・実施数が正しく表示される
- [ ] 採用者数・内定受諾数が正しく表示される
- [ ] 不採用者内訳が正しく表示される
- [ ] 週次レポートの各指標が0以外の値になる

### 非機能要件
- [ ] 同期処理のパフォーマンスが維持される
- [ ] エラーハンドリングが適切に動作する
- [ ] ログが詳細に出力される
- [ ] データの整合性が保たれる

## 成功指標

### 定量的指標
- 書類提出数の表示率: 0% → 80%以上
- 面接実施数の表示率: 0% → 70%以上
- 採用者数の表示率: 0% → 60%以上
- 同期処理の成功率: 95%以上

### 定性的指標
- 採用活動の進捗が正確に把握できる
- 週次レポートの信頼性が向上する
- データ品質の問題が早期に発見される

## スケジュール

- **Phase 1**: 1-2日（緊急修正）
- **Phase 2**: 3-5日（構造改善）
- **Phase 3**: 2-3日（品質向上）
- **総合テスト・デプロイ**: 1日

**合計**: 7-11日

