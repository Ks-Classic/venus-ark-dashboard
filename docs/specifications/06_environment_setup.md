# 03. 環境構築とセットアップガイド

**プロジェクト名**: Venus Ark 週次レポートシステム  
**バージョン**: 5.0 (Phase 2 実装完了版)  
**最終更新**: 2025年1月

このドキュメントでは、Venus Ark 週次レポートシステムの開発環境構築、本番環境デプロイ、および運用に必要な設定について詳しく説明します。

## 🛠️ 前提条件

### 必要なソフトウェア
- **Node.js**: 18.0.0以上
- **pnpm**: 8.0.0以上（推奨パッケージマネージャー）
- **Git**: 最新版
- **PowerShell**: Windows環境での実行（Windows 10/11）

### 必要なアカウント・サービス
- **Firebase**: Firestore、Authentication
- **Google Cloud Platform**: Sheets API、Service Account
- **Notion**: API アクセス
- **Vercel**: 本番環境デプロイ（推奨）
- **Gemini API**: AI分析機能（Phase 3）

## 📁 プロジェクト構成

```
venus-ark-dashboard/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── recruitment/          # 採用関連API
│   │   │   ├── optimized-weekly-summaries/
│   │   │   ├── applications/
│   │   │   └── sync-weekly-summary/
│   │   ├── work-status/          # 稼働者関連API
│   │   │   ├── dashboard/
│   │   │   ├── sync/
│   │   │   └── future-projection/
│   │   └── spreadsheet-sheets/   # Sheets統合API
│   ├── recruitment/              # 採用ページ
│   ├── work-status/              # 稼働者状況ページ
│   └── page.tsx                  # メインダッシュボード
├── components/                   # UIコンポーネント
│   ├── recruitment-dashboard.tsx # 採用ダッシュボード
│   ├── work-status-dashboard.tsx # 稼働者ダッシュボード
│   ├── recruitment/              # 採用関連コンポーネント
│   ├── work-status/              # 稼働者関連コンポーネント
│   └── ui/                       # 基本UIコンポーネント
├── lib/                          # ビジネスロジック
│   ├── analytics/                # データ分析処理
│   ├── integrations/             # 外部API統合
│   ├── firestore/                # Firestore操作
│   ├── types/                    # TypeScript型定義
│   └── utils.ts                  # ユーティリティ
├── hooks/                        # カスタムReactフック
├── scripts/                      # データ同期スクリプト
└── docs/                         # プロジェクトドキュメント
```

## 🚀 開発環境セットアップ

### 1. リポジトリクローン

```powershell
# PowerShellで実行
git clone [リポジトリURL]
cd venus-ark-dashboard
```

### 2. 依存関係インストール

```powershell
# pnpmを使用（推奨）
pnpm install

# または npm を使用
npm install
```

### 3. 環境変数設定

`.env.example` をコピーして `.env.local` を作成：

```powershell
Copy-Item .env.example .env.local
```

### 4. 環境変数の設定

`.env.local` ファイルを編集して以下の値を設定：

#### Firebase設定
```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=venus-ark-aix
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@venus-ark-aix.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[Private Key]\n-----END PRIVATE KEY-----\n"

# Firebase Web Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=venus-ark-aix.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=venus-ark-aix
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=venus-ark-aix.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

#### Google Sheets API設定
```env
# Google Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=sheets-api@venus-ark-aix.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[Private Key]\n-----END PRIVATE KEY-----\n"

# Spreadsheet IDs
GOOGLE_SHEETS_RECRUITMENT_SPREADSHEET_ID=your_recruitment_spreadsheet_id
GOOGLE_SHEETS_APPLICATION_FORM_SPREADSHEET_ID=your_application_form_spreadsheet_id
```

#### Notion API設定
```env
# Notion Integration
NOTION_API_KEY=secret_your_notion_integration_token
# 注意: NOTION_TOKEN も同じ値で設定（後方互換性のため）
NOTION_TOKEN=secret_your_notion_integration_token

# Database IDs
NOTION_MEMBER_DB_ID=your_member_database_id
NOTION_PROJECT_DB_ID=your_project_database_id
NOTION_INTERVIEW_DB_ID=1e7efecd615280ba8f61d44c371ba9d4
NOTION_MEMBER_PROJECT_STATUS_DB_ID=your_member_project_status_db_id
```

**⚠️ 重要な注意事項（2025年1月4日更新）**:
- Notionマッピング設定で実際のプロパティ名と設定値の不一致が原因でデータ取得エラーが発生する場合があります
- 特に以下のフィールドは末尾スペースや名称の違いに注意：
  - 「最新業務終了日 」（末尾にスペース）
  - 「初回実施日」（カウンセリング開始日として使用）
  - 「業務委託契約終了日」（契約終了日として使用）
- マッピング設定は `lib/config/notion-mapping.yaml` で管理されています

#### AI分析設定（Phase 3）
```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

### 5. 開発サーバー起動

```powershell
# 開発サーバー起動
pnpm dev

# または
npm run dev
```

ブラウザで `http://localhost:3000` にアクセス

