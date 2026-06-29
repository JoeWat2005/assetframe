 
// Engine operations tables — the contract between the web app and the Oracle Cloud VM that
// runs the Python engine. The VM has no inbound ports, so all coordination happens through
// these three Neon tables (the VM polls + writes; the web app reads + enqueues):
//   - generation_requests: a queue. The admin enqueues a row (status 'queued'); the engine
//     poller claims it, links it to an engine_runs row, and advances its status. cancel_requested
//     is a co-operative flag the engine checks (it can't be force-killed from here).
//   - engine_runs: the VM's run log — one row per scheduled or manual run, with a per-asset
//     results manifest and a tail of the run log. These are the "instance logs" the admin sees.
//   - engine_state: a singleton (id=1) the VM heartbeats into; automation_paused is the
//     daily-automation kill switch the admin toggles. `online` is derived from last_heartbeat_at.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    create table if not exists generation_requests (
      id               text primary key,
      requested_by     text,
      scope            jsonb not null,
      status           text not null default 'queued',
      cancel_requested boolean not null default false,
      run_id           text,
      error            text,
      created_at       timestamptz not null default now(),
      started_at       timestamptz,
      finished_at      timestamptz
    );
    create index if not exists generation_requests_status_created_idx
      on generation_requests (status, created_at);

    create table if not exists engine_runs (
      id           text primary key,
      trigger      text not null,
      scope        jsonb,
      status       text not null,
      results      jsonb,
      errors       text,
      log_excerpt  text,
      started_at   timestamptz not null default now(),
      finished_at  timestamptz
    );
    create index if not exists engine_runs_started_idx on engine_runs (started_at desc);

    create table if not exists engine_state (
      id                int primary key default 1,
      automation_paused boolean not null default false,
      last_heartbeat_at timestamptz,
      current_run_id    text,
      updated_at        timestamptz not null default now()
    );
    insert into engine_state (id) values (1) on conflict (id) do nothing;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    drop table if exists generation_requests;
    drop table if exists engine_runs;
    drop table if exists engine_state;
  `);
};
