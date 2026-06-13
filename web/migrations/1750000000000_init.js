/* eslint-disable camelcase */
// Baseline schema: editions, open_calls, scored_results.
// Idempotent (IF NOT EXISTS) so it reconciles a database that was first created
// by the old sync-db schema bootstrap without erroring.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    create table if not exists editions (
      id              text primary key,
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
      free_html_key   text,
      free_pdf_key    text,
      preview_key     text,
      pro_html_key    text,
      pro_pdf_key     text,
      created_at      timestamptz default now()
    );
    create index if not exists editions_date_idx   on editions (report_date desc);
    create index if not exists editions_asset_idx  on editions (asset_class);
    create index if not exists editions_ticker_idx on editions (ticker);

    create table if not exists open_calls (
      report_id   text primary key,
      instrument  text,
      symbol      text,
      view        text,
      confidence  text,
      window_end  text,
      n           int,
      n_manual    int
    );

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
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    drop table if exists scored_results;
    drop table if exists open_calls;
    drop table if exists editions;
  `);
};
