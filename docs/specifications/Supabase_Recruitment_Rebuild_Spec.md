# 採用領域 Supabase 再構築 提案（理由・要件・仕様設計）

## 1. 概要
- 目的: 採用ダッシュボード領域のデータ基盤を Firestore から Supabase(PostgreSQL) に移行し、ゼロ化問題/整合性/運用性の課題を抜本的に改善する。
- スコープ: `applications`（応募）/ 週次レポート（`weekly_reports`）/ コメント（`recruitment_detail_items`）/ 同期API（Sheets→DB）/ 週次取得API（UI表示）。

## 2. なぜ Firestore より Supabase が適しているか
- 強いスキーマと型の一貫性
  - Firestore で発生していた string/timestamp 混在が PostgreSQL の `date`/`timestamptz` により解消。列型が保証され、集計ロジックが簡潔・堅牢になる。
- SQL による表現力の高い集計
  - 週次集計（応募集合と範囲系の二系統）を 1 クエリで表現可能。ビュー/マテビュー化で安定供給・高速化が容易。
- インデックス管理の透過性
  - 実行計画の観測（`EXPLAIN ANALYZE`）と、複合インデックスの明示的設計が可能。Firestore の「不足時500/0件」問題を回避。
- 一貫性とトランザクション
  - 複数テーブルの同時更新・再集計をトランザクションで確実に完了できる（部分失敗や一貫性崩れの回避）。
- RLS（Row Level Security）で安全な直アクセス
  - UI からの読み取りは公開/制限を選択でき、書き込みは `authenticated` のみに制御など柔軟。FireStore セキュルール相当をSQLで再現しやすい。
- 観測性・運用性
  - `pg_stat_statements` / ログ / 拡張で、遅いクエリの特定・調整が容易。定期ジョブ（マテビュー更新）も管理しやすい。

【期待される改善との対応】
- 「複合インデックス不足 → エラー/0件」: 事前に `create index` を定義し、不足が起きない。足りなくても実行計画で即察知可能。
- 「日付型混在で二重集計/取りこぼし」: 型を `date`/`timestamptz` に統一。SQLの BETWEEN で正確に抽出。
- 「空スナップショット→その場再集計/保存」: マテビューやビューで「常に算出できる」構造に。保存方式でもTXで堅牢化。
- 「UIコメントの直書きと権限管理」: `recruitment_detail_items` に RLS と `created_by` で堅牢に移行。Realtime も利用可能。

## 3. 開発要件
- 環境
  - Supabase プロジェクト（本番/開発）。リージョンはアプリと近接。
  - CLI: `supabase`（Docker 前提）。Node 18+。
  - ランタイム: Next.js（既存）、`@supabase/supabase-js`。
  - 環境変数: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`。
  - フィーチャーフラグ: `RECRUITMENT_DB=firestore|supabase`（段階切替）。
- 運用
  - 週次集計は SQL/ビュー/マテビューのいずれか。必要に応じて定期更新（cron）またはオンデマンド再計算。
  - バックアップ/ロールバック手順の整備。

## 4. スキーマ設計（最小）

```sql
-- 4.1 applications（応募）
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null,
  normalized_name text not null,
  email text not null,
  job_category text not null,            -- 'sns_operation' | 'video_creator' | 'ai_writer' | 'photography_staff'
  media_source text,
  application_date date not null,
  status text not null,                  -- '応募落ち','書類落ち','不採用','採用','離脱','面談不参加','内定受諾' 等
  document_submit_date date,
  interview_date date,
  interview_implemented_date date,
  hire_date date,
  acceptance_date date,
  form_submission_timestamp timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_job_application_date on applications (job_category, application_date);
create index if not exists idx_app_status_updated_at on applications (status, updated_at);
create index if not exists idx_app_job_document_submit on applications (job_category, document_submit_date);
create index if not exists idx_app_job_interview_date on applications (job_category, interview_date);
create index if not exists idx_app_job_interview_impl on applications (job_category, interview_implemented_date);
create index if not exists idx_app_job_hire_date on applications (job_category, hire_date);
create index if not exists idx_app_job_acceptance_date on applications (job_category, acceptance_date);

