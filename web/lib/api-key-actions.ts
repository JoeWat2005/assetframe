"use server";
import { auth } from "@clerk/nextjs/server";
import { getActiveApiKey, regenerateApiKey, revokeActiveApiKey } from "./api-keys";

// --- Result shapes -----------------------------------------------------------

export type ApiKeyStatus = {
  hasKey: false;
} | {
  hasKey: true;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

type RegenerateResult =
  | { ok: true; key: string }
  | { ok: false; error: string };

type RevokeResult =
  | { ok: true }
  | { ok: false; error: string };

// --- Helpers -----------------------------------------------------------------

async function requireUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

// --- Actions -----------------------------------------------------------------

/**
 * Fetch the current user's API key status (masked — never returns the full key).
 */
export async function getMyApiKeyStatus(): Promise<ApiKeyStatus> {
  const userId = await requireUserId();
  if (!userId) return { hasKey: false };

  const record = await getActiveApiKey(userId);
  if (!record) return { hasKey: false };

  return {
    hasKey: true,
    prefix: record.key_prefix,
    createdAt: record.created_at,
    lastUsedAt: record.last_used_at,
  };
}

/**
 * Generate a new key (or regenerate — revoke the old one first) for the current user.
 * Returns the FULL key exactly once; it is never stored and never returned again.
 */
export async function regenerateMyApiKey(): Promise<RegenerateResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sign in to manage API keys." };

  try {
    const created = await regenerateApiKey(userId, "Default");
    return { ok: true, key: created.key };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not generate key." };
  }
}

/**
 * Revoke the current user's active API key.
 */
export async function revokeMyApiKey(): Promise<RevokeResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sign in to manage API keys." };

  try {
    await revokeActiveApiKey(userId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not revoke key." };
  }
}
