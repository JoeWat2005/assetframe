import type { Metadata } from "next";
import { getCatalog } from "@/lib/content";
import { Hero } from "@/components/ui";
import ReportsBrowser from "@/components/ReportsBrowser";

export const metadata: Metadata = {
  title: "Reports",
  description:
    "Browse AssetFrame's latest editions — a directional read and the key levels on stocks, crypto, FX and commodities, each graded against the market afterwards.",
  alternates: { canonical: "/reports" },
};

// Catalog changes only when an edition is published — cache + background-revalidate.
export const revalidate = 300;

export default async function ReportsPage() {
  const editions = await getCatalog();
  return (
    <>
      <Hero title="Reports" tag="Every published edition. Open one to read the Snapshot, or unlock the full Pro report." />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-5">
        {editions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No editions published yet.</p>
        ) : (
          <ReportsBrowser editions={editions} />
        )}
      </div>
    </>
  );
}
