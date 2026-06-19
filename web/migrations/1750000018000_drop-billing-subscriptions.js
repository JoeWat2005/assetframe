/* eslint-disable camelcase */
// Drop the dead `billing_subscriptions` table. It mapped Lemon Squeezy subscriptions to Clerk
// users; under Clerk Billing nothing writes to it (Clerk is the source of truth for Pro, mirrored
// onto publicMetadata.subscribed by the billing webhook). Removing it so there are no stray
// "subscriptions" left in Neon after the migration off Lemon Squeezy.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`drop table if exists billing_subscriptions;`);
};

// Reversible: recreate the original shape (empty) if rolled back.
exports.down = (pgm) => {
  pgm.sql(`
    create table if not exists billing_subscriptions (
      subscription_id text primary key,
      ls_customer_id  text,
      clerk_user_id   text not null,
      status          text,
      updated_at      text,
      created_at      timestamptz not null default now()
    );
    create index if not exists billing_subscriptions_user_idx     on billing_subscriptions (clerk_user_id);
    create index if not exists billing_subscriptions_customer_idx on billing_subscriptions (ls_customer_id);
  `);
};
