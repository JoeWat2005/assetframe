/* eslint-disable camelcase */
// Lightweight per-day view counter for the "Popular this week" rail. One row per
// (edition, day); the reader increments it (deduped per session client-side). Trending =
// sum of the last 7 days. edition_id matches editions.id ('YYYY-MM-DD/SLUG').

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    create table if not exists report_views (
      edition_id text not null,
      day        date not null,
      count      bigint not null default 0,
      primary key (edition_id, day)
    );
    create index if not exists report_views_day_idx on report_views (day);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`drop table if exists report_views;`);
};