-- 4.2 weekly_reports（保存 or 抽象）
create table if not exists weekly_reports (
  id text primary key,                   -- 'YYYY-MM-WN' or 'YYYY-MM-WN-<job>'
  report_type text not null,             -- 'recruitment'
  year int not null,
  week_number int not null,
  start_date date not null,
  end_date date not null,
  job_category text,                     -- null=合算, 個別は文字列
  recruitment_metrics jsonb not null,    -- 下記仕様のマップ
  is_manually_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  generated_at timestamptz not null default now()
);

create index if not exists idx_wr_type_year_week on weekly_reports (report_type, year desc, week_number desc);
create index if not exists idx_wr_type_job_year_week on weekly_reports (report_type, job_category, year desc, week_number desc);

-- 4.3 recruitment_detail_items（UIコメント）
create table if not exists recruitment_detail_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  comment text,
  job_category text not null,
  platform text not null,
  "order" int not null,
  source_data jsonb not null,            -- {weekId, tableType, rowLabel, value}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid                         -- optional: auth.uid() で設定する場合
);

create index if not exists idx_rdi_job_platform_created on recruitment_detail_items (job_category, platform, created_at);
```

補足:
- 第一段階は `text` で開始し、安定後に `enum` 型/チェック制約へ昇格可能。
- `weekly_reports` は「保存」か「マテビュー」の選択肢。初期は保存方式を踏襲し、将来はマテビュー化を検討。

## 5. RLS（Row Level Security）

```sql
alter table weekly_reports enable row level security;
alter table recruitment_detail_items enable row level security;
alter table applications enable row level security;

-- weekly_reports: 表示は広く（ダッシュボードで参照）
create policy weekly_reports_read_all on weekly_reports
for select to anon, authenticated using (true);

-- recruitment_detail_items: 表示は全員、書込みはログインユーザ
create policy rdi_read_all on recruitment_detail_items
for select to anon, authenticated using (true);

create policy rdi_write_auth on recruitment_detail_items
for insert, update, delete to authenticated using (true) with check (true);

-- applications: 原則サーバ専用（SERVICE_ROLE で操作）
revoke all on table applications from anon, authenticated;
```

オプション:
- `recruitment_detail_items.created_by` を導入し、`auth.uid() = created_by` のみ更新/削除可にする粒度強化が可能。

## 6. 週次集計 SQL（PoC）
応募週集合（apply）と範囲系（各ステージ/updated_at）を合わせて 1 クエリで返す例。

```sql
with params as (
  select
    to_date(:start_date, 'YYYY-MM-DD') as week_start,
    to_date(:end_date, 'YYYY-MM-DD')   as week_end,
    nullif(:job_category, '') as jc
),
base as (
  select a.* from applications a, params p
  where a.application_date between p.week_start and p.week_end
    and (p.jc is null or a.job_category = p.jc)
),
range as (
  select
    count(*) filter (where a.document_submit_date between p.week_start and p.week_end
                     or a.form_submission_timestamp between p.week_start and p.week_end) as document_submitted,
    count(*) filter (where a.interview_date between p.week_start and p.week_end) as interview_scheduled,
    count(*) filter (where a.interview_implemented_date between p.week_start and p.week_end) as interview_conducted,
    count(*) filter (where a.hire_date between p.week_start and p.week_end) as hire_count,
    count(*) filter (where a.acceptance_date between p.week_start and p.week_end) as offer_accepted_count,
    count(*) filter (where a.status = '応募落ち' and a.updated_at between p.week_start and p.week_end) as apply_reject_count,
    count(*) filter (where a.status = '書類落ち' and a.updated_at between p.week_start and p.week_end) as document_reject_count,
    count(*) filter (where a.status in ('面談不参加','離脱') and a.updated_at between p.week_start and p.week_end) as interview_cancelled
  from applications a, params p
  where (p.jc is null or a.job_category = p.jc)
)
select
  (select count(*) from base) as apply_count,
  r.apply_reject_count,
  greatest(0, (select count(*) from base where status not in ('採用','不採用','辞退','離脱','応募落ち','書類落ち','採用辞退','面談不参加','内定受諾'))) as apply_continue_count,
  r.document_submitted, r.document_reject_count,
  greatest(r.document_submitted, 0) as document_continue_count,
  r.interview_scheduled, r.interview_conducted, r.interview_cancelled,
  r.hire_count, r.offer_accepted_count,
  case when r.interview_scheduled > 0 then round((r.interview_conducted::numeric / r.interview_scheduled)*100, 1) else 0 end as interview_rate,
  0::numeric as hire_rate,
  case when r.hire_count > 0 then round((r.offer_accepted_count::numeric / r.hire_count)*100, 1) else 0 end as acceptance_rate
