### 採用ダッシュボード 項目別フロー仕様（Sheets → Supabase → Report）

この文書は、応募フォームシート／採用管理シートから取得する各項目が、Supabase 上でどのようなスキーマ・処理で集計され、週次レポートへ反映されるかを項目別に整理したものです。対象週のみを同期・再集計する運用を前提とします。

- 応募フォームシート（書類提出の一次ソース）: 列 `タイムスタンプ`, `名前`, `メールアドレス` ほか
- 採用管理シート（ステータスと各ステージ日）: 列 `応募日`, `ステータス/選考状況`, 各種日付の別名群（書類提出/面接予定/面接実施/採用/内定受諾 など）

参考実装: `scripts/sync-recruitment-data.ts`, `lib/data-processing/validation.ts`, `lib/analytics/weekly-aggregation.ts`

---

### 0. Supabase 最小スキーマ（抜粋）
- `applications`
  - 主な列: `applicant_name text`, `normalized_name text`, `email text`, `job_category text`, `application_date date`, `status text`,
    `document_submit_date date`, `interview_date date`, `interview_implemented_date date`, `hire_date date`, `acceptance_date date`,
    `form_submission_timestamp timestamptz`, `created_at timestamptz`, `updated_at timestamptz`
- `weekly_reports`
  - 主な列: `id text(pk)`, `report_type text`, `year int`, `week_number int`, `start_date date`, `end_date date`,
    `job_category text`, `recruitment_metrics jsonb`, `generated_at timestamptz`, `updated_at timestamptz`

---

### 1. 応募数（applyCount）
- Sheets → ETL
  - ソース: 採用管理シート `応募日/応募日時`
  - 取り込み: `applications.application_date`（date）
- 週次算出
  - 条件: `application_date between [week_start, week_end]`（職種指定時は `job_category` で絞込）
  - 集計: 件数
- レポート反映
  - `weekly_reports.recruitment_metrics.applyCount` へ設定

### 2. 応募内不採用数（applyRejectCount）
- Sheets → ETL
  - ソース: 採用管理シート `ステータス/選考状況`（=『応募落ち』）
  - 取り込み: `applications.status='応募落ち'`, `updated_at` は同期時刻
- 週次算出
  - 条件: `status='応募落ち' AND updated_at between [week_start, week_end]`
  - 集計: 件数
- レポート反映
  - `recruitment_metrics.applyRejectCount`

### 3. 選考継続数（応募）（applyContinueCount）
- Sheets → ETL
  - ソース: 採用管理シート `応募日/応募日時` と `ステータス`
- 週次算出
  - ベース集合: `application_date between [week_start, week_end]`
  - 未クローズ条件: `status NOT IN ('採用','不採用','辞退','離脱','応募落ち','書類落ち','採用辞退','面談不参加','内定受諾')`
  - 集計: 件数
- レポート反映
  - `recruitment_metrics.applyContinueCount`

### 4. 書類提出数（documentSubmitted）
- Sheets → ETL
  - 唯一ソース（現運用）: 応募フォームシートの `タイムスタンプ` を正規化氏名で名寄せ → `applications.form_submission_timestamp`
  - 備考: 採用管理シートには原則「書類提出」列は存在しない。将来列が追加された場合のみ、オプションで `applications.document_submit_date` に保存（既存実装はフォールバック扱い）。
- 週次算出
  - 原則 `form_submission_timestamp between [week_start, week_end]` を件数化（フォーム優先）
  - 実装現状: 過去互換のため `document_submit_date` を集計し0件ならフォーム件数で代替（将来はユニオンで重複除外した合算に拡張可能）
- レポート反映
  - `recruitment_metrics.documentSubmitted`

### 5. 書類内不採用数（documentRejectCount）
- Sheets → ETL
  - ソース: 採用管理シート `ステータス/選考状況`（=『書類落ち』）
- 週次算出
  - 条件: `status='書類落ち' AND updated_at between [week_start, week_end]`
- レポート反映
  - `recruitment_metrics.documentRejectCount`

