-- AssetFrame data-integrity reconciliation (READ-ONLY).
--
-- Run against any branch (prod = `main`, dev = `development`) to detect drift between
-- the three coupled stores — Neon (this DB), R2 (report files, referenced here by key),
-- and the engine's append-only ledger on the box (the source of truth that sync-db.mjs
-- upserts from). Every query here is a pure SELECT; it changes nothing.
--
-- Healthy launch state: every count in PART 1 is 0. Non-zero rows are listed by the
-- detail queries in PART 2 so you can trace the offending report_id.
--
-- Cross-store checks SQL alone cannot make (run these out of band):
--   * Neon edition key  -> R2 object exists      (orphaned/missing R2 files)
--   * Neon scored row    -> box ledger row exists  (ledger vs DB drift)
--   * box ledger row      -> Neon scored row exists  (un-synced scorings)
-- These belong in the admin health view + a periodic cron (F7); this file is their SQL core.

-- ===========================================================================
-- PART 1 — one-glance health snapshot (all values should be "0" except rows: *)
-- ===========================================================================
SELECT 'rows: editions'                      AS metric, count(*)::text AS value FROM editions
UNION ALL SELECT 'rows: scored_results',      count(*)::text FROM scored_results
UNION ALL SELECT 'rows: open_calls',          count(*)::text FROM open_calls
UNION ALL SELECT 'rows: open_call_predictions', count(*)::text FROM open_call_predictions
-- Duplicate canonical keys (report_id must be unique per period in each table).
UNION ALL SELECT 'DUP edition.report_id',     count(*)::text FROM (SELECT report_id FROM editions       WHERE report_id IS NOT NULL GROUP BY report_id HAVING count(*) > 1) d
UNION ALL SELECT 'DUP scored.report_id',      count(*)::text FROM (SELECT report_id FROM scored_results WHERE report_id IS NOT NULL GROUP BY report_id HAVING count(*) > 1) d
UNION ALL SELECT 'DUP open_call.report_id',   count(*)::text FROM (SELECT report_id FROM open_calls     WHERE report_id IS NOT NULL GROUP BY report_id HAVING count(*) > 1) d
-- A published edition with no report_id can't join its open_calls/scored rows (cadence-aware join key).
UNION ALL SELECT 'NULL edition.report_id',    count(*)::text FROM editions WHERE report_id IS NULL
-- Track-record rows pointing at an edition that isn't here (orphaned history).
UNION ALL SELECT 'scored w/o edition',        count(*)::text FROM scored_results sr WHERE NOT EXISTS (SELECT 1 FROM editions e WHERE e.report_id = sr.report_id)
UNION ALL SELECT 'open_call w/o edition',     count(*)::text FROM open_calls oc     WHERE NOT EXISTS (SELECT 1 FROM editions e WHERE e.report_id = oc.report_id)
-- Predictions whose parent open_call vanished (cascade should prevent this).
UNION ALL SELECT 'prediction w/o open_call',  count(*)::text FROM open_call_predictions p WHERE NOT EXISTS (SELECT 1 FROM open_calls oc WHERE oc.report_id = p.report_id)
-- Partial publishes: a visible/Pro edition missing the R2 key the page needs (dead link / 404).
UNION ALL SELECT 'visible edition w/o free_html_key', count(*)::text FROM editions WHERE hidden = false AND (free_html_key IS NULL OR free_html_key = '')
UNION ALL SELECT 'has_pro edition w/o pro_html_key',  count(*)::text FROM editions WHERE has_pro = true  AND (pro_html_key  IS NULL OR pro_html_key  = '')
ORDER BY metric;

-- ===========================================================================
-- PART 2 — detail rows for any non-zero count above (uncomment what you need)
-- ===========================================================================
-- Orphaned scored history (no matching edition):
--   SELECT sr.report_id, sr.instrument, sr.window_end FROM scored_results sr
--   WHERE NOT EXISTS (SELECT 1 FROM editions e WHERE e.report_id = sr.report_id) ORDER BY sr.report_id;
--
-- Orphaned open calls:
--   SELECT oc.report_id, oc.instrument FROM open_calls oc
--   WHERE NOT EXISTS (SELECT 1 FROM editions e WHERE e.report_id = oc.report_id) ORDER BY oc.report_id;
--
-- Visible editions missing their free HTML key (would 404 on the public site):
--   SELECT id, report_date, slug, instrument FROM editions
--   WHERE hidden = false AND (free_html_key IS NULL OR free_html_key = '') ORDER BY report_date DESC;
--
-- Duplicate period report_ids (should never happen — unique index enforces it):
--   SELECT report_id, count(*) FROM scored_results WHERE report_id IS NOT NULL
--   GROUP BY report_id HAVING count(*) > 1;
