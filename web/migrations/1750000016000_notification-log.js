 
// Idempotency log for outbound notifications. One row per (ref, recipient, channel):
//   - push:          ref = edition id,             recipient = push endpoint
//   - email_digest:  ref = publish date YYYY-MM-DD, recipient = email
// The cron CLAIMS a row (INSERT ... ON CONFLICT DO NOTHING) before sending, so re-running it
// the same day never double-sends. A new edition on a later day has a new ref, so it still
// notifies. On a send failure the claim is released so a later run can retry.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    create table if not exists notification_log (
      ref          text not null,
      recipient    text not null,
      channel      text not null,
      created_at   timestamptz default now(),
      primary key (ref, recipient, channel)
    );
    create index if not exists notification_log_created_idx on notification_log (created_at);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`drop table if exists notification_log;`);
};
