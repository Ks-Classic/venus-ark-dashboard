# TODO: GAS採用活動レポート実装
## 採用活動ダッシュボードのGAS実装タスク一覧

**プロジェクト**: Venus Ark 採用活動ダッシュボード  
**フェーズ**: Phase 10 - GAS採用活動レポート実装  
**開始日**: 2025年1月28日  
**目標完了日**: 2025年2月4日

---

## 🚀 Phase 1: 基本計算ロジックの修正（1-2日）✅ **完了**

### 1.1 recruitment-complete.gs の修正 ✅ **完了**
- [x] **応募内不採用数の修正**
  - 現在: 「不採用/落選/応募落ち」を一括でカウント
  - 修正後: 「応募落ち」のみをカウント（「不採用」は含めない）
  - 対象ファイル: `gas/recruitment-complete.gs`
  - 関数: `calculateAllMetrics()`

- [x] **選考継続(応募)の修正**
  - 現在: 差分計算（応募数 - 応募内不採用）
  - 修正後: ステータス「フォーム回答待ち」の実数カウント
  - 対象ファイル: `gas/recruitment-complete.gs`
  - 関数: `calculateAllMetrics()`

- [x] **面接系の修正（応募日ゲートを外す）**
  - [x] 面接予定数: 応募日に関わらずG列の週で判定
  - [x] 内面接実施数: 応募日に関わらずH列の週で判定
  - [x] 内面接辞退数: G列が対象週 かつ ステータス「面接不参加」
  - [x] 採用者数: H列が対象週 かつ ステータス「採用」
  - [x] 内定受諾数: 応募日に関わらずI列の週で判定
  - 対象ファイル: `gas/recruitment-complete.gs`
  - 関数: `calculateAllMetrics()`

- [x] **不採用者内訳の修正**
  - [x] 「転居確認」系を除外
  - [x] 「内定後辞退」を「採用辞退」に統一
  - [x] 分類: 経験者、高齢、不適合、外国籍、採用辞退、その他
  - 対象ファイル: `gas/recruitment-complete.gs`
  - 関数: `calculateAllMetrics()`

### 1.2 sheet.gs の検算機能追加 ✅ **完了**
- [x] **詳細集計レポート機能の追加**
  - [x] メニューに「詳細集計レポート」を追加
  - [x] `showDetailedReportDialog()` 関数の実装
  - [x] `generateDetailedReport()` 関数の実装
  - [x] `getDetailedWeeklyReport()` 関数の実装
  - [x] `getSheetDetailedMetrics()` 関数の実装
  - 対象ファイル: `gas/sheet.gs`

- [x] **HTMLテンプレートの作成**
  - [x] `DetailedReportDialog.html` の作成
  - [x] 週選択UIの実装
  - [x] 結果表示の実装
  - 対象ファイル: `gas/DetailedReportDialog.html`

### 1.3 テスト・検証 ✅ **完了**
- [x] **基本計算ロジックのテスト**
  - [x] 8月2Wでの各指標の計算確認
  - [x] 手動計算との突合確認
  - [x] エラーハンドリングの確認

---

## 🔄 Phase 2: 正規化による名寄せ実装（2-3日）✅ **完了**

### 2.1 氏名正規化関数の実装 ✅ **完了**
- [x] **正規化関数の作成**
  - [x] `normalizeName()` 関数の実装
  - [x] 全角→半角変換
  - [x] 半角/全角スペース除去
  - [x] lowercase化
  - 対象ファイル: `gas/recruitment-complete.gs`

### 2.2 名寄せ機能の実装 ✅ **完了**
- [x] **名寄せ実行関数の作成**
  - [x] `matchFormToRecruitment()` 関数の実装
  - [x] 正規化後の完全一致による突合
  - [x] 最良1件への紐付け
  - 対象ファイル: `gas/recruitment-complete.gs`

- [x] **書類提出数の内訳算出**
  - [x] 書類内不採用数の算出（名寄せ後の「書類落ち」）
  - [x] 選考継続(書類)数の算出（名寄せ後の継続件数）
  - 対象ファイル: `gas/recruitment-complete.gs`

### 2.3 突合結果の可視化 ✅ **完了**
- [x] **名寄せ結果の出力**
  - [x] 「name_mapping」シートへの結果出力
  - [x] 突合成功・失敗の可視化
  - [x] 手動レビュー用のデータ整理
  - 対象ファイル: `gas/recruitment-complete.gs`

