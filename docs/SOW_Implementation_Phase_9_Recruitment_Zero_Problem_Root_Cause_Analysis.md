# Venus Ark 採用活動レポート ゼロ問題 根本原因分析とSOW

**プロジェクト名**: Venus Ark 週次レポートシステム  
**バージョン**: 9.0 (根本原因解決フェーズ)  
**作成日**: 2025年1月28日  
**ドキュメント種別**: Statement of Work (SOW)

## 1. 問題の概要

### 1.1 現在の状況
採用活動レポートにおいて、以下の項目が常に0として表示される問題が発生している：
- 書類提出数 (`documentSubmitted`)
- 面接予定数 (`interviewScheduled`)
- 面接実施数 (`interviewConducted`)
- 採用者数 (`hireCount`)
- 内定受諾数 (`offerAcceptedCount`)
- 不採用者内訳 (`rejectionBreakdown`)

### 1.2 影響範囲
- 採用活動の進捗が正しく把握できない
- 週次レポートの信頼性低下
- 意思決定の根拠となるデータが不正確

## 2. 根本原因分析

### 2.1 データフロー全体像（ASCII図）

```
[Google Sheets]
  ├─ 応募者管理シート（indeed/engage各職種）
  │   ├─ 基本情報（氏名、メール、電話）
  │   ├─ 応募情報（応募日、ステータス）
  │   ├─ ステージ日付（書類提出、面接、採用、受諾）
  │   └─ 結果情報（不採用理由、詳細）
  │
  └─ 求人エントリーフォーム（タイムスタンプ）
      ├─ フォーム提出タイムスタンプ
      ├─ 応募者基本情報
      └─ 希望職種・経験等

       │
       ▼
[API 同期処理]
  /api/recruitment/sync-week（選択週）
    1) 対象週のシート行を取得・抽出
    2) 行を検証・変換（validateAndTransform）
    3) Firestore applications に upsert
    4) 週次集計を生成（generateWeeklyRecruitmentReport）
    5) Firestore weekly_reports に upsert

  /api/recruitment/sync（全体）
    1) 全シート全期間を取得
    2) エントリーフォームの氏名→タイムスタンプMapを作成
    3) applications に upsert
    4) 全期間の weekly_reports を再生成・保存

       │
       ▼
[Firestore データストア]
  ├─ applications（応募ドキュメント単位）
  │   ├─ 基本情報（applicantName, email, phone）
  │   ├─ 応募情報（applicationDate, status）
  │   ├─ ステージ日付（documentSubmitDate, interviewDate, hireDate, acceptanceDate）
  │   ├─ 結果情報（rejectionReason, rejectionDetail）
  │   └─ メタ情報（createdAt, updatedAt, formSubmissionTimestamp）
  │
  └─ weekly_reports（週・職種別集計）
      ├─ 週情報（year, weekNumber, startDate, endDate）
      ├─ 職種情報（jobCategory）
      ├─ 集計指標（recruitmentMetrics）
      └─ メタ情報（createdAt, updatedAt, generatedAt）

       │
       ▼
[フロントエンド表示]
  hooks/use-weekly-reports → /api/recruitment/weekly-reports
  ダッシュボードに表示（UI側でも合計・率の再計算で整合性チェック）
```

### 2.2 仕様と実装の差分分析

#### 2.2.1 書類提出日の定義（重大な差分）

**仕様（docs/specifications/03_data_definition.md）**:
```
書類提出に関する業務ルール:
- 書類提出日は、原則として「求人エントリーフォーム」のタイムスタンプを採用する
- 採用管理シートに書類提出日列が存在しない/空の場合でも、フォーム提出があれば提出日として扱う
- フォームの「名前」を正規化したキーで名寄せ
```

**現在の実装**:
- `sync`（全体）: エントリーフォームMapを取得して名寄せ
- `sync-week`（選択週）: エントリーフォームMapを取得していない
- `applications.documentSubmitDate`: フォーム由来の日付を保存していないケースが多い
- 集計の本番値: `countByDateFieldRange('documentSubmitDate', ...)` に依存

