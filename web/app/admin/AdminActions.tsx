"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPro, revalidateContent } from "./actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Result = { ok: boolean; message: string };

export default function AdminActions() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      try {
        const r = await fn();
        setMsg(r);
        if (r.ok) router.refresh();
      } catch {
        setMsg({ ok: false, message: "Action failed — not authorized?" });
      }
    });

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Manage access</CardTitle>
        <CardDescription>Grant or revoke Pro for a member by email, or refresh published content.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@email.com"
            className="sm:max-w-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={pending || !email} onClick={() => run(() => setPro(email, true))}>
              Grant Pro
            </Button>
            <Button size="sm" variant="outline" disabled={pending || !email} onClick={() => run(() => setPro(email, false))}>
              Revoke Pro
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(revalidateContent)}>
            Revalidate content
          </Button>
          {msg && (
            <span className={`text-sm ${msg.ok ? "text-[#1a7f37]" : "text-[#cf222e]"}`}>{msg.message}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
