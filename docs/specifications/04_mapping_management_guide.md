# Venus Ark 週次レポートシステム - マッピング管理ガイド

**プロジェクト名**: Venus Ark 週次レポートシステム  
**バージョン**: 6.0 (運用フェーズ)  
**最終更新**: 2025年1月28日  
**ドキュメント種別**: マッピング管理ガイド

## 1. 目的

本書は Venus Ark 週次レポートシステムにおける外部データソース（Notion、Google Sheets）とFirestoreとのフィールドマッピング管理を体系化し、データ連携の一貫性と保守性を確保することを目的とする。

## 2. マッピング管理の基本原則

### 2.1 設計原則
- **Single Source of Truth**: マッピング定義は実装コードで一元管理
- **型安全性**: TypeScript型定義による静的検証
- **保守性**: 明確な命名規則と構造化されたマッピング定義
- **可読性**: 実際のプロパティ名と内部フィールド名の明確な対応関係

### 2.2 変更管理プロセス
1. **マッピング変更の検討**
2. **実装コードの更新**
3. **型定義の更新**
4. **テストケースの追加・修正**
5. **ドキュメントの更新**
6. **動作確認**
7. **本番デプロイ**

## 3. Notionマッピング仕様

### 3.1 実装済みNotionマッピング
**実装ファイル**: `lib/integrations/notion.ts`

#### 3.1.1 メンバーデータベース
```typescript
// Notionプロパティ → Firestoreフィールドマッピング
const memberMapping = {
  // 基本情報
  name: '名前',                        // title
  email: 'メールアドレス',              // email
  phone: '電話番号',                   // phone_number
  
  // ステータス情報
  status: 'ステータス',                // status (select/status)
  jobCategory: '職種',                 // select
  
  // 日付情報
  lastWorkStartDate: '最新業務開始日',   // date
  lastWorkEndDate: '最新業務終了日',     // date
  contractEndDate: '業務委託契約終了日', // date
  counselingStartDate: '初回実施日',     // date (カウンセリング)
  
  // プロジェクト情報
  currentProject: '現在の案件',         // relation
  
  // その他
  applicationDate: '応募日',           // date
  hireDate: '採用日',                 // date
  nearestStation: '最寄り駅',         // rich_text
  desiredShift: '希望シフト',          // select
  skills: 'スキル',                   // multi_select
  learningPrograms: '受講プログラム'    // multi_select
};
```

#### 3.1.2 案件データベース
```typescript
const projectMapping = {
  // 基本情報
  name: '案件名',                     // title
  status: 'ステータス',               // select
  category: '職種',                   // select
  
  // クライアント情報
  clientName: 'クライアント',          // rich_text
  
  // 稼働条件
  workStyle: '稼働形態',              // select
  workLocation: '稼働場所',           // rich_text
  hourlyRate: '想定時給',             // number
  
  // 期間
  startDate: '開始日',               // date
  endDate: '終了日',                 // date
  
  // スキル要件
  requiredSkills: '必須スキル'        // multi_select
};
```

#### 3.1.3 メンバー別案件状況データベース
```typescript
const memberProjectStatusMapping = {
  // 関連情報
  memberId: 'メンバー',              // relation
  projectId: '案件',                // relation
  
  // ステータス
  status: 'ステータス',              // select
  
  // 期間
  startDate: '開始日',              // date
  endDate: '終了日',                // date
  
  // 稼働詳細
  workHours: '稼働時間',            // number
  workDays: '稼働日数',             // number
  
  // 評価
  performance: '評価',              // select
  feedback: 'フィードバック'         // rich_text
};
```

### 3.2 Notionステータス値マッピング

