"use client";
import { useEffect } from "react";

// Records one view per edition per browser session (sessionStorage dedupe). Best-effort:
// any failure is swallowed. Renders nothing.
export default function ViewBeacon({ id }: { id: string }) {
  useEffect(() => {
    const key = `afv:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked — still send once per mount */
    }
    fetch("/api/report-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      keepalive: true,
    }).catch(() => {});
  }, [id]);
  return null;
}
