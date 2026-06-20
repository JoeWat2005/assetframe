/* eslint-disable camelcase */
// Adds the engine's computed DUE status to engine_assets so the admin dashboard can show which
// instruments are scheduled to generate. Written by the box's `compute_due` command (which runs
// run_daily --mode dry_run and writes each asset's decision/reason back). Nullable = "not checked
// yet" until the first compute_due runs.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    alter table engine_assets
      add column if not exists due             boolean,
      add column if not exists due_reason      text,
      add column if not exists due_checked_at  timestamptz;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    alter table engine_assets
      drop column if exists due,
      drop column if exists due_reason,
      drop column if exists due_checked_at;
  `);
};