#### 3.2.1 メンバーステータス
```typescript
// 実際のNotionステータス値 → 内部MemberStatus値
const memberStatusMapping = {
  // 稼働中
  '稼動': MemberStatus.WORKING,              // 実際のNotionでは「働」ではなく「動」
  '稼働': MemberStatus.WORKING,              // 代替表記
  '稼働中': MemberStatus.WORKING,            // 代替表記
  
  // 新規ステータス（将来見込み対象）
  '案件斡旋': MemberStatus.JOB_MATCHING,
  '面接対策': MemberStatus.INTERVIEW_PREP,
  '面接': MemberStatus.INTERVIEW,
  '結果待ち': MemberStatus.RESULT_WAITING,
  '採用': MemberStatus.HIRED,
  
  // その他のステータス
  '学習開始': MemberStatus.LEARNING_STARTED,
  '終了': MemberStatus.CONTRACT_ENDED,
  '中断': MemberStatus.INTERRUPTED,
  'カウンセリング開始': MemberStatus.COUNSELING_STARTED,
  '初回カウンセリング': MemberStatus.COUNSELING_STARTED
};
```

#### 3.2.2 案件ステータス
```typescript
const projectStatusMapping = {
  '募集中': ProjectStatus.ACTIVE,
  'アクティブ': ProjectStatus.ACTIVE,
  '完了': ProjectStatus.COMPLETED,
  '終了': ProjectStatus.COMPLETED,
  '一時停止': ProjectStatus.PAUSED,
  'キャンセル': ProjectStatus.CANCELLED,
  '中止': ProjectStatus.CANCELLED
};
```

#### 3.2.3 職種カテゴリ
```typescript
const jobCategoryMapping = {
  'SNS運用': JobCategory.SNS_OPERATION,
  '動画クリエイター': JobCategory.VIDEO_CREATOR,
  'AIライター': JobCategory.AI_WRITER,
  '撮影スタッフ': JobCategory.PHOTOGRAPHY_STAFF,
  'その他': JobCategory.OTHER
};
```

### 3.3 Notionデータ取得・変換処理

#### 3.3.1 プロパティ値の取得
```typescript
function getNotionPropertyValue(properties: any, propertyName: string, propertyType: string): any {
  const property = properties[propertyName];
  if (!property) return null;
  
  switch (propertyType) {
    case 'title':
      return property.title?.[0]?.plain_text || '';
    
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || '';
    
    case 'email':
      return property.email || '';
    
    case 'phone_number':
      return property.phone_number || '';
    
    case 'select':
      return property.select?.name || '';
    
    case 'status':
      return property.status?.name || '';
    
    case 'multi_select':
      return property.multi_select?.map((item: any) => item.name) || [];
    
    case 'date':
      return property.date?.start ? new Date(property.date.start) : null;
    
    case 'number':
      return property.number || 0;
    
    case 'relation':
      return property.relation?.[0]?.id || '';
    
    default:
      return property;
  }
}
```

#### 3.3.2 メンバーデータの変換
```typescript
function convertNotionMemberToFirestore(notionPage: any): Member {
  const properties = notionPage.properties;
  
  // ステータス値の取得（複数の取得方法に対応）
  const notionStatus = properties['ステータス']?.status?.name || 
                      properties['Status']?.status?.name ||
                      properties['ステータス']?.select?.name || 
                      properties['Status']?.select?.name;
  
  return {
    id: notionPage.id,
    name: getNotionPropertyValue(properties, '名前', 'title'),
    status: memberStatusMapping[notionStatus] || MemberStatus.UNKNOWN,
    jobCategory: jobCategoryMapping[getNotionPropertyValue(properties, '職種', 'select')],
    email: getNotionPropertyValue(properties, 'メールアドレス', 'email'),
    phone: getNotionPropertyValue(properties, '電話番号', 'phone_number'),
    lastWorkStartDate: getNotionPropertyValue(properties, '最新業務開始日', 'date'),
    lastWorkEndDate: getNotionPropertyValue(properties, '最新業務終了日', 'date'),
    contractEndDate: getNotionPropertyValue(properties, '業務委託契約終了日', 'date'),
    counselingStartDate: getNotionPropertyValue(properties, '初回実施日', 'date'),
    currentProject: getNotionPropertyValue(properties, '現在の案件', 'relation'),
    updatedAt: new Date(notionPage.last_edited_time),
    syncedAt: new Date()
  };
}
```

