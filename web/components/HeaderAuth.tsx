"use client";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function HeaderAuth() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return <div className="h-8 w-20" aria-hidden />;

  if (isSignedIn) {
    return (
      <>
        <Link href="/account" className="text-sm font-semibold text-ink hover:text-navy">
          Account
        </Link>
        <UserButton />
      </>
    );
  }
  // Route to the branded /sign-in page (AuthShell) rather than the plain modal.
  return (
    <Button asChild size="sm">
      <Link href="/sign-in">Sign in</Link>
    </Button>
  );
}
