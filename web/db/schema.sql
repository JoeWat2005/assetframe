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
  predictions jsonb default '[]'::jsonb   -- the individual sub-calls for this open call
);
alter table open_calls add column if not exists predictions jsonb default '[]'::jsonb;

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