## 4. Google Sheetsマッピング仕様

### 4.1 実装済みGoogle Sheetsマッピング
**実装ファイル**: `lib/integrations/optimized_google_sheets.ts`

#### 4.1.1 採用管理シート
```typescript
const recruitmentManagementMapping = {
  // 基本情報
  applicantName: '名前',
  email: 'メールアドレス',
  phone: '電話番号',
  
  // 応募情報
  applicationDate: '応募日',
  jobCategory: '職種',
  mediaSource: '媒体',
  
  // 選考プロセス
  status: '現状ステータス',
  // 書類提出日は基本的にシートに列が無いため、フォームのタイムスタンプで補完する
  documentSubmissionDate: '書類提出日', // 存在すれば使用
  interviewDate: '面接日',
  interviewImplementedDate: '面接実施日',
  
  // 結果
  hireDate: '採用日',
  resultDate: '結果日',
  rejectionReason: '不採用理由',
  rejectionDetail: '不採用詳細',
  
  // その他
  acceptanceDate: '内定受諾日',
  startWorkDate: '実稼働開始日',
  notes: '備考'
};
```

#### 4.1.2 応募フォームシート
```typescript
const applicationFormMapping = {
  // フォーム情報
  timestamp: 'タイムスタンプ',
  applicantName: '名前',
  email: 'メールアドレス',
  phone: '電話番号',
  
  // 応募詳細
  jobCategory: '希望職種',
  experience: '経験',
  motivation: '志望動機',
  availability: '稼働可能時間',
  
  // 個人情報
  age: '年齢',
  gender: '性別',
  location: '居住地',
  nearestStation: '最寄り駅'
};
```

#### 4.1.3 名寄せキーとフォールバック（2025-08-12 追記）

- 名寄せキー: 正規化済み氏名（全角/半角・スペース除去・かな/カナ統一・英字大文字化・数字半角化）
- 統合ロジック:
  - 採用管理シートの応募行 → 正規化氏名で `entry form` のタイムスタンプを検索
  - 見つかれば `documentSubmitDate` に採用
  - 見つからなければ空（提出なし）


### 4.2 Google Sheetsデータ取得・変換処理

#### 4.2.1 シートデータの取得
```typescript
async function fetchSheetData(spreadsheetId: string, range: string): Promise<any[][]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: 'FORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING'
    });
    
    return response.data.values || [];
  } catch (error) {
    console.error(`シートデータ取得エラー: ${spreadsheetId}:${range}`, error);
    throw error;
  }
}
```

#### 4.2.2 データの正規化
```typescript
function normalizeSheetData(rawData: any[][], headerMapping: any): Application[] {
  if (rawData.length < 2) return [];
  
  const headers = rawData[0];
  const rows = rawData.slice(1);
  
  // ヘッダーのインデックスマッピングを作成
  const headerIndexMap = new Map<string, number>();
  headers.forEach((header, index) => {
    headerIndexMap.set(header, index);
  });
  
  return rows.map((row, rowIndex) => {
    const application: Partial<Application> = {
      id: generateApplicationId(rowIndex),
      sourceSheetId: spreadsheetId,
      sourceRowIndex: rowIndex + 2, // ヘッダー行を考慮
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // マッピング定義に基づいてフィールドを設定
    Object.entries(headerMapping).forEach(([fieldName, columnName]) => {
      const columnIndex = headerIndexMap.get(columnName as string);
      if (columnIndex !== undefined && row[columnIndex]) {
        application[fieldName] = normalizeFieldValue(fieldName, row[columnIndex]);
      }
    });
    
    return application as Application;
  });
}
```

