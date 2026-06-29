 
// Per-call result tracker: hits (predictions that came true) + scored flag.
// While a call is open both stay at their defaults (0 / false); after the scoring
// engine reruns, sync fills hits and flips scored, so the UI shows e.g. 4/5.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    alter table open_calls add column if not exists hits   int default 0;
    alter table open_calls add column if not exists scored boolean default false;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    alter table open_calls drop column if exists hits;
    alter table open_calls drop column if exists scored;
  `);
};
