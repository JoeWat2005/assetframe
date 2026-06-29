// Internal admin guard shared by every admin Server Action. PLAIN server module (NO "use server")
// — this is not a client-callable action, just a helper the action modules import.
import { getEntitlement } from "@/lib/entitlements";

// Every action re-checks admin server-side — never trust the client to gate this.
export async function requireAdmin() {
  const ent = await getEntitlement();
  if (!ent.admin) throw new Error("Not authorized");
  return ent;
}
