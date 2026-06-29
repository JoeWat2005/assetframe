// Schema flush — drop the editions columns that are dead or superseded, and validate the FK that
// was added NOT VALID. Drops:
//   asset_class_key / prediction_type / market_regime — SUPERSEDED by scored_results.{asset_class,
//       pred_type, market_regime} (migration 1750000030000); the web now reads taxonomy from there.
//   direction_view / social_context                   — never read by anything.
//   report_ref (+ its unique index editions_report_ref_uniq) — a GENERATED daily-only id, replaced
//       by the cadence-aware report_id (1750000026000); the open_calls FK already repointed off it
//       to report_id in 1750000029000.
// KEPT: confidence_band (read by the new-editions notification cron) and asset_class (display class).
//
// Coupled code that ships WITH this migration:
//   - scripts/sync-db.mjs: the editions upsert no longer writes the dropped columns.
//   - web/lib/content-db.ts: the scored query reads taxonomy from sr.* only (no editions fallback).
// DEPLOY ORDER: deploy the ENGINE (the new sync-db) with or before this migration, so the old
// upsert never references a now-dropped column. (If it does, sync-db's "column does not exist"
// guard skips the edition rather than crashing, and it self-heals once the engine redeploys.)
//
// This is the SCHEMA half of the flush. The DATA flush (wiping the test catalog) stays a
// coordinated box+R2+Neon operation per LAUNCH.md — clearing Neon alone just re-syncs from the box.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    drop index if exists editions_report_ref_uniq;
    alter table editions
      drop column if exists asset_class_key,
      drop column if exists direction_view,
      drop column if exists prediction_type,
      drop column if exists market_regime,
      drop column if exists social_context,
      drop column if exists report_ref;
    alter table open_calls validate constraint open_calls_edition_fk;
  `);
};

exports.down = (pgm) => {
  // Best-effort restore of the dropped columns (incl. the generated report_ref + its unique index).
  // VALIDATE CONSTRAINT is not meaningfully reversible, so the FK simply stays valid.
  pgm.sql(`
    alter table editions
      add column if not exists asset_class_key text,
      add column if not exists direction_view  text,
      add column if not exists prediction_type text,
      add column if not exists market_regime   text,
      add column if not exists social_context  jsonb,
      add column if not exists report_ref text generated always as
        ('AF-' || lpad((extract(year  from report_date))::int::text, 4, '0')
               || lpad((extract(month from report_date))::int::text, 2, '0')
               || lpad((extract(day   from report_date))::int::text, 2, '0')
               || '-' || slug) stored;
    create unique index if not exists editions_report_ref_uniq on editions(report_ref);
  `);
};
