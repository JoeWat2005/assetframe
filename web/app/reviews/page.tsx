import type { Metadata } from "next";
import { Star } from "lucide-react";
import { Hero } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getGoogleReviews } from "@/lib/google-reviews";
import { SITE } from "@/site.config";

export const metadata: Metadata = {
  title: "Reviews",
  description: "What people say about AssetFrame — verified Google reviews.",
  alternates: { canonical: "/reviews" },
};

export const revalidate = 86400;

function Stars({ value, className = "" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`inline-flex ${className}`} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className="size-4" fill={i <= full ? "#f5a623" : "none"} stroke={i <= full ? "#f5a623" : "#c9ced4"} aria-hidden="true" />
      ))}
    </span>
  );
}

export default async function ReviewsPage() {
  const data = await getGoogleReviews();
  const hasReviews = !!data && data.reviews.length > 0;

  return (
    <>
      <Hero title="Reviews" tag="What people say about AssetFrame." />
      <div className="mx-auto max-w-3xl px-5 py-10">
        {hasReviews ? (
          <>
            <div className="flex flex-wrap items-center gap-3" data-animate="up">
              {data!.rating != null && (
                <>
                  <span className="text-3xl font-extrabold text-navy">{data!.rating.toFixed(1)}</span>
                  <Stars value={data!.rating} />
                </>
              )}
              <span className="text-sm text-muted-foreground">
                {data!.total} Google review{data!.total === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2" data-animate="up">
              {data!.reviews.map((r, i) => (
                <Card key={i}>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-navy">{r.author}</span>
                      <Stars value={r.rating} />
                    </div>
                    <p className="text-sm text-ink">{r.text}</p>
                    {r.relativeTime && <p className="text-xs text-muted-foreground">{r.relativeTime}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground" data-animate="up">
              <span>Reviews sourced from Google.</span>
              {data!.placeUri && (
                <Button asChild size="sm" variant="outline">
                  <a href={data!.placeUri} target="_blank" rel="noopener noreferrer">See all reviews on Google</a>
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-line bg-white p-8 text-center" data-animate="up">
            <div className="text-lg font-bold text-navy">Reviews are on the way</div>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              We&rsquo;re just getting started. As people use AssetFrame, their Google reviews will show here.
              Used us already? We&rsquo;d love your honest review.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline"><a href={`mailto:${SITE.contactEmail}`}>Share your experience</a></Button>
            </div>
          </div>
        )}

        <p className="mt-8 text-xs text-muted-foreground" data-animate="up">{SITE.disclaimer}</p>
      </div>
    </>
  );
}
