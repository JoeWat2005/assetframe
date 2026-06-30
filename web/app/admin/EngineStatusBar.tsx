import type { EngineState } from "@/lib/engine";
import type { ConsoleSource } from "@/lib/engine-box";
import PauseToggle from "./PauseToggle";

// Three INDEPENDENT signals, shown separately so "the box ran my command but says Offline" is no
// longer confusing:
//   1. Control plane — can we reach the box HTTP API over the tunnel? (commands work iff this is up)
//   2. Poller        — is the always-on poller process running? (scheduled + manual runs need it)
//   3. Automation    — is scheduled generation paused?
// `source` says which world we're in: "box" (live), "unreachable" (box down -> Neon fallback), "neon"
// (no control plane configured -> the legacy Neon heartbeat is the single online signal).

function fmtUtc(iso: string | null): string {
  return iso ? `${iso.replace("T", " ").slice(0, 16)} UTC` : "never";
}

type Tone = "green" | "red" | "amber" | "grey";
const TONES: Record<Tone, [string, string]> = {
  green: ["bg-[#dafbe1] text-[#1a7f37]", "bg-[#1a7f37]"],
  red: ["bg-[#ffebe9] text-[#cf222e]", "bg-[#cf222e]"],
  amber: ["bg-[#fff7e6] text-[#9a6700]", "bg-[#9a6700]"],
  grey: ["bg-tile text-[#57606a]", "bg-[#57606a]"],
};

function Pill({ label, value, tone }: { label?: string; value: string; tone: Tone }) {
  const [chip, dot] = TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${chip}`}>
      <span className={`size-2 rounded-full ${dot}`} />
      {label ? <span className="font-semibold opacity-70">{label}:</span> : null} {value}
    </span>
  );
}

export default function EngineStatusBar({
  engineState,
  source,
  warnings = [],
}: {
  engineState: EngineState;
  source: ConsoleSource;
  warnings?: string[];
}) {
  const reachable = source === "box";
  const unreachable = source === "unreachable";
  const legacy = source === "neon";
  const pollerActive = engineState.online;

  // The container goes red when the box is down, or (on the box) the poller is down, or (legacy) the
  // heartbeat is stale.
  const bad = unreachable || (!reachable && !pollerActive) || (reachable && !pollerActive);

  return (
    <div className={`rounded-xl px-4 py-3 ring-1 ${bad ? "bg-[#fff5f5] ring-[#cf222e]/40" : "bg-card ring-foreground/10"}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Control plane — only meaningful when configured (box / unreachable). */}
        {!legacy && (
          <Pill label="Control plane" value={reachable ? "Reachable" : "Unreachable"} tone={reachable ? "green" : "red"} />
        )}
        {/* Poller (or, in legacy mode, the single Engine online signal). */}
        {legacy ? (
          <Pill value={pollerActive ? "Online" : "Offline"} tone={pollerActive ? "green" : "red"} />
        ) : (
          <Pill
            label="Poller"
            value={reachable ? (pollerActive ? "Active" : "Down") : "Unknown"}
            tone={reachable ? (pollerActive ? "green" : "red") : "grey"}
          />
        )}
        {/* Automation pause state. */}
        <Pill
          label="Automation"
          value={engineState.automationPaused ? "Paused" : "Active"}
          tone={engineState.automationPaused ? "amber" : "green"}
        />

        {/* Live run badge — only when the poller is actually running (else current_run_id is stale). */}
        {engineState.currentRunId &&
          (reachable && pollerActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7e6] px-3 py-1 text-xs font-bold text-[#9a6700]">
              <span className="size-2 animate-pulse rounded-full bg-[#9a6700]" />
              Running: {engineState.currentRunId}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tile px-3 py-1 text-xs font-bold text-[#57606a]">
              <span className="size-2 rounded-full bg-[#57606a]" />
              Run {engineState.currentRunId} — last seen {fmtUtc(engineState.lastHeartbeatAt)}
            </span>
          ))}

        <span className="ml-auto">
          <PauseToggle paused={engineState.automationPaused} />
        </span>
      </div>

      {/* Source + last-seen line, so the operator always knows what they're looking at. */}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {reachable
          ? "Live from the box over the tunnel — Neon idle."
          : unreachable
            ? `Box control server unreachable — showing Neon's last snapshot${engineState.lastHeartbeatAt ? ` (last check-in ${fmtUtc(engineState.lastHeartbeatAt)})` : ""}.`
            : `Reading Neon (control plane not configured). Last heartbeat ${fmtUtc(engineState.lastHeartbeatAt)}.`}
      </p>

      {/* Actionable banner per bad state. */}
      {unreachable && (
        <p className="mt-1 text-xs text-[#cf222e]">
          Can&rsquo;t reach the box control server. The console shows Neon&rsquo;s last snapshot; the live schedule is
          unavailable and commands fall back to the ~30s queue. Check the tunnel + <b>assetframe-control</b> on the box.
        </p>
      )}
      {reachable && !pollerActive && (
        <p className="mt-1 text-xs text-[#cf222e]">
          The box is reachable but the <b>poller isn&rsquo;t running</b> — scheduled and manual runs won&rsquo;t execute.
          Use <b>Restart engine</b> in <b>Operate the box</b> below, then check <b>Fetch recent logs</b>.
        </p>
      )}
      {legacy && !pollerActive && (
        <p className="mt-1 text-xs text-[#cf222e]">
          The engine hasn&rsquo;t checked in — scheduled and manual runs won&rsquo;t execute until it&rsquo;s back. Open the
          manual&rsquo;s Troubleshooting, or use <b>Restart engine</b> in <b>Operate the box</b> below.
        </p>
      )}

      {/* Partial-read warnings from the box snapshot (a section failed to load on the box). */}
      {warnings.length > 0 && (
        <p className="mt-1 text-[11px] text-[#9a6700]">Box snapshot warnings — {warnings.join(" · ")}</p>
      )}
    </div>
  );
}
