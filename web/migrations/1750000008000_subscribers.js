/* eslint-disable camelcase */
// Email audience for the newsletter + new-edition alerts. Double opt-in: a row starts
// 'pending' with a confirm_token, flips to 'confirmed' when the link is clicked, and
// 'unsubscribed' via the one-click unsub_token (UK PECR/GDPR). topics scopes which alerts
// they get: 'digest' for all editions, or specific instrument symbols.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    create table if not exists subscribers (
      id              bigserial primary key,
      email           text not null unique,
      status          text not null default 'pending',  -- pending | confirmed | unsubscribed
      topics          text[] not null default '{}',     -- 'digest' | instrument symbols
      clerk_user_id   text,
      confirm_token   text,
      unsub_token     text not null,
      created_at      timestamptz not null default now(),
      confirmed_at    timestamptz,
      unsubscribed_at timestamptz
    );
    create index        if not exists subscribers_status_idx     on subscribers (status);
    create unique index if not exists subscribers_unsub_token_idx on subscribers (unsub_token);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`drop table if exists subscribers;`);
};
