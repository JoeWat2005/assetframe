// Pure, dependency-free filtering used by the reports browser. Kept separate from
// the data source (JSON today, Supabase later) so the UI never changes.
export type Filterable = {
  instrument: string;
  ticker: string;
  assetClass: string;
  bias: string;
  status: string;
};

export function filterEditions<T extends Filterable>(
  editions: T[],
  opts: { q?: string; assetClass?: string; status?: string }
): T[] {
  const q = (opts.q ?? "").trim().toLowerCase();
  const assetClass = opts.assetClass ?? "";
  const status = opts.status ?? "";

  return editions.filter((e) => {
    if (assetClass && e.assetClass !== assetClass) return false;
    if (status && e.status !== status) return false;
    if (q) {
      const haystack = `${e.instrument} ${e.ticker} ${e.assetClass} ${e.bias}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