from range r;
```

## 7. API 設計（互換）
- 既存エンドポイントは維持し、内部実装を Supabase に差し替える。
- パラメータ/レスポンス形式は現状踏襲（UI改修は最小）。
- 代表例
  - `GET /api/recruitment/weekly-reports?year=2025&month=8&weekInMonth=2&jobCategory=sns`
    - Firestore クエリ→Supabase SQL（上記 PoC + 週識別変換）。
  - `POST /api/recruitment/sync-week` / `POST /api/recruitment/sync`
    - Sheets→applications upsert（サービスロール）。完了後、必要に応じて `weekly_reports` を upsert もしくはマテビューを参照。
  - コメント CRUD: `recruitment_detail_items` を Supabase に移行（SWR/Realtimeいずれも可）。

## 8. 移行手順（段階）
1) PoC ブランチ/環境
- フィーチャーフラグ `RECRUITMENT_DB` で Firestore/Supabase を切替可能に。
- Supabase スキーマ/RLS 適用、接続クライアント雛形追加。

2) データ移送（Firestore → Supabase）
- Firestore Admin SDK で全件取得→型正規化→`applications` にバルク投入。
- 代表ステータス/理由の正規化と `job_category` の統一。

3) 互換 API 差替
- `weekly-reports` を Supabase 読み取りへ（レスポンス互換）。
- コメント `recruitment_detail_items` を Supabase へ（RLS適用）。

4) 同値性テスト
- 週を跨いだ複数範囲で、旧実装と新実装の数値一致を検証。乖離時は SQL/データを追跡（実行計画でチューニング）。

5) 切替/監視
- 本番で `RECRUITMENT_DB=supabase` に切替。
- 遅いクエリ/ロック/エラーを監視し、インデックス/SQL 調整。

## 9. 運用・監視
- パフォーマンス: `EXPLAIN ANALYZE`、`pg_stat_statements`。
- 可用性: バックアップ/リストア手順の整備。
- ジョブ: 必要に応じてマテビューの定期更新（`cron`/Edge Functions）。

## 10. リスクと緩和
- CLI/Docker 依存: 開発者マシンに Docker が必要 → ドキュメント整備。
- 学習コスト: SQL/RLS/インデックス設計 → サンプル/ガイド提供。
- リアルタイム要件: 必要に応じて Realtime チャネルを検証。
- ベンダーロックイン: RDB/SQL の汎用性を活かし移行容易性を維持。

## 11. セットアップ手順（PowerShell / Windows）
```powershell
# 1) Supabase CLI インストール（Winget 例）
winget install supabase.supabase

# 2) ログイン
supabase login

# 3) プロジェクトにリンク（既存プロジェクトIDを指定）
# supabase link --project-ref <your-project-ref>

# 4) スキーマ/RLS 適用（SQLを psql もしくは ダッシュボード SQL Editor で実行）
# psql 例: 環境変数に接続文字列を設定して流す

# 5) .env.local に接続情報/フラグを追加
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
# RECRUITMENT_DB=supabase

# 6) 開発サーバ（ポート 8080 推奨）
$env:PORT=8080
npm run dev
```

---
この設計により、インデックス不足/型混在/ゼロ化/再集計の複雑化といった現行課題に対し、RDB の強み（型・インデックス・SQL・トランザクション）でシンプルかつ透明に対処できます。まずは PoC ブランチで `weekly-reports` を Supabase 読み取りに差し替え、同値性を検証後、段階的に移行します。