## 🔧 Firebase設定

### 1. Firestoreデータベース作成

Firebase Consoleで以下のコレクションを作成：

#### 実装済みコレクション
```
optimized_weekly_summaries    # 最適化週次集計（メイン）
applications                  # 採用応募データ
members                      # メンバー管理
projects                     # プロジェクト管理
member_project_relations     # メンバー別案件状況
weekly_reports              # 従来週次レポート（フォールバック）
work_status_reports         # 稼働状況レポート
report_comments             # レポートコメント
sync_logs                   # データ同期ログ
```

### 2. セキュリティルール設定

`firestore.rules` ファイルの内容をFirebase Consoleで設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 開発環境では全てのアクセスを許可
    match /{document=**} {
      allow read, write: if true;
    }
    
    // 本番環境では適切な認証ルールを設定
    // match /{document=**} {
    //   allow read, write: if request.auth != null;
    // }
  }
}
```

### 3. 複合インデックス設定

`firestore.indexes.json` の内容をFirebase Consoleで設定：

```json
{
  "indexes": [
    {
      "collectionGroup": "optimized_weekly_summaries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "year", "order": "DESCENDING" },
        { "fieldPath": "weekNumber", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "applications",
      "queryScope": "COLLECTION", 
      "fields": [
        { "fieldPath": "jobCategory", "order": "ASCENDING" },
        { "fieldPath": "applicationDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "members",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "lastWorkStartDate", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## 🔑 Google Cloud Platform設定

### 1. サービスアカウント作成

1. Google Cloud Consoleにアクセス
2. 新しいサービスアカウントを作成
3. 以下のAPIを有効化：
   - Google Sheets API
   - Google Drive API

### 2. 認証情報取得

1. サービスアカウントキーをJSON形式でダウンロード
2. 秘密鍵を環境変数に設定
3. Google Sheetsにサービスアカウントのメールアドレスを共有設定で追加

### 3. スプレッドシート設定

#### 採用管理スプレッドシート構造
```
シート名: "SNS運用採用", "動画クリエイター採用", "AIライター採用", "撮影スタッフ採用"
列構成:
A: 応募日
B: 氏名  
C: メールアドレス
D: 電話番号
E: 職種
F: 応募状況
G: 面接日
H: 採用結果
I: 不採用理由
J: 媒体（indeed/engage）
```

## 🔗 Notion設定

### 1. Integration作成

1. Notion Developersページでインテグレーション作成
2. APIキーを取得
3. 必要なデータベースに統合を追加

### 2. データベース構造

#### メンバーデータベース
```
プロパティ:
- タイトル: 氏名
- ステータス: 選択肢（面接対策、面接、結果待ち、採用、稼働、学習開始）
- 最新業務開始日: 日付
- 最新業務終了日: 日付  
- 業務委託契約終了日: 日付
- 初回カウンセリング実施日: 日付
- 職種: 選択肢
- メールアドレス: メール
- 電話番号: 電話番号
```

#### プロジェクトデータベース
```
プロパティ:
- タイトル: 案件名
- ステータス: 選択肢
- 開始日: 日付
- 終了日: 日付
- クライアント企業: テキスト
- 稼働スタイル: 選択肢
- 必要スキル: マルチセレクト
```

## 📊 データ同期スクリプト

### 1. 採用データ同期

```powershell
# 採用データをGoogle SheetsからFirestoreに同期
pnpm run sync:recruitment

# または
npx ts-node scripts/sync-recruitment-data.ts
```

### 2. Notionデータ同期

```powershell
# Notionからメンバー・プロジェクトデータを同期
pnpm run sync:notion

# または
npx ts-node scripts/sync-notion-data.ts
```

### 3. 最適化週次集計生成

```powershell
# 最適化された週次集計データを生成
pnpm run generate:summaries

# または
npx ts-node scripts/generate-optimized-weekly-summaries.ts
```

### 4. 稼働状況レポート生成

```powershell
# 稼働状況レポートを生成
pnpm run generate:work-status

# または
npx ts-node scripts/generate-work-status-report.ts
```

## 🚀 本番環境デプロイ

### Vercelデプロイ（推奨）

1. **Vercelアカウント作成・ログイン**
```powershell
# Vercel CLIインストール
npm i -g vercel

# ログイン
vercel login
```

2. **プロジェクト設定**
```powershell
# プロジェクトディレクトリで実行
vercel

# 初回設定時の質問に回答
# ? Set up and deploy "venus-ark-dashboard"? [Y/n] y
# ? Which scope do you want to deploy to? [選択]
# ? Link to existing project? [N/y] n
# ? What's your project's name? venus-ark-dashboard
# ? In which directory is your code located? ./
```

3. **環境変数設定**
```powershell
# 本番環境の環境変数を設定
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_PRIVATE_KEY
vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
vercel env add NOTION_API_KEY
vercel env add GEMINI_API_KEY
# ... その他の環境変数
```

4. **デプロイ実行**
```powershell
# 本番デプロイ
vercel --prod
```

### 環境変数チェックリスト

#### 必須環境変数
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_PRIVATE_KEY`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- [ ] `GOOGLE_SHEETS_RECRUITMENT_SPREADSHEET_ID`
- [ ] `NOTION_API_KEY`
- [ ] `NOTION_MEMBER_DB_ID`
- [ ] `NOTION_PROJECT_DB_ID`

#### オプション環境変数
- [ ] `GEMINI_API_KEY` (AI機能用)
- [ ] `HARMOS_API_KEY` (将来の勤怠連携用)

## ⚙️ 運用・メンテナンス

### 1. ログ監視

```powershell
# Vercelログ確認
vercel logs

# 特定の関数のログ
vercel logs --function=api/recruitment/optimized-weekly-summaries
```

### 2. データベース監視

- Firebase Consoleでクエリ実行状況を確認
- インデックス使用状況の監視
- ストレージ使用量の確認

### 3. パフォーマンス監視

- API応答時間の監視（目標: 200ms以下）
- エラー率の監視（目標: 1%以下）
- データ同期成功率の監視（目標: 99%以上）

### 4. 定期メンテナンス

#### 週次作業
- [ ] データ同期状況確認
- [ ] エラーログ確認
- [ ] パフォーマンス指標確認

#### 月次作業
- [ ] データベース使用量確認
- [ ] API使用量確認
- [ ] セキュリティアップデート適用

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. Google Sheets API認証エラー
```
Error: The caller does not have permission
```
**解決方法**:
- サービスアカウントがスプレッドシートに共有されているか確認
- Google Sheets APIが有効化されているか確認

#### 2. Notion API接続エラー
```
Error: Unauthorized
```
**解決方法**:
- Notion APIキーが正しく設定されているか確認
- データベースにIntegrationが追加されているか確認

#### 3. Firestore権限エラー
```
Error: Missing or insufficient permissions
```
**解決方法**:
- Firestoreセキュリティルールを確認
- Firebase Admin SDK認証情報を確認

#### 4. ビルドエラー
```
Error: Type errors found
```
**解決方法**:
```powershell
# 型チェック実行
pnpm run type-check

# リント実行
pnpm run lint

# 修正後再ビルド
pnpm run build
```

#### 5. 稼働状況ダッシュボード数値異常（2025年1月4日解決済み）
```
問題: 稼働者数、新規開始、切替完了、カウンセリング人数などが0または異常値
```
**根本原因**: Notionマッピング設定とNotionデータベースの実際のフィールド名の不一致

**解決方法**:
1. Notionデータベースの実際のプロパティ名を確認
```powershell
# Notion生データ確認スクリプト実行
npx tsx scripts/debug-notion-raw-data.ts
```

2. マッピング設定ファイルを修正
```yaml
# lib/config/notion-mapping.yaml
member_db:
  properties:
    last_work_end_date:
      property_name: "最新業務終了日 "  # 末尾スペースに注意
    first_counseling_date:
      property_name: "初回実施日"        # 正しいフィールド名
    contract_end_date:
      property_name: "業務委託契約終了日" # 正しいフィールド名
```

3. 同期処理の再実行
```powershell
# データ同期実行
curl -X POST http://localhost:3000/api/work-status/sync
```

4. データ整合性確認
```powershell
# Firestoreデータ確認
npx tsx scripts/debug-firestore-member-data.ts
```

**予防策**:
- 定期的なマッピング整合性チェック
- Notionプロパティ名変更時の即座の対応
- 包括的なデータ検証プロセスの実行

### 5. パフォーマンス問題

#### API応答が遅い場合
1. Firestoreインデックスの確認
2. 不要なデータ取得の削除
3. キャッシュ戦略の見直し

#### メモリ使用量が多い場合
1. 大量データ処理の最適化
2. 不要なオブジェクト参照の削除
3. ガベージコレクションの確認

## 📋 開発ワークフロー

### 1. 機能開発フロー

```powershell
# 新しいブランチ作成
git checkout -b feature/new-feature

# 開発作業
# ...

# コミット
git add .
git commit -m "feat: 新機能を追加"

# プッシュ
git push origin feature/new-feature

# プルリクエスト作成
```

### 2. テスト実行

```powershell
# 型チェック
pnpm run type-check

# リント
pnpm run lint

# ビルドテスト
pnpm run build

# 開発サーバーでテスト
pnpm run dev
```

### 3. デプロイフロー

```powershell
# プレビューデプロイ
vercel

# 本番デプロイ
vercel --prod
```

## 📞 サポート・連絡先

### 技術サポート
- **開発チーム**: Venus Ark 開発部
- **技術責任者**: [技術責任者名]
- **緊急連絡先**: [緊急連絡先]

### ドキュメント
- **プロジェクト概要**: `docs/00_project_overview.md`
- **開発計画**: `docs/01_development_plan.md`
- **データアーキテクチャ**: `docs/02_data_architecture.md`
- **UIテストリスト**: `docs/UI_TEST_CHECKLIST.md`

---

**最終更新**: 2025年1月 - Phase 2 実装完了版  
**次期アップデート**: Phase 3 AI機能実装完了時 