### 2.4 テスト・検証 ✅ **完了**
- [x] **名寄せ機能のテスト**
  - [x] 正規化の精度確認
  - [x] 突合率の確認
  - [x] パフォーマンステスト（6分制限内）

---

## 🔄 Phase 3: 統合・テスト（1-2日）🔄 **進行中**

### 3.1 本番用GASの動作確認 ✅ **完了**
- [x] **全機能の動作確認**
  - [x] 週次レポート生成の確認
  - [x] フィルタ機能の確認
  - [x] エラーハンドリングの確認
  - 対象ファイル: `gas/recruitment-complete.gs`

### 3.2 検算用GASの動作確認 ✅ **完了**
- [x] **検算機能の動作確認**
  - [x] 詳細集計レポートの確認
  - [x] 手動計算との突合確認
  - [x] ログ出力の確認
  - 対象ファイル: `gas/sheet.gs`

### 3.3 統合テスト 🔄 **進行中**
- [x] **両GASの数値突合**
  - [x] 同じ週での数値比較
  - [x] 差異の原因特定・修正
  - [x] 最終的な数値一致確認

### 3.4 パフォーマンステスト 🔄 **進行中**
- [x] **実行時間の確認**
  - [x] 6分制限内での完了確認
  - [x] 大量データでの動作確認
  - [x] 最適化の実施

---

## 🔄 Phase 4: GAS API統合・フロントエンド連携（新規追加）✅ **完了**

### 4.1 GAS Web App API統合 ✅ **完了**
- [x] **GAS Web App APIの拡張**
  - [x] `app/api/recruitment/gas-weekly-reports/route.ts` の拡張
  - [x] 週のメタ情報（year/month/weekInMonth/startDate/endDate）の補完
  - [x] GAS_SCRIPT_ID環境変数対応
  - [x] engage系提出数の0化によるダブルカウント防止

### 4.2 フロントエンド連携 ✅ **完了**
- [x] **SWR取得口のGAS API切替**
  - [x] `hooks/use-weekly-reports.ts` の取得先をGAS APIに変更
  - [x] 4週分の週次レポート取得をGAS経由に統合
  - [x] weekSelector形式でのGAS呼び出し
  - 対象ファイル: `hooks/use-weekly-reports.ts`

- [x] **同期ボタンのGAS API切替**
  - [x] `hooks/use-recruitment-dashboard.ts` の同期先をGAS APIに変更
  - [x] 同期完了後のSWR再取得処理
  - [x] エラーハンドリングの調整
  - 対象ファイル: `hooks/use-recruitment-dashboard.ts`

### 4.3 ダブルカウント防止 ✅ **完了**
- [x] **engage系提出数の0化**
  - [x] `gas/recruitment-complete.gs` にengage=0ルールを反映
  - [x] 対象フォームシート未指定時の安全化（0件返却）
  - [x] フォームシートマッピングの最適化
  - 対象ファイル: `gas/recruitment-complete.gs`

### 4.4 エラー解消・安全性向上 ✅ **完了**
- [x] **GAS APIレスポンスの安全な処理**
  - [x] `gasResult.metrics` の存在チェック追加
  - [x] 安全なプロパティアクセス（`|| 0` フォールバック）
  - [x] 詳細ログ出力によるデバッグ支援
  - [x] エラー時の適切なHTTP 500レスポンス
  - 対象ファイル: `app/api/recruitment/gas-weekly-reports/route.ts`

- [x] **環境変数設定の整備**
  - [x] `env.example` にGAS設定を追加
  - [x] `GAS_SCRIPT_ID` と `GAS_WEB_APP_URL` の設定例
  - 対象ファイル: `env.example`

---

## 📚 ドキュメント・運用

### 5.1 ドキュメント更新 🔄 **進行中**
- [x] **実装完了後の更新**
  - [x] SOWの完了チェックリスト更新
  - [x] 運用マニュアルの作成
  - [x] トラブルシューティングガイドの作成

### 5.2 運用準備 🔄 **進行中**
- [x] **本番環境での準備**
  - [x] GASスクリプトのデプロイ
  - [x] 環境変数の設定
  - [x] アクセス権限の確認

---

## 🔍 品質管理・検証

### 6.1 データ整合性の確認 🔄 **進行中**
- [x] **既存システムとの突合**
  - [x] Supabase実装との数値比較
  - [x] 手動計算との突合確認
  - [x] エッジケースの処理確認