### 6. 選考継続数（書類）（documentContinueCount）
- Sheets → ETL
  - ソース: 応募フォーム `タイムスタンプ`（必須）＋ 採用管理シートは将来列が増えた場合のみオプション
- 週次算出
  - ベース集合: 応募集合（1.）を起点
  - 継続判定: 書類段階の継続候補（例: `status IN ('書類提出','面談調整中','面談確定','面接実施','interview','final_review')`）
  - 下限保証: `documentContinueCount = GREATEST(継続候補件数, documentSubmitted)`
- レポート反映
  - `recruitment_metrics.documentContinueCount`

### 7. 面接予定数（interviewScheduled）
- Sheets → ETL
  - ソース: 採用管理シートの面接予定列（別名群）→ `applications.interview_date`
- 週次算出
  - 条件: `interview_date between [week_start, week_end]`
- レポート反映
  - `recruitment_metrics.interviewScheduled`

### 8. 面接実施数（interviewConducted）
- Sheets → ETL
  - ソース: 採用管理シートの面接実施列（別名群）→ `applications.interview_implemented_date`
- 週次算出
  - 条件: `interview_implemented_date between [week_start, week_end]`
- レポート反映
  - `recruitment_metrics.interviewConducted`

### 9. 採用者数（hireCount）
- Sheets → ETL
  - ソース: 採用管理シートの採用列（別名群）→ `applications.hire_date`
- 週次算出
  - 条件: `hire_date between [week_start, week_end]`
- レポート反映
  - `recruitment_metrics.hireCount`

### 10. 内定受諾数（offerAcceptedCount）
- Sheets → ETL
  - ソース: 採用管理シートの内定受諾列（別名群）→ `applications.acceptance_date`
- 週次算出
  - 条件: `acceptance_date between [week_start, week_end]`
- レポート反映
  - `recruitment_metrics.offerAcceptedCount`

### 11. 不採用者内訳（rejectionBreakdown）
- Sheets → ETL
  - ソース: 採用管理シート `不採用理由/辞退理由`（自由記述）
- 週次算出
  - **通常の不採用理由**: `application_date between [week_start, week_end]` かつ `status IN ('不採用', '書類落ち', '応募落ち')`
  - **内定後辞退**: エントリーフォームのタイムスタンプが対象週内 かつ `status='採用辞退'`
  - 分類: 文字列マッチングで以下のカテゴリに分類
    - `experienced`: 経験者/経験
    - `elderly`: 高齢/年齢
    - `unsuitable`: 不適合/ミスマッチ
    - `foreign`: 外国籍/国籍
    - `post_offer_withdrawal`: 辞退/内定後/採用辞退（エントリーフォーム基準）
    - `other`: 転居/引っ越し/上京以外
  - 集計: 各カテゴリ件数
- レポート反映
  - `recruitment_metrics.rejectionBreakdown.{category}`

### 12. 比率（UI表示用）
- 面接実施率: `round((interviewConducted / nullif(interviewScheduled,0)) * 100, 1)`
- 内定受諾率: `round((offerAcceptedCount / nullif(hireCount,0)) * 100, 1)`

---

### 13. 週次同期（選択週のみ反映）
1) UIで週（`year, month, weekInMonth`）選択 → 同期ボタン
2) API（例）: `POST /api/recruitment/sync-week { year, month, weekInMonth }`
3) フロー
   - 週範囲 `[week_start, week_end]` を算出
   - 応募フォームの `タイムスタンプ` を取得し名寄せマップを生成
   - 採用管理シートの対象シート群を走査し、週内に関係する行を `applications` へ upsert（応募日フィルタ＋各ステージ日）
   - その週の `weekly_reports` を再生成（職種別→合算）し upsert
4) UI は `GET /api/recruitment/weekly-reports?year&month&weekInMonth[&jobCategory]` を再取得

---

### 14. 実装メモ
- 列名の揺れはエイリアス配列で吸収（`validation.ts` 参照）
- フォーム `タイムスタンプ` は書類段階の下限値として使用（実務要件）
- 将来: `weekly_reports` のマテビュー化で参照一貫性と速度を向上可能
