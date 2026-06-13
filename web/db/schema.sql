-- AssetFrame report database (Neon Postgres).
-- Holds ONLY report data — users live in Clerk, payments in Lemon Squeezy,
-- and the report files (HTML/PDF) stay in R2 (referenced here by key).
-- Normalised at the level the site actually uses, storing nothing that isn't needed.

-- The report catalog: one row per published edition.
create table if not exists editions (
  id              text primary key,          -- "<date>/<slug>", e.g. "2026-06-13/ETH"
  report_date     date not null,
  slug            text not null,
  instrument      text not null,
  ticker          text,
  asset_class     text,
  status          text,
  risk            text,
  bias            text,
  data_quality    int,
  window_end      text,
  catalyst_status text,
  has_pro         boolean default false,
  free_html_key   text,                      -- path under /r/ (public, served by Vercel/CDN)
  free_pdf_key    text,
  preview_key     text,
  pro_html_key    text,                      -- R2 object key (private, signed URLs)
  pro_pdf_key     text,
  created_at      timestamptz default now()
);
create index if not exists editions_date_idx   on editions (report_date desc);
create index if not exists editions_asset_idx  on editions (asset_class);
create index if not exists editions_ticker_idx on editions (ticker);

-- Open calls: predictions published and awaiting scoring (the track-record "open" list).
create table if not exists open_calls (
  report_id   text primary key,
  instrument  text,
  symbol      text,
  view        text,
  confidence  text,
  window_end  text,
  n           int,
  n_manual    int,
  hits        int default 0,         -- predictions confirmed true (0 while pending)
  scored      boolean default false  -- flips true once the engine scores the window
);
-- Drop the earlier denormalised jsonb column in favour of the child table below.
alter table open_calls drop column if exists predictions;
alter table open_calls add column if not exists hits int default 0;
alter table open_calls add column if not exists scored boolean default false;

-- Individual predictions (sub-calls P1..Pn) for each open call — one row per
-- prediction, linked back to its parent open_calls row.
create table if not exists open_call_predictions (
  id         bigserial primary key,
  report_id  text not null references open_calls(report_id) on delete cascade,
  seq        int,                 -- order within the report (1..n)
  pred_id    text,                -- "P1".."Pn"
  type       text,                -- close_above, range_inside, manual, …
  text       text,                -- human-readable prediction
  manual     boolean default false,
  expect     boolean,             -- what we predict (null for manual/NT calls)
  unique (report_id, pred_id)
);
create index if not exists ocp_report_idx on open_call_predictions (report_id);

-- Pro-download log (admin dashboard charts). One row per Pro file fetched via /api/pro.
create table if not exists download_log (
  id         bigserial primary key,
  report_id  text,
  kind       text,
  user_id    text,
  ts         timestamptz default now()
);
create index if not exists download_log_ts_idx     on download_log (ts);
create index if not exists download_log_report_idx on download_log (report_id);

-- Scored results: the append-only outcome ledger (one row per scored report).
create table if not exists scored_results (
  id          bigserial primary key,
  report_id   text,
  instrument  text,
  view        text,
  confidence  text,
  results     text,
  hits        int,
  misses      int,
  hit_rate    text,
  window_end  text,
  scored_at   timestamptz default now()
);
