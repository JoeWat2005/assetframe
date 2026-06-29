 
// Admin-only SANDBOX backtest results. Populated by the box's backtest sync from ledger/sim
// (scripts/sync_backtest.py) after a `run_backtest`. This table is ISOLATED from production: the
// public site never reads it; editions / open_calls / scored_results are never touched by a
// sandbox run. Mirrors the outcome-ledger columns + a created_at, keyed on the report_id so a
// re-run upserts (idempotent). Clearing it is an admin-only reset.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    create table if not exists backtest_results (
      report_id    text primary key,
      ticker       text,
      instrument   text,
      asset_class  text,
      view         text,
      confidence   integer,
      horizon      text,
      window_end   text,
      results      text,
      hits         integer,
      misses       integer,
      hit_rate     numeric,
      scored_at    text,
      created_at   timestamptz not null default now()
    );
    create index if not exists backtest_results_window_end_idx on backtest_results (window_end desc);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`drop table if exists backtest_results;`);
};
