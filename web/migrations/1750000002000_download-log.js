/* eslint-disable camelcase */
// Pro-download log — powers the admin dashboard's downloads charts.
// One row per Pro file fetched through /api/pro (free files are served by the CDN
// and not logged here).

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    create table if not exists download_log (
      id         bigserial primary key,
      report_id  text,          -- "<date>/<slug>"
      kind       text,          -- 'html' | 'pdf'
      user_id    text,          -- best-effort (email); nullable
      ts         timestamptz default now()
    );
    create index if not exists download_log_ts_idx     on download_log (ts);
    create index if not exists download_log_report_idx on download_log (report_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`drop table if exists download_log;`);
};