**影響**: `documentSubmitted` が 0 になりやすい（ログ上も全て0）

#### 2.2.2 職種の決定ロジック

**仕様（docs/specifications/04_mapping_management_guide.md）**:
```
職種カテゴリ:
- 列「職種」をマッピング（SNS運用、動画クリエイター、AIライター、撮影スタッフ、その他）
```

**現在の実装**:
- シート名の文言から推定（SNS/動画/ライター/撮影）
- 列「職種」は未使用

**影響**: シート名が想定外だと誤分類 or 既定職種（SNS）になる

#### 2.2.3 列名マッピングの一元管理

**仕様**:
```
設計原則:
- Single Source of Truth: マッピング定義は実装コードで一元管理
- 型安全性: TypeScript型定義による静的検証
```

**現在の実装**:
- `validateAndTransformSheetData` 内でヘッダ検出（エイリアス配列）＋動的抽出
- 専用のマッピング定義ファイルはなし

**影響**: 列名変更に脆弱、変更が分散しやすい

#### 2.2.4 日付型の統一

**仕様**:
```
日付フォーマットの統一:
- すべての日付は YYYY-MM-DD 形式
- 時刻は UTC で統一
```

**現在の実装**:
- 文字列（YYYY-MM-DD）と Timestamp、ISO文字列が混在
- `countByDateFieldRange` は混在対策で両型クエリ

**影響**: クエリ・整合性の複雑化、0件が出やすい

### 2.3 現在の0問題の直接原因（ログ分析結果）

#### 2.3.1 データ取り込み段階の問題
```
[VALIDATION] headerMatches: {
  documentSubmitDate: false,  // 列名不一致/空
  interviewDate: false,       // 列名不一致/空
  hireDate: false,           // 列名不一致/空
  acceptanceDate: false      // 列名不一致/空
}
```

#### 2.3.2 集計段階の問題
```
[DEBUG] countByDateFieldRange documentSubmitDate: string=0, timestamp=0, total=0
[DEBUG] countByDateFieldRange interviewDate: string=0, timestamp=0, total=0
[DEBUG] countByDateFieldRange hireDate: string=0, timestamp=0, total=0
```

#### 2.3.3 根本原因の特定
1. **書類提出日の補完不足**: `sync-week` でフォームMapを取得していない
2. **列名マッピングの不備**: 実際のシート列名とエイリアスが一致しない
3. **日付型の混在**: 文字列/Timestamp/ISO文字列が混在
4. **職種決定の誤り**: 列「職種」を使用せず、シート名推定のみ

## 3. 解決策の設計

### 3.1 本来あるべき姿（仕様整合）

#### 3.1.1 書類提出日の完全実装
```typescript
// sync-week でもフォームMapを取得
const formTimestampMap = await getEntryFormTimestampMap();

// validateAndTransform後、documentSubmitDate補完
if (!application.documentSubmitDate && formTimestampMap.has(normalizedName)) {
  const formTimestamp = formTimestampMap.get(normalizedName);
  application.documentSubmitDate = formatDateToYYYYMMDD(formTimestamp);
}
```

#### 3.1.2 職種決定の改善
```typescript
// 列「職種」を最優先、シート名はフォールバック
const jobCategory = getJobCategoryFromColumn(row, headers) || 
                   getJobCategoryFromSheetName(sheetName) || 
                   JobCategory.SNS_OPERATION;
```

#### 3.1.3 マッピングの一元化
```typescript
// lib/integrations/recruitment-mapping.ts
export const RECRUITMENT_HEADER_MAPPING = {
  documentSubmitDate: ['書類提出日', '書類提出', '提出日', 'フォーム提出日'],
  interviewDate: ['面接日', '面接日時', '面談予定日時', '面談日時', '一次面談日'],
  hireDate: ['採用日', '入社日', '採用決定日'],
  acceptanceDate: ['内定受諾日', '内定承諾日', '承諾日'],
  // ... 他のマッピング
};
```