#### 4.2.3 フィールド値の正規化
```typescript
function normalizeFieldValue(fieldName: string, rawValue: any): any {
  if (!rawValue) return null;
  
  switch (fieldName) {
    case 'applicationDate':
    case 'documentSubmissionDate':
    case 'interviewDate':
    case 'interviewImplementedDate':
    case 'hireDate':
    case 'resultDate':
    case 'acceptanceDate':
    case 'startWorkDate':
      return parseDate(rawValue);
    
    case 'jobCategory':
      return normalizeJobCategory(rawValue);
    
    case 'mediaSource':
      return normalizeMediaSource(rawValue);
    
    case 'status':
      return normalizeApplicationStatus(rawValue);
    
    case 'applicantName':
      return normalizePersonName(rawValue);
    
    case 'email':
      return normalizeEmail(rawValue);
    
    case 'phone':
      return normalizePhoneNumber(rawValue);
    
    default:
      return String(rawValue).trim();
  }
}
```

## 5. データ同期システム

### 5.1 Notionデータ同期

#### 5.1.1 同期プロセス
```typescript
async function syncNotionData(): Promise<SyncResult> {
  console.log('Notionデータ同期開始...');
  
  try {
    // 1. メンバーデータの同期
    console.log('メンバーデータを同期中...');
    const members = await fetchMembers(500);
    await saveMembers(members, true); // merge: true
    
    // 2. プロジェクトデータの同期
    console.log('プロジェクトデータを同期中...');
    const projects = await fetchProjects(200);
    await saveProjects(projects, true);
    
    // 3. メンバー別案件状況の同期
    console.log('メンバー別案件状況を同期中...');
    const statuses = await fetchMemberProjectStatuses(1000);
    await saveMemberProjectStatus(statuses, true);
    
    return {
      success: true,
      memberCount: members.length,
      projectCount: projects.length,
      memberProjectStatusCount: statuses.length,
      syncedAt: new Date()
    };
  } catch (error) {
    console.error('Notionデータ同期エラー:', error);
    throw error;
  }
}
```

#### 5.1.2 バッチ処理
```typescript
async function fetchMembers(pageSize: number = 100): Promise<Member[]> {
  const members: Member[] = [];
  let hasMore = true;
  let nextCursor: string | undefined;
  
  while (hasMore) {
    try {
      const response = await notion.databases.query({
        database_id: process.env.NOTION_MEMBER_DB_ID!,
        page_size: pageSize,
        start_cursor: nextCursor,
        sorts: [
          {
            property: '名前',
            direction: 'ascending'
          }
        ]
      });
      
      const batchMembers = response.results.map(page => 
        convertNotionMemberToFirestore(page)
      );
      
      members.push(...batchMembers);
      
      hasMore = response.has_more;
      nextCursor = response.next_cursor || undefined;
      
      console.log(`取得済みメンバー数: ${members.length}`);
      
    } catch (error) {
      console.error('メンバーデータ取得エラー:', error);
      throw error;
    }
  }
  
  return members;
}
```

### 5.2 Google Sheetsデータ同期

#### 5.2.1 スプレッドシート検索
```typescript
async function findRecruitmentSheets(): Promise<SheetInfo[]> {
  const sheets: SheetInfo[] = [];
  
  // 採用管理シートの検索
  const managementSheets = await searchSheetsByPattern('採用管理');
  sheets.push(...managementSheets.map(sheet => ({
    ...sheet,
    type: 'recruitment_management'
  })));
  
  // 応募フォームシートの検索
  const formSheets = await searchSheetsByPattern('求人エントリーフォーム');
  sheets.push(...formSheets.map(sheet => ({
    ...sheet,
    type: 'application_form'
  })));
  
  return sheets;
}
```

#### 5.2.2 データ統合処理
```typescript
async function integrateApplicationData(): Promise<Application[]> {
  const allApplications: Application[] = [];
  
  // 採用管理シートからのデータ
  const managementData = await fetchRecruitmentManagementData();
  allApplications.push(...managementData);
  
  // 応募フォームシートからのデータ
  const formData = await fetchApplicationFormData();
  allApplications.push(...formData);
  
  // データの名寄せ・重複排除
  const deduplicatedApplications = deduplicateApplications(allApplications);
  
  return deduplicatedApplications;
}
```

