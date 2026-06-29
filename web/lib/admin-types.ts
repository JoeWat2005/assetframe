// Shared types for the admin Server Actions (the domain modules in app/admin/*).
// PLAIN module — no "use server" — so it can be imported by both the action modules and the barrel.

export type Result = { ok: boolean; message: string };

export type EngineScope = { all_due: true; as_of?: string } | { assets: string[]; as_of?: string };

export type AssetInput = {
  id: string; name: string; instrument: string; ticker: string; yahoo: string; eodhd?: string;
  assetClass: string; sessionProfile: string; cadence: string; timezone: string;
  rollUtc?: number; related?: string; forecastWindow?: string; publishPolicy?: string;
  reportTier?: string; enabled?: boolean;
  cadenceDay?: string; timeframes?: string[]; chartIntervals?: string[];
  includeFundamentals?: boolean | null; includeNews?: boolean; fundamentalsSource?: string;
};