#### 3.1.4 日付型の統一
```typescript
// 検索対象フィールドは全て YYYY-MM-DD 文字列で保存
const dateFields = ['applicationDate', 'documentSubmitDate', 'interviewDate', 
                   'interviewImplementedDate', 'hireDate', 'acceptanceDate'];

// Timestampは監査用に限定
const auditFields = ['createdAt', 'updatedAt', 'syncedAt'];
```

### 3.2 段階的改善計画

#### Phase 1: 緊急修正（即効性重視）
1. **sync-week のフォームMap取得実装**
2. **documentSubmitDate の補完ロジック追加**
3. **列名エイリアスの拡充**

#### Phase 2: 構造改善（保守性重視）
1. **マッピング定義の一元化**
2. **職種決定ロジックの改善**
3. **日付型の統一**

#### Phase 3: 品質向上（信頼性重視）
1. **データ検証の強化**
2. **エラーハンドリングの改善**
3. **ログ・監視の充実**

## 4. 実装計画（SOW）

### 4.1 Phase 1: 緊急修正（1-2日）

#### 4.1.1 タスク1: sync-week のフォームMap取得実装
**目的**: 選択週同期でも書類提出日を補完できるようにする

**実装内容**:
```typescript
// app/api/recruitment/sync-week/route.ts
export async function POST(request: NextRequest) {
  // 既存の処理...
  
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
}
```

**受け入れ基準**:
- [ ] `sync-week` 実行時にフォームMapが取得される
- [ ] `documentSubmitDate` が空の場合、フォームタイムスタンプで補完される
- [ ] 補完処理のログが出力される

#### 4.1.2 タスク2: 列名エイリアスの拡充
**目的**: 実際のシート列名に対応するエイリアスを追加

**実装内容**:
```typescript
// lib/data-processing/validation.ts
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

#### 4.1.3 タスク3: 集計のフォールバック実装
**目的**: `documentSubmitDate` が0の場合の代替手段を提供

**実装内容**:
```typescript
// lib/analytics/weekly-aggregation.ts
export async function generateWeeklyRecruitmentReport(
  year: number, month: number, weekInMonth: number, jobCategory: JobCategory
): Promise<WeeklyRecruitmentReport> {
  // 既存の処理...
  
  // documentSubmitted のフォールバック
  let documentSubmitted = await countByDateFieldRange('documentSubmitDate', start, end, jobCategory);
  if (documentSubmitted === 0) {
    // formSubmissionTimestamp も対象に追加
    const formBasedCount = await countByFormSubmissionTimestamp(start, end, jobCategory);
    documentSubmitted = formBasedCount;
    logger.debug({ documentSubmitted, formBasedCount }, 
                 '[AGG] documentSubmitted fallback to formSubmissionTimestamp');
  }
}
```

**受け入れ基準**:
- [ ] `documentSubmitDate` が0の場合、`formSubmissionTimestamp` で代替集計される
- [ ] フォールバック処理のログが出力される
- [ ] 最終的な `documentSubmitted` が正しい値になる

### 4.2 Phase 2: 構造改善（3-5日）

#### 4.2.1 タスク4: マッピング定義の一元化
**目的**: 列名マッピングを専用ファイルに集約

**実装内容**:
```typescript
// lib/integrations/recruitment-mapping.ts
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

#### 4.2.2 タスク5: 職種決定ロジックの改善
**目的**: 列「職種」を最優先にした職種決定

**実装内容**:
```typescript
// lib/data-processing/validation.ts
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

function getJobCategoryFromSheetName(sheetName: string): JobCategory {
  const normalizedName = sheetName.toLowerCase();
  
  if (normalizedName.includes('sns') || normalizedName.includes('運用')) {
    return JobCategory.SNS_OPERATION;
  }
  if (normalizedName.includes('動画') || normalizedName.includes('video')) {
    return JobCategory.VIDEO_CREATOR;
  }
  if (normalizedName.includes('ライター') || normalizedName.includes('writer')) {
    return JobCategory.AI_WRITER;
  }
  if (normalizedName.includes('撮影') || normalizedName.includes('photo')) {
    return JobCategory.PHOTOGRAPHY_STAFF;
  }
  
  return JobCategory.SNS_OPERATION; // デフォルト
}
```

