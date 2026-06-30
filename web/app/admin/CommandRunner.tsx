"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendEngineCommand } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// One box command at a time: pick from the dropdown, read its one-line description, click Execute.
// Replaces the old wall of buttons. Each runs on the box over the tunnel and shows its REAL result
// inline (sendEngineCommand polls the box job); on box failure it falls back to the ~30s Neon queue.
// restart_poller/pull_latest now run on the control server itself, so they work even when the poller
// is down. Set config + the Danger zone stay as their own controls (BoxControls).
type Cmd = { id: string; label: string; desc: string; args?: Record<string, unknown>; confirm?: string };
const COMMANDS: Cmd[] = [
  { id: "tail_logs", label: "Fetch recent logs", args: { lines: 200 },
    desc: "Pull the latest ~200 engine log lines into the result + the command log below." },
  { id: "service_check", label: "Check services",
    desc: "Verify the box can reach Neon, R2 and Upstash." },
  { id: "run_maintenance", label: "Re-publish reports",
    desc: "Re-upload the latest reports to R2 + Neon. Use if a run generated but failed to publish." },
  { id: "run_scoring", label: "Score now",
    desc: "Grade any prediction windows that have closed into the ledger. Makes no new reports." },
  { id: "restart_poller", label: "Restart engine",
    desc: "Restart the poller process — e.g. to pick up a changed setting. A few seconds of downtime; works even if the poller is down.",
    confirm: "Restart the engine poller now? It relaunches within a few seconds." },
  { id: "pull_latest", label: "Deploy latest code",
    desc: "Pull the newest code from GitHub, reinstall deps, and restart the engine onto it.",
    confirm: "Deploy the latest code (git pull --ff-only), reinstall dependencies, and restart the engine onto it. Continue?" },
];

type Result = { ok: boolean; message: string };

export default function CommandRunner() {
  const router = useRouter();
  const [sel, setSel] = useState(COMMANDS[0].id);
  const [msg, setMsg] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const cmd = COMMANDS.find((c) => c.id === sel) ?? COMMANDS[0];

  const execute = () =>
    start(async () => {
      if (cmd.confirm && !window.confirm(cmd.confirm)) return;
      setMsg(null);
      try {
        const r = await sendEngineCommand(cmd.id, cmd.args);
        setMsg(r);
        if (r.ok) router.refresh();
      } catch {
        setMsg({ ok: false, message: "Action failed — not authorized?" });
      }
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Command</label>
          <Select value={sel} onValueChange={(v) => { setSel(v); setMsg(null); }}>
            <SelectTrigger aria-label="Command" className="w-full sm:w-[230px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>{COMMANDS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" disabled={pending} onClick={execute}>
          {pending ? "Running…" : "Execute"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{cmd.desc}</p>
      {msg && <span className={`text-sm ${msg.ok ? "text-[#1a7f37]" : "text-[#cf222e]"}`}>{msg.message}</span>}
    </div>
  );
}
