# SOW: 採用レポート数値不整合の是正（Phase 9）

本SOWは、採用ダッシュボードの週次レポートで数値が0になる/反映されない問題を解消し、仕様（docs/specifications）と実装を一致させるための作業範囲を定義する。

## スコープ
- `applications` ドキュメントのステージ日付の補完・統一（`YYYY-MM-DD`）。
- 列名マッピングの一元化と職種決定ロジックの安定化。
- 週次集計のセーフティと検証ログの強化。
- 既存データのバックフィルと週次レポート再生成。

## アウトプット
- 修正済みの同期・検証コード（`validation.ts`、`applications.ts` 他）。
- 新規 `lib/integrations/recruitment-mapping.ts`（列マッピングのSingle Source of Truth）。
- バックフィルスクリプト一式（`scripts/`）。
- ドキュメント（本SOW、TODO、実行手順ログ）。

## 詳細タスク
1) データ補完と型統一
   - 既存 `applications` で `documentSubmitDate` が未設定か Timestamp のものを `YYYY-MM-DD` へ変換・保存。
   - `formSubmissionTimestamp` を補助にして、未設定行へ提出日を補完。
   - 影響週を検出して `weekly_reports` を再生成。

2) 列マッピングの一元化
   - `lib/integrations/recruitment-mapping.ts` に列名エイリアス（応募日/書類提出/面接/採用/受諾/辞退/職種/氏名/メール/電話）を定義。
   - `lib/data-processing/validation.ts` を上記マッピング参照に置換。

3) 職種決定ロジックの安定化
   - 列「職種」を最優先、未記載時のみシート名から推定。
   - 単体テストを追加。

4) パーサ強化
   - `parseSpreadsheetDate(value, 'JST')` を実装し、全てのステージ日付に適用。
   - Excelシリアル値、日本語曜日混在、全角を吸収。

5) 集計セーフティ
   - `countByDateFieldRange('documentSubmitDate')` が極端に低い場合、`formSubmissionTimestamp` を参考値としてログ出力（保存値は `documentSubmitDate` を正）。

6) インデックス整備
   - `applications` の各日付 + `jobCategory` 複合インデックスを確認・デプロイ。

## スケジュール（目安）
- 設計とマッピング抽出: 0.5日
- 実装（補完/リファクタ/パーサ）: 1.5日
- バックフィル＆再集計＆検証: 0.5日
- 合計: 2.5日

## 受け入れ基準
- 任意の週で `documentSubmitted` がフォーム実態と整合（±1件以内）。
- 全ステージ日付が `YYYY-MM-DD` で保存。
- 職種誤分類がない。
- 0件連発の警告が消失。

## 依存・前提
- Google Sheets API 認証済み。
- Firestore インデックスのデプロイ権限あり。

