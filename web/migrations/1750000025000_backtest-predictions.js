/* eslint-disable camelcase */
// Per-prediction detail for SANDBOX backtests (admin-only). Captured by score_report at score time
// (it has both the prediction text and the graded outcome) into data/predictions/sim/scored/, then
// synced by scripts/sync_backtest.py. Lets the admin expand a backtest result into the full list of
// predictions — text + Hit/Miss/No-trigger — and mark the MANUAL (event-based) ones it cannot
// auto-grade. ISOLATED from production: the public site never reads it.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    create table if not exists backtest_predictions (
      report_id   text not null,
      pred_id     text not null,
      ptype       text,
      ptext       text,
      manual      boolean not null default false,
      outcome     text,          -- Y | N | NT | MANUAL | null (manual + unresolved)
      sort        integer,
      created_at  timestamptz not null default now(),
      primary key (report_id, pred_id)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`drop table if exists backtest_predictions;`);
};
