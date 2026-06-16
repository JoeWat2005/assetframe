import type { Metadata } from "next";
import { getCatalog, getTrending } from "@/lib/content";
import { Hero } from "@/components/ui";
import ReportsBrowser from "@/components/ReportsBrowser";
import ReportCard from "@/components/ReportCard";

export const metadata: Metadata = {
  title: "Reports",
  description:
    "Browse AssetFrame's latest editions — a directional read and the key levels on stocks, crypto, FX and commodities, each graded against the market afterwards.",
  alternates: { canonical: "/reports" },
};

// Catalog changes only when an edition is published — cache + background-revalidate.
export const revalidate = 300;

export default async function ReportsPage() {
  const [editions, trending] = await Promise.all([getCatalog(), getTrending()]);
  // Only show the rail once there's a meaningful signal and enough catalog to make it a
  // genuine "popular" subset (not just every report echoed back).
  const showTrending = trending.length >= 3 && editions.length > trending.length;
  return (
    <>
      <Hero title="Reports" tag="Every published edition. Open one to read the Snapshot, or unlock the full Pro report." />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-5">
        {editions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No editions published yet.</p>
        ) : (
          <>
            {showTrending && (
              <section className="mb-8" aria-labelledby="trending-heading">
                <h2 id="trending-heading" className="mb-3 text-lg font-bold text-navy">Popular this week</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {trending.slice(0, 3).map((e) => (
                    <ReportCard key={`${e.date}/${e.slug}`} e={e} animate={false} />
                  ))}
                </div>
              </section>
            )}
            <ReportsBrowser editions={editions} />
          </>
        )}
      </div>
    </>
  );
}
