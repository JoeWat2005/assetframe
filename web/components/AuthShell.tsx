import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, LineChart, Lock } from "lucide-react";
import { SITE } from "@/site.config";

// Split layout shared by /sign-in and /sign-up: a navy brand panel (desktop) next
// to the centred Clerk widget. The Clerk card carries the logo via the global
// appearance set in layout.tsx.
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] md:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-navy p-10 text-white md:flex">
        <Link href="/" className="inline-flex">
          <Image src="/logo-white.png" alt={SITE.brand} width={160} height={32} className="h-7 w-auto" />
        </Link>
        <div>
          <h2 className="max-w-sm text-2xl font-bold leading-snug">
            Next-session market intelligence, scored after the fact.
          </h2>
          <ul className="mt-6 flex flex-col gap-3 text-sm text-[#c9d6e8]">
            <li className="flex items-center gap-2"><ShieldCheck className="size-4" /> Free one-page Snapshots, instantly</li>
            <li className="flex items-center gap-2"><LineChart className="size-4" /> A public, scored track record</li>
            <li className="flex items-center gap-2"><Lock className="size-4" /> Pro reports with the full outcome ledger</li>
          </ul>
        </div>
        <p className="text-xs text-[#7e93b3]">{SITE.brand} publishes general market research, not personal advice.</p>
      </div>

      <div className="flex items-center justify-center bg-bg px-5 py-12">
        {children}
      </div>
    </div>
  );
}