### 6.2 エラーハンドリングの確認 ✅ **完了**
- [x] **異常系の処理確認**
  - [x] スプレッドシートアクセスエラー
  - [x] データ不整合エラー
  - [x] タイムアウトエラー

---

## 📊 進捗管理

### 7.1 日次進捗確認
- [x] **1/28**: Phase 1開始、基本計算ロジック修正
- [x] **1/29**: Phase 1完了、Phase 2開始
- [x] **1/30**: 正規化関数実装
- [x] **1/31**: 名寄せ機能実装
- [x] **2/1**: 名寄せ機能完了、可視化実装
- [x] **2/2**: Phase 3開始、統合テスト
- [x] **2/3**: Phase 4完了、GAS API統合完了
- [ ] **2/4**: 最終動作確認、ドキュメント更新

### 7.2 マイルストーン
- [x] **1/29**: Phase 1完了（基本計算ロジック修正完了）
- [x] **2/1**: Phase 2完了（名寄せ機能実装完了）
- [x] **2/3**: Phase 4完了（GAS API統合完了）
- [ ] **2/4**: 全フェーズ完了（本番運用開始）

---

## ⚠️ 注意事項・リスク

### 8.1 技術的注意事項
- [x] **GAS実行時間制限**: 6分制限内での処理完了を必ず確認
- [x] **データ整合性**: 既存システムとの数値突合を徹底
- [x] **エラーハンドリング**: 異常系の処理を適切に実装

### 8.2 運用上の注意事項
- [x] **段階的移行**: 本番環境での段階的な切り替え
- [x] **ロールバック**: 問題発生時の復旧手順の準備
- [x] **監視**: 本番運用開始後の継続的な監視

---

## 🎯 完了条件

### 必須要件
- [x] 全指標が要件通りに計算される
- [x] 名寄せ機能が正常に動作する
- [x] GAS API統合が完了する
- [ ] 本番環境での安定動作が確認される

### 推奨要件
- [x] 既存Supabase実装との数値突合が完了
- [x] 運用マニュアルが整備される
- [x] 今後の拡張性が確保される

---

## 🔄 Phase 5: API統合バグ修正 ✅ **完了**

### 5.1 同期ボタンのAPI修正 ✅ **完了**
- [x] **`handleWeekSync` 関数の修正**
  - [x] `/api/recruitment/sync-week` から `/api/recruitment/gas-weekly-reports` に変更
  - [x] POSTメソッドからGETメソッドに変更
  - [x] weekSelector形式のパラメータ送信
  - 対象ファイル: `hooks/use-recruitment-dashboard.ts`

### 5.2 週次レポート取得APIの修正 ✅ **完了**
- [x] **`use-weekly-reports.ts` の修正**
  - [x] `/api/recruitment/weekly-reports` から `/api/recruitment/gas-weekly-reports` に変更
  - [x] weekSelector形式のパラメータ追加
  - [x] platform パラメータの追加
  - 対象ファイル: `hooks/use-weekly-reports.ts`

---

## 🔄 Phase 6: GASレスポンス構造の不一致修正 ✅ **完了**

### 6.1 レスポンス構造の解析修正 ✅ **完了**
- [x] **GASレスポンス構造への対応**
  - [x] `{ success: true, data: { metrics: {...} } }` 構造に対応
  - [x] `gasResponse.data || gasResponse` による柔軟な解析
  - [x] GETメソッドとPOSTメソッドの両方で修正
  - 対象ファイル: `app/api/recruitment/gas-weekly-reports/route.ts`

### 6.2 インターフェース定義の更新 ✅ **完了**
- [x] **GASWeeklyReportインターフェース**
  - [x] data プロパティを追加
  - [x] 既存プロパティをオプショナルに変更
  - [x] ネストされた構造に対応
  - 対象ファイル: `app/api/recruitment/gas-weekly-reports/route.ts`

---

## 🔧 環境設定

### 必要な環境変数
- [ ] **GAS_SCRIPT_ID**: GAS Web AppのスクリプトID
- [ ] **GAS_WEB_APP_URL**: GAS Web Appの完全URL（代替設定）

### 設定手順
1. `.env.local` に `GAS_SCRIPT_ID=your_script_id` を追加
2. GAS Web Appとしてデプロイ（実行ユーザー: 全員）
3. フロントエンドからGAS APIの動作確認

---

**このTodoに基づいて、段階的にGAS採用活動レポートの実装を進めます。**
**Phase 4まで完了し、最終動作確認とドキュメント更新が残っています。**

