/* eslint-disable camelcase */
// Multi-timeframe + per-asset fetch config for engine_assets (mirrors scripts/config_loader.py):
//   cadence_day          -- weekly-cadence target day: "0".."6" (Mon=0) or "mon".."sun"; null = Monday
//   timeframes           -- list of forecast windows -> ONE prediction track each ([] = [forecast_window])
//   include_fundamentals -- equity fundamentals in the Pro report (null = engine default: equities only)
//   include_news         -- news/catalyst research in the brief (false = technical-focus)
//   fundamentals_source  -- auto | twelvedata | none
// All nullable / defaulted so the existing 8 seeded rows keep their behaviour (null fundamentals =
// equities-only; empty timeframes = the single forecast_window). The box sync omits null fields so
// config_loader applies its own defaults.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    alter table engine_assets
      add column if not exists cadence_day           text,
      add column if not exists timeframes            jsonb   not null default '[]'::jsonb,
      add column if not exists include_fundamentals  boolean,
      add column if not exists include_news          boolean not null default true,
      add column if not exists fundamentals_source   text    not null default 'auto';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    alter table engine_assets
      drop column if exists cadence_day,
      drop column if exists timeframes,
      drop column if exists include_fundamentals,
      drop column if exists include_news,
      drop column if exists fundamentals_source;
  `);
};
