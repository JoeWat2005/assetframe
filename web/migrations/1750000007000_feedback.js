 
// Feature-request / feedback inbox. One row per submission from the public /feedback form.
// Triaged in the admin dashboard. email + clerk_user_id are optional (anonymous feedback is
// allowed); user_agent is light context for spam triage, not analytics.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    create table if not exists feedback (
      id            bigserial primary key,
      created_at    timestamptz not null default now(),
      email         text,                              -- optional reply-to address
      clerk_user_id text,                              -- set if submitted while signed in
      category      text not null default 'general',  -- feature | bug | data | general | other
      message       text not null,
      status        text not null default 'new',      -- new | triaged | planned | done | declined
      admin_notes   text,
      user_agent    text
    );
    create index if not exists feedback_status_idx  on feedback (status);
    create index if not exists feedback_created_idx on feedback (created_at desc);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`drop table if exists feedback;`);
};