**受け入れ基準**:
- [ ] 列「職種」が存在する場合、その値が優先される
- [ ] 列「職種」が存在しない場合、シート名から推定される
- [ ] 職種決定のログが出力される

#### 4.2.3 タスク6: 日付型の統一
**目的**: 検索対象フィールドを YYYY-MM-DD 文字列に統一

**実装内容**:
```typescript
// lib/data-processing/validation.ts
function normalizeDateField(value: any): string | null {
  if (!value) return null;
  
  // 既存の日付パース処理...
  const parsedDate = parseDate(value);
  if (!parsedDate) return null;
  
  // YYYY-MM-DD 形式で返す
  return formatDateToYYYYMMDD(parsedDate);
}

// lib/firestore/applications.ts
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

### 4.3 Phase 3: 品質向上（2-3日）

#### 4.3.1 タスク7: データ検証の強化
**目的**: データ品質を向上させる検証機能を追加

**実装内容**:
```typescript
// lib/data-processing/validation.ts
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fieldPresence: Record<string, boolean>;
}

function validateApplicationData(application: ApplicationInput): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldPresence: {}
  };
  
  // 必須フィールドチェック
  if (!application.applicantName) {
    result.errors.push('applicantName is required');
    result.isValid = false;
  }
  
  // 日付フィールドの整合性チェック
  if (application.hireDate && application.applicationDate) {
    const hireDate = new Date(application.hireDate);
    const applicationDate = new Date(application.applicationDate);
    if (hireDate < applicationDate) {
      result.warnings.push('hireDate is before applicationDate');
    }
  }
  
  // フィールド存在チェック
  result.fieldPresence = {
    documentSubmitDate: !!application.documentSubmitDate,
    interviewDate: !!application.interviewDate,
    hireDate: !!application.hireDate,
    acceptanceDate: !!application.acceptanceDate
  };
  
  return result;
}
```

**受け入れ基準**:
- [ ] データ検証が実行される
- [ ] エラー・警告が適切に分類される
- [ ] フィールド存在状況が記録される

#### 4.3.2 タスク8: エラーハンドリングの改善
**目的**: より詳細なエラー情報を提供

**実装内容**:
```typescript
// lib/error-handling.ts
export class RecruitmentSyncError extends Error {
  constructor(
    message: string,
    public phase: string,
    public details: Record<string, any>
  ) {
    super(message);
    this.name = 'RecruitmentSyncError';
  }
}

export function handleRecruitmentSyncError(
  error: Error,
  phase: string,
  context: Record<string, any>
): void {
  if (error instanceof RecruitmentSyncError) {
    logger.error({
      error: error.message,
      phase: error.phase,
      details: error.details,
      context
    }, '[RECRUITMENT] Sync error');
  } else {
    logger.error({
      error: error.message,
      phase,
      context
    }, '[RECRUITMENT] Unexpected error');
  }
}
```

**受け入れ基準**:
- [ ] エラーが適切に分類される
- [ ] エラー詳細がログに記録される
- [ ] エラーコンテキストが保持される

#### 4.3.3 タスク9: ログ・監視の充実
**目的**: 問題の早期発見と原因特定を支援

**実装内容**:
```typescript
// lib/logger.ts
export interface RecruitmentMetrics {
  applicationsProcessed: number;
  applicationsWithDocumentSubmit: number;
  applicationsWithInterview: number;
  applicationsWithHire: number;
  applicationsWithAcceptance: number;
  validationErrors: number;
  validationWarnings: number;
}

export function logRecruitmentMetrics(
  traceId: string,
  phase: string,
  metrics: RecruitmentMetrics
): void {
  logger.info({
    traceId,
    phase,
    metrics
  }, '[RECRUITMENT] Metrics summary');
}

