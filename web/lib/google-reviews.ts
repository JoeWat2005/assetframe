import "server-only";
import { unstable_cache } from "next/cache";

// Google Business reviews via the Places API (New). Configured with GOOGLE_MAPS_API_KEY
// (Places API enabled + billing) and GOOGLE_PLACE_ID (the business Place ID). Returns null
// when unconfigured or on error, so the UI hides cleanly. Note: the Places API returns up
// to ~5 reviews, not selectable, and requires Google attribution on display.

export type GoogleReview = {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  uri?: string;
};
export type GooglePlaceReviews = {
  rating: number | null;
  total: number;
  reviews: GoogleReview[];
  placeUri: string | null;
};

const KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const PLACE_ID = process.env.GOOGLE_PLACE_ID || "";
export const googleReviewsConfigured = Boolean(KEY && PLACE_ID);

type RawReview = {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  authorAttribution?: { displayName?: string; uri?: string };
};
type RawPlace = { rating?: number; userRatingCount?: number; googleMapsUri?: string; reviews?: RawReview[] };

async function _fetch(): Promise<GooglePlaceReviews | null> {
  if (!KEY || !PLACE_ID) return null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE_ID)}`, {
      headers: {
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
      },
    });
    if (!res.ok) return null;
    const d = (await res.json()) as RawPlace;
    const reviews: GoogleReview[] = (Array.isArray(d.reviews) ? d.reviews : [])
      .map((r) => ({
        author: r.authorAttribution?.displayName ?? "Google user",
        rating: Number(r.rating) || 0,
        text: r.text?.text ?? r.originalText?.text ?? "",
        relativeTime: r.relativePublishTimeDescription ?? "",
        uri: r.authorAttribution?.uri,
      }))
      .filter((r) => r.text.trim().length > 0);
    return {
      rating: d.rating != null ? Number(d.rating) : null,
      total: Number(d.userRatingCount) || 0,
      reviews,
      placeUri: d.googleMapsUri ?? null,
    };
  } catch {
    return null;
  }
}

// Fetch at most once a day (Places API has per-call cost + ToS limits on caching review
// content). We never persist reviews to our own store.
export const getGoogleReviews = unstable_cache(_fetch, ["google-reviews"], { revalidate: 86400, tags: ["reviews"] });
