/* eslint-disable camelcase */
// Referential integrity for report data: link open_calls to their edition so deleting an
// edition cascade-removes its (pending) open call — and, via the existing FK on
// open_call_predictions(report_id) -> open_calls, its predictions too.
//
// editions.report_ref is a STORED generated column that reproduces the engine's registered
// report id ("AF-YYYYMMDD-SLUG"), which is the value open_calls.report_id holds. A unique
// constraint on it lets open_calls reference it.
//
// scored_results intentionally has NO FK to editions: it is the append-only TRACK RECORD.
// Deleting/unpublishing an edition must never erase its scored history (the "scored, never
// re-tuned" promise), and the ledger can outlive a dropped edition.
//
// Safe to add on the (now-empty) DB; sync-db upserts editions before open_calls, so the FK
// holds in the normal publish flow.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    alter table editions
      add column if not exists report_ref text
      generated always as (
        'AF-' ||
        lpad(extract(year  from report_date)::int::text, 4, '0') ||
        lpad(extract(month from report_date)::int::text, 2, '0') ||
        lpad(extract(day   from report_date)::int::text, 2, '0') ||
        '-' || slug
      ) stored;

    do $$ begin
      if not exists (select 1 from pg_constraint where conname = 'editions_report_ref_uniq') then
        alter table editions add constraint editions_report_ref_uniq unique (report_ref);
      end if;
    end $$;

    do $$ begin
      if not exists (select 1 from pg_constraint where conname = 'open_calls_edition_fk') then
        alter table open_calls
          add constraint open_calls_edition_fk
          foreign key (report_id) references editions(report_ref) on delete cascade;
      end if;
    end $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    alter table open_calls drop constraint if exists open_calls_edition_fk;
    alter table editions drop constraint if exists editions_report_ref_uniq;
    alter table editions drop column if exists report_ref;
  `);
};
