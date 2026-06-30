import "server-only";
import { boxStatus, controlConfigured } from "./control-client";
import { neonEngineState, getGenerationRequests, getEngineRuns, getEngineCommands } from "./engine";
import type { EngineState, EngineRun, EngineRunResults, GenerationRequest, EngineCommand } from "./engine-types";

// THE admin engine console, with ONE box round-trip and an explicit source so the dashboard always
// knows what it's looking at:
//   - "box":         live from the box /status over the Cloudflare Tunnel (Neon can sleep).
//   - "unreachable": the control plane is configured but the box didn't answer -> Neon fallback.
//   - "neon":        no control plane configured at all -> Neon (the legacy path).
// Box snapshot shape: control_server.snapshot(). On the box path, partial-read errors the snapshot
// reports (state_error/runs_error/...) are surfaced as `warnings` so a degraded read is visible.

export type ScheduleRow = {
  id: string;
  assetClass: string;
  cadence: string;
  dueNow: boolean;
  nextDueAt: string | null; // ISO, or null if not due within the horizon
};

export type ConsoleSource = "box" | "unreachable" | "neon";

export type EngineConsole = {
  source: ConsoleSource;
  controlConfigured: boolean; // whether the box control plane env is set (box or unreachable)
  state: EngineState;
  requests: GenerationRequest[];
  runs: EngineRun[];
  commands: EngineCommand[];
  schedule: ScheduleRow[];
  warnings: string[];
};

const s = (v: unknown): string => (v == null ? "" : String(v));
// Box ISO timestamp -> "YYYY-MM-DD HH:MM" UTC, matching the Neon readers' to_char format.
const ts = (v: unknown): string => (v == null ? "" : String(v).replace("T", " ").slice(0, 16));
const rows = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Record<string, unknown>[]) : [];

// The snapshot's per-section error keys (control_server.snapshot sets these on a partial failure).
const SNAP_ERROR_KEYS = ["state_error", "runs_error", "requests_error", "commands_error", "schedule_error"];

export async function getEngineConsole(): Promise<EngineConsole> {
  const configured = controlConfigured();
  const snap = configured ? await boxStatus() : null;

  // --- Fallback: box unreachable (configured but no answer) OR no control plane at all -> read Neon.
  if (!snap) {
    const [state, requests, runs, commands] = await Promise.all([
      neonEngineState(),
      getGenerationRequests(),
      getEngineRuns(),
      getEngineCommands(),
    ]);
    return {
      source: configured ? "unreachable" : "neon",
      controlConfigured: configured,
      state,
      requests,
      runs,
      commands,
      schedule: [], // the per-asset schedule is computed on the box only
      warnings: [],
    };
  }

  // --- Live from the box.
  const state: EngineState = {
    automationPaused: Boolean(snap.paused),
    lastHeartbeatAt: snap.last_heartbeat_at == null ? null : s(snap.last_heartbeat_at),
    currentRunId: snap.current_run_id == null ? null : s(snap.current_run_id),
    updatedAt: snap.now == null ? null : s(snap.now),
    online: Boolean(snap.online),
  };

  const requests: GenerationRequest[] = rows(snap.requests).map((r) => ({
    id: s(r.id), requestedBy: s(r.requested_by), scope: r.scope ?? null, status: s(r.status),
    cancelRequested: Boolean(r.cancel_requested), runId: s(r.run_id), error: s(r.error),
    createdAt: ts(r.created_at), startedAt: ts(r.started_at), finishedAt: ts(r.finished_at),
  }));

  const runsList: EngineRun[] = rows(snap.runs).map((r) => ({
    id: s(r.id), trigger: s(r.trigger), scope: r.scope ?? null, status: s(r.status),
    results: (r.results as EngineRunResults | null) ?? null, errors: s(r.errors), logExcerpt: s(r.log_excerpt),
    startedAt: ts(r.started_at), finishedAt: ts(r.finished_at),
  }));

  // Box command jobs (the HTTP control log). No requestedBy/cancel on a box job; result + log map across.
  const commands: EngineCommand[] = rows(snap.commands).map((c) => ({
    id: s(c.id), command: s(c.command), args: c.args ?? null, status: s(c.status),
    requestedBy: "", cancelRequested: false, result: s(c.result), logExcerpt: s(c.log),
    createdAt: ts(c.created_at), startedAt: "", finishedAt: ts(c.finished_at),
  }));

  const schedule: ScheduleRow[] = rows(snap.schedule).map((a) => ({
    id: s(a.id), assetClass: s(a.asset_class), cadence: s(a.cadence),
    dueNow: Boolean(a.due_now), nextDueAt: a.next_due_at == null ? null : s(a.next_due_at),
  }));

  const warnings = SNAP_ERROR_KEYS
    .filter((k) => typeof snap[k] === "string")
    .map((k) => `${k.replace("_error", "")}: ${s(snap[k])}`);

  return { source: "box", controlConfigured: configured, state, requests, runs: runsList, commands, schedule, warnings };
}
