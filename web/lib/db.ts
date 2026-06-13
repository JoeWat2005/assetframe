import "server-only";
import { neon } from "@neondatabase/serverless";

// Read whichever connection-string var is present (Vercel's Neon integration may
// prefix it). If none is set, sql is null and callers fall back to the JSON catalog.
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_DATABASE_URL ||
  process.env.STORAGE_POSTGRES_URL ||
  process.env.STORAGE_URL ||
  "";

export const dbConfigured = Boolean(url);
export const sql = url ? neon(url) : null;
