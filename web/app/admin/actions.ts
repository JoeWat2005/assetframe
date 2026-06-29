// Barrel for the admin Server Actions. PLAIN module (NO "use server") — it only re-exports the
// Server Functions defined in the domain modules below. Each domain module carries its own
// "use server" directive, so re-exporting them here preserves the server-reference (verified
// against next/dist/docs use-server). Importers keep using `import { ... } from "./actions"`.
export type { Result } from "@/lib/admin-types";
export { setPro, setMyAdminTier } from "./admin-billing";
export { setEditionHidden, revalidateContent, clearCatalog } from "./admin-content";
export { setFeedbackStatus } from "./admin-feedback";
export { searchMembers } from "./admin-members";
export { requestGeneration, setAutomationPaused, cancelGenerationRequest } from "./admin-engine-generation";
export { sendEngineCommand, cancelEngineCommand } from "./admin-engine-commands";
export { upsertEngineAsset, deleteEngineAsset, setAssetEnabled, setRequireApproval } from "./admin-assets";
export { clearBacktestResults, setBacktestManualOutcome } from "./admin-backtest";
