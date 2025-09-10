# Venus Ark Dashboard 完全要件理解

## プロジェクト概要
Venus Arkの採用・稼働者管理のための統合ダッシュボードシステム。Next.js 15.2.4、React 19、TypeScript、Firebase、Notion API、Google Sheets APIを統合したモダンなWebアプリケーション。

## 技術スタック
- **フロントエンド**: Next.js 15.2.4, React 19, TypeScript
- **UIライブラリ**: Radix UI, Tailwind CSS, shadcn/ui
- **バックエンド**: Next.js API Routes
- **データベース**: Firebase Firestore
- **外部API**: Notion API, Google Sheets API
- **認証**: Firebase Admin SDK
- **デプロイ**: Vercel

## 稼働者状況ダッシュボードの正確な仕様

### 表の列構成（重要）
**4列構成**が正しい仕様：
1. **前々週** (-2)
2. **前週** (-1) 
3. **選択週** (0) ← ハイライト
4. **翌週** (+1)

UIモック：
```
├────────┬────────────┬────────────┬────────────┬────────────┤
│ 指標    │ 6月1W      │ 6月2W      │ 6月3W★     │ 6月4W      │
```

### 週の定義
- **週の開始**: 土曜日 (Saturday)
- **週の終了**: 金曜日 (Friday)
- **月内週番号**: 月の1日を含む週を第1週とする

### 月またぎの週の処理
- 7月5Wと8月1Wが同一週の場合、「7月5W/8月1W」として統一表示
- 個別の週（7月5W、8月1Wなど）は除外
- 重複表示を完全に防止

### 数値計算ロジック
- **総稼働者数**: 週間の連続性を保つ累積計算
- **重複防止**: 優先順位付きロジック（契約終了 > 案件終了 > 切替完了 > 新規開始）
- **カウンセリング開始**: 他の指標と重複可能

### 現在の問題
1. **列数不足**: 3列しか表示されていない（4列目が欠けている）
2. **数値不整合**: APIは53を返すがフロントエンドで54が表示される
3. **重複除外ロジック**: 過度に働いて必要な列まで削除している

## 開発コマンド
- `npm run dev`: 開発サーバー起動
- `npm run build`: 本番ビルド
- `npm run lint`: リント実行
- `npm run test`: テスト実行

## コードスタイル
- TypeScript完全対応
- 関数型プログラミング
- カスタムフックの活用
- エラーハンドリングの統一
- デバッグログの適切な出力

## 重要なファイル
- `app/api/work-status/weekly-detail/route.ts`: 週次データAPI
- `components/work-status/detailed-status-table.tsx`: 詳細テーブル
- `docs/specifications/features/work-status-current.md`: 稼働者状況仕様書