## 6. エラーハンドリング・品質保証

### 6.1 データ検証

#### 6.1.1 必須フィールドチェック
```typescript
function validateMemberData(member: Partial<Member>): ValidationResult {
  const errors: string[] = [];
  
  if (!member.id) {
    errors.push('IDが必要です');
  }
  
  if (!member.name || member.name.trim() === '') {
    errors.push('名前が必要です');
  }
  
  if (!member.status) {
    errors.push('ステータスが必要です');
  }
  
  // 日付フィールドの検証
  if (member.lastWorkStartDate && isNaN(member.lastWorkStartDate.getTime())) {
    errors.push('最新業務開始日の形式が正しくありません');
  }
  
  if (member.lastWorkEndDate && isNaN(member.lastWorkEndDate.getTime())) {
    errors.push('最新業務終了日の形式が正しくありません');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

#### 6.1.2 データ整合性チェック
```typescript
function validateDataConsistency(member: Member): ValidationResult {
  const errors: string[] = [];
  
  // 開始日と終了日の整合性
  if (member.lastWorkStartDate && member.lastWorkEndDate) {
    if (member.lastWorkStartDate > member.lastWorkEndDate) {
      // 切替の場合は正常（開始日 > 終了日）
      console.log(`切替パターン検出: ${member.name}`);
    }
  }
  
  // ステータスと日付の整合性
  if (member.status === MemberStatus.WORKING && !member.lastWorkStartDate) {
    errors.push('稼働中ステータスですが開始日が設定されていません');
  }
  
  if (member.status === MemberStatus.CONTRACT_ENDED && !member.contractEndDate) {
    errors.push('契約終了ステータスですが契約終了日が設定されていません');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### 6.2 エラー回復機能

#### 6.2.1 部分同期失敗の処理
```typescript
async function robustSyncWithRetry(syncFunction: () => Promise<any>, maxRetries: number = 3): Promise<any> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`同期試行 ${attempt}/${maxRetries}`);
      const result = await syncFunction();
      console.log(`同期成功 (試行 ${attempt})`);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`同期失敗 (試行 ${attempt}): ${error.message}`);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 指数バックオフ
        console.log(`${delay}ms後に再試行...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`${maxRetries}回の試行後も同期に失敗: ${lastError.message}`);
}
```

#### 6.2.2 データ修復機能
```typescript
async function repairInconsistentData(): Promise<RepairResult> {
  const repairResults: RepairResult = {
    repairedMembers: 0,
    skippedMembers: 0,
    errors: []
  };
  
  const members = await getAllMembers();
  
  for (const member of members) {
    try {
      const validation = validateDataConsistency(member);
      
      if (!validation.isValid) {
        // 自動修復を試行
        const repairedMember = await attemptAutoRepair(member, validation.errors);
        
        if (repairedMember) {
          await saveMember(repairedMember);
          repairResults.repairedMembers++;
          console.log(`データ修復完了: ${member.name}`);
        } else {
          repairResults.skippedMembers++;
          console.warn(`自動修復不可: ${member.name}`);
        }
      }
    } catch (error) {
      repairResults.errors.push({
        memberId: member.id,
        memberName: member.name,
        error: error.message
      });
    }
  }
  
  return repairResults;
}
```

## 7. パフォーマンス最適化

### 7.1 バッチ処理最適化

#### 7.1.1 並列処理
```typescript
async function parallelSyncOptimized(): Promise<SyncResult> {
  console.log('並列同期処理開始...');
  
  // 並列でデータ取得
  const [members, projects, statuses] = await Promise.all([
    robustSyncWithRetry(() => fetchMembers(500)),
    robustSyncWithRetry(() => fetchProjects(200)),
    robustSyncWithRetry(() => fetchMemberProjectStatuses(1000))
  ]);
  
  // 並列でFirestore保存
  await Promise.all([
    saveMembers(members, true),
    saveProjects(projects, true),
    saveMemberProjectStatus(statuses, true)
  ]);
  
  return {
    success: true,
    memberCount: members.length,
    projectCount: projects.length,
    memberProjectStatusCount: statuses.length,
    syncedAt: new Date()
  };
}
```

#### 7.1.2 キャッシュ機能
```typescript
class MappingCache {
  private static instance: MappingCache;
  private cache = new Map<string, any>();
  private ttl = 5 * 60 * 1000; // 5分
  