// 定期的なメトリクス集計
export async function generateRecruitmentHealthReport(): Promise<void> {
  const report = {
    timestamp: new Date(),
    totalApplications: await countApplications(),
    applicationsWithDocumentSubmit: await countApplicationsWithField('documentSubmitDate'),
    applicationsWithInterview: await countApplicationsWithField('interviewDate'),
    applicationsWithHire: await countApplicationsWithField('hireDate'),
    applicationsWithAcceptance: await countApplicationsWithField('acceptanceDate')
  };
  
  logger.info(report, '[RECRUITMENT] Health report');
}
```

**受け入れ基準**:
- [ ] メトリクスが適切に記録される
- [ ] ヘルスレポートが生成される
- [ ] 問題の早期発見が可能になる

## 5. 受け入れ基準（全体）

### 5.1 機能要件
- [ ] 書類提出数が正しく表示される
- [ ] 面接予定数・実施数が正しく表示される
- [ ] 採用者数・内定受諾数が正しく表示される
- [ ] 不採用者内訳が正しく表示される
- [ ] 週次レポートの各指標が0以外の値になる

### 5.2 非機能要件
- [ ] 同期処理のパフォーマンスが維持される
- [ ] エラーハンドリングが適切に動作する
- [ ] ログが詳細に出力される
- [ ] データの整合性が保たれる

### 5.3 品質要件
- [ ] 既存機能に影響がない
- [ ] テストケースが追加される
- [ ] ドキュメントが更新される
- [ ] コードレビューが実施される

## 6. リスク管理

### 6.1 技術リスク
- **リスク**: 既存データとの整合性問題
- **対策**: 段階的デプロイ、ロールバック計画の準備

### 6.2 運用リスク
- **リスク**: 同期処理の遅延
- **対策**: パフォーマンス監視、バッチサイズ調整

### 6.3 データリスク
- **リスク**: データ損失
- **対策**: バックアップ、データ検証の強化

## 7. 成功指標

### 7.1 定量的指標
- 書類提出数の表示率: 0% → 80%以上
- 面接実施数の表示率: 0% → 70%以上
- 採用者数の表示率: 0% → 60%以上
- 同期処理の成功率: 95%以上

### 7.2 定性的指標
- 採用活動の進捗が正確に把握できる
- 週次レポートの信頼性が向上する
- データ品質の問題が早期に発見される

## 8. スケジュール

### 8.1 Phase 1: 緊急修正（1-2日）
- Day 1: タスク1-2の実装
- Day 2: タスク3の実装とテスト

### 8.2 Phase 2: 構造改善（3-5日）
- Day 3-4: タスク4-5の実装
- Day 5: タスク6の実装とテスト

### 8.3 Phase 3: 品質向上（2-3日）
- Day 6-7: タスク7-8の実装
- Day 8: タスク9の実装と総合テスト

### 8.4 総合テスト・デプロイ（1日）
- Day 9: 最終テスト、ドキュメント更新、デプロイ

## 9. 成果物

### 9.1 コード成果物
- 修正されたAPIエンドポイント
- 新しいマッピング定義ファイル
- 改善されたデータ検証機能
- 強化されたログ・監視機能

### 9.2 ドキュメント成果物
- 更新されたデータ定義書
- 更新されたマッピング管理ガイド
- 実装ガイド
- トラブルシューティングガイド

### 9.3 テスト成果物
- 単体テストケース
- 統合テストケース
- パフォーマンステスト結果
- 品質保証レポート

---

**作成者**: Venus Ark 開発チーム  
**技術責任者**: [技術責任者名]  
**作成日**: 2025年1月28日  
**次回レビュー**: Phase 1完了後  
**関連ドキュメント**:
- [03_data_definition.md](./specifications/03_data_definition.md)
- [04_mapping_management_guide.md](./specifications/04_mapping_management_guide.md)
- [SOW_Implementation_Phase_8_Recruitment_Diagnostics.md](./SOW_Implementation_Phase_8_Recruitment_Diagnostics.md)

