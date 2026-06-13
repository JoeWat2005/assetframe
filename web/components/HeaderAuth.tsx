"use client";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function HeaderAuth() {
  const { isSignedIn, isLoaded, user } = useUser();
  if (!isLoaded) return <div className="h-8 w-28" aria-hidden />;

  const subscribed = (user?.publicMetadata as { subscribed?: boolean } | undefined)?.subscribed === true;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {!subscribed && (
        <Button asChild size="sm">
          <Link href="/pricing">Get Pro</Link>
        </Button>
      )}
      {isSignedIn ? (
        <>
          <Link href="/account" className="text-sm font-semibold text-ink hover:text-navy">
            Account
          </Link>
          <UserButton />
        </>
      ) : (
        <Button asChild size="sm" variant="outline">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      )}
    </div>
  );
}