  static getInstance(): MappingCache {
    if (!MappingCache.instance) {
      MappingCache.instance = new MappingCache();
    }
    return MappingCache.instance;
  }
  
  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
}
```

## 8. 監視・ログ

### 8.1 同期ログ
```typescript
interface SyncLog {
  id: string;
  type: 'notion' | 'google_sheets';
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  errors: string[];
  performance: {
    duration: number;
    recordsPerSecond: number;
  };
}

async function logSyncOperation(log: SyncLog): Promise<void> {
  await db.collection('sync_logs').doc(log.id).set({
    ...log,
    createdAt: new Date()
  });
}
```

### 8.2 パフォーマンス監視
```typescript
class PerformanceMonitor {
  private startTime: number;
  private checkpoints: Array<{ name: string; time: number }> = [];
  
  start(): void {
    this.startTime = Date.now();
    this.checkpoints = [];
  }
  
  checkpoint(name: string): void {
    this.checkpoints.push({
      name,
      time: Date.now() - this.startTime
    });
  }
  
  getReport(): PerformanceReport {
    const totalDuration = Date.now() - this.startTime;
    
    return {
      totalDuration,
      checkpoints: this.checkpoints,
      averageCheckpointTime: this.checkpoints.length > 0 
        ? totalDuration / this.checkpoints.length 
        : 0
    };
  }
}
```

## 9. トラブルシューティング

### 9.1 よくある問題と解決策

#### 問題1: Notionプロパティ名の不一致
**症状**: Notionから正しくデータが取得できない
**原因**: 実際のNotionプロパティ名とマッピング定義の不一致
**解決策**:
1. Notion APIでプロパティ一覧を確認
2. マッピング定義を実際のプロパティ名に修正
3. 複数の取得方法を実装（status/select両対応）

#### 問題2: Google Sheetsの列名変更
**症状**: Google Sheetsからデータが取得できない
**原因**: スプレッドシートの列名が変更された
**解決策**:
1. 最新のスプレッドシート構造を確認
2. マッピング定義を更新
3. 列名の正規化処理を強化

#### 問題3: 同期処理のタイムアウト
**症状**: 大量データの同期でタイムアウトエラー
**原因**: APIレート制限やネットワーク遅延
**解決策**:
1. バッチサイズを調整
2. リトライロジックを実装
3. 並列処理の制限

### 9.2 デバッグ用ツール
```typescript
// マッピング確認ツール
async function debugMapping(notionPageId: string): Promise<void> {
  const page = await notion.pages.retrieve({ page_id: notionPageId });
  
  console.log('=== Notionプロパティ一覧 ===');
  Object.entries(page.properties).forEach(([key, value]) => {
    console.log(`${key}: ${value.type}`);
  });
  
  console.log('\n=== マッピング結果 ===');
  const member = convertNotionMemberToFirestore(page);
  console.log(JSON.stringify(member, null, 2));
}
```

---

**作成者**: Venus Ark 開発チーム  
**技術責任者**: [技術責任者名]  
**最終更新**: 2025年1月28日  
**次回レビュー**: 2025年2月末予定  
**関連ドキュメント**:
- [00_project_overview.md](./00_project_overview.md)
- [01_development_plan.md](./01_development_plan.md)
- [02_data_architecture.md](./02_data_architecture.md)
- [03_data_definition.md](./03_data_definition.md) 