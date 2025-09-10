# Venus Ark Dashboard 開発コマンド集

## 基本開発コマンド
```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm run start

# リント実行
npm run lint

# テスト実行
npm run test
```

## データ同期コマンド
```bash
# 採用データ同期
npm run sync:recruitment

# Notionデータ同期
npm run sync:notion

# 全データ同期
npm run sync:all
```

## データ生成コマンド
```bash
# 週次レポート生成
npm run generate:report

# 稼働状況レポート生成
npm run generate:work-status

# 最適化された週次サマリー生成
npm run generate:optimized-summaries
```

## データ品質チェック
```bash
# データ品質チェック
npm run check:data-quality

# 重複チェック
npm run check:duplicates

# 不足フィールドチェック
npm run check:missing-fields
```

## デバッグコマンド
```bash
# データ取得テスト
npm run test:data-fetch

# スプレッドシートテスト
npm run test:spreadsheet

# Notionデータベース分析
npm run analyze:notion
```

## Firebase関連
```bash
# Firestoreルールデプロイ
npm run db:rules

# Firestoreインデックス作成
npm run db:indexes

# Firestoreマイグレーション
npm run db:migrate
```

## Windows固有コマンド
```bash
# プロセス確認
tasklist | findstr node

# プロセス終了
taskkill /f /im node.exe

# ポート確認
netstat -an | findstr :3000

# ディレクトリ削除
Remove-Item -Recurse -Force .next
```

## 環境設定
```bash
# 環境変数設定
npm run setup:env

# サンプルデータ作成
npm run create:sample-data
```

## 重要な注意事項
- Windows環境ではPowerShellコマンドを使用
- キャッシュクリア時は`.next`ディレクトリを削除
- データ同期後は自動的にダッシュボードが更新される
- エラー時はコンソールログを確認