 
// Per-user followed instruments. A signed-in user "follows" a symbol from a report card or
// the reader; the new-edition cron emails followers when a fresh edition for that symbol
// publishes. unique(user, symbol) keeps follows idempotent.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    create table if not exists watchlists (
      id            bigserial primary key,
      clerk_user_id text not null,
      symbol        text not null,
      instrument    text,
      created_at    timestamptz not null default now(),
      unique (clerk_user_id, symbol)
    );
    create index if not exists watchlists_user_idx   on watchlists (clerk_user_id);
    create index if not exists watchlists_symbol_idx on watchlists (symbol);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`drop table if exists watchlists;`);
};
