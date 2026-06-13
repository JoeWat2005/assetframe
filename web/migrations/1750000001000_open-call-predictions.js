/* eslint-disable camelcase */
// Normalise open-call predictions: replace the denormalised open_calls.predictions
// jsonb column with a child table (one row per sub-call P1..Pn), linked by report_id.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    alter table open_calls drop column if exists predictions;

    create table if not exists open_call_predictions (
      id         bigserial primary key,
      report_id  text not null references open_calls(report_id) on delete cascade,
      seq        int,
      pred_id    text,
      type       text,
      text       text,
      manual     boolean default false,
      expect     boolean,
      unique (report_id, pred_id)
    );
    create index if not exists ocp_report_idx on open_call_predictions (report_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    drop table if exists open_call_predictions;
    alter table open_calls add column if not exists predictions jsonb default '[]'::jsonb;
  `);
};
