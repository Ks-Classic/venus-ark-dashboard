# 採用レポート数値不整合 修正TODO（Root Cause -> Fix Plan）

このファイルは、採用活動レポートで値が0になる/反映されない問題の根本原因と、解決のための実装タスクを整理したものです。着手順に上から実行してください。

## 背景（要約）
- 週次集計は `applications` 内の各ステージ日付を週範囲で集計（`countByDateFieldRange`）しており、日付が保存されていない/型不一致/列名未検出だと 0 になりやすい。
- 週同期(`/api/recruitment/sync-week`)でもフォーム由来の提出日を補完する実装が入ったが、列名検出やパースの揺れ・既存データの型混在が依然として影響。
- 職種推定や列マッピングが分散しており、変更に弱い。

## 優先タスク（必須）
1. フォーム提出日の補完の堅牢化（既存データも対象）
   - [ ] `scripts/` にバックフィル用スクリプトを追加し、`applications.documentSubmitDate` が未設定で `formSubmissionTimestamp` がある場合に `YYYY-MM-DD` で補完保存。
   - [ ] 既存データの型混在（Timestamp/文字列）を全て `YYYY-MM-DD` 文字列へ統一。
   - [ ] 影響週を自動検出し、週次レポートを再生成。

2. 列名マッピングの一元化
   - [ ] `lib/integrations/recruitment-mapping.ts` を新規作成し、列エイリアス（応募日/書類提出/面接日 等）と職種列のマッピングを定義。
   - [ ] `lib/data-processing/validation.ts` のヘッダ検出処理を上記マッピングにリファクタ。

3. 職種決定の安定化
   - [ ] 列「職種」を最優先。未記載時のみシート名からのフォールバック推定を使用。
   - [ ] `validation.ts` の職種決定ロジックにテストを追加。

4. パーサ拡張（日時の揺れ対策）
   - [ ] `lib/date.ts` もしくは新規 `lib/parsers/date.ts` に `parseSpreadsheetDate(value: any, tz: 'JST')` を追加。
   - [ ] 「8/5(火) 10:00」「2025/8/5」「Excelシリアル」「全角」などの入力を `Date` へ正規化 → 保存時は `YYYY-MM-DD`。
   - [ ] `validation.ts` の日付パース箇所をすべて置換。

5. 集計のフォールバック（暫定セーフティ）
   - [ ] `lib/analytics/weekly-aggregation.ts` の応募集合近似値に、`documentSubmitDate || formSubmissionTimestamp` をすでに使用しているが、差分が大きい場合は警告ログを出す。
   - [ ] `lib/firestore/applications.ts` の `countByDateFieldRange('documentSubmitDate', ...)` が 0 の週には、暫定で `formSubmissionTimestamp` も補助集計して検証ログを出す（保存値は基本 `documentSubmitDate` を正とする）。

6. Firestoreインデックスの確認
   - [ ] `scripts/check-required-indexes.ts` を実行し、`applications` の各日付フィールド + `jobCategory` の複合インデックスが有効か確認・デプロイ。

7. E2E/ユニットテストの追加
   - [ ] `tests/unit/` に、週境界/型混在/列名揺れのケースを追加。`generateWeeklyRecruitmentReport` の算出が期待通りになることを検証。

## 受け入れ基準（Acceptance Criteria）
- [ ] 任意の週について、`weekly_reports.recruitmentMetrics.documentSubmitted` がフォーム提出実態と乖離しない（±1件以内）。
- [ ] 全ての検索対象フィールド（applicationDate, documentSubmitDate, interviewDate, interviewImplementedDate, hireDate, acceptanceDate）が `YYYY-MM-DD` で保存。
- [ ] 職種列の有無にかかわらず、誤分類が発生しない（列優先 → シート名フォールバック）。
- [ ] `dev-sync.log` に 0 件連発の警告が出ない。

## 実装ノート（参照）
- 集計呼び出し箇所: `lib/analytics/weekly-aggregation.ts` 内 `countByDateFieldRange()` の並列集計。
- 保存フォーマット: `lib/firestore/applications.ts` の `createApplicationFromInput()` で `YYYY-MM-DD` へ統一。
- 週同期: `app/api/recruitment/sync-week/route.ts` はフォームタイムスタンプの補完処理を実装済み。既存データのバックフィルが鍵。

