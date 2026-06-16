"use client";
import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFollow } from "@/lib/social-actions";
import { Button } from "@/components/ui/button";

// Follow / unfollow an instrument. Optimistic toggle; reverts on error. Signed-out users get
// a sign-in link instead.
export default function FollowButton({
  symbol, instrument, initialFollowing, signedIn, signInHref,
}: {
  symbol: string; instrument: string; initialFollowing: boolean; signedIn: boolean; signInHref: string;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <Button asChild size="sm" variant="outline">
        <a href={signInHref}><Star className="mr-1.5 size-4" aria-hidden="true" /> Follow</a>
      </Button>
    );
  }

  const onClick = () => {
    setMsg(null);
    const next = !following;
    setFollowing(next);
    start(async () => {
      const r = await toggleFollow(symbol, instrument);
      if (!r.ok) { setFollowing(!next); setMsg(r.message ?? "Could not update."); }
      else setFollowing(r.following);
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant={following ? "default" : "outline"} onClick={onClick} disabled={pending} aria-pressed={following}>
        <Star className="mr-1.5 size-4" fill={following ? "currentColor" : "none"} aria-hidden="true" />
        {following ? "Following" : "Follow"}
      </Button>
      {msg && <span className="text-xs text-[#b91c1c]">{msg}</span>}
    </span>
  );
}
