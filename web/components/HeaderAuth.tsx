"use client";
import Link from "next/link";
import { useUser, UserButton, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function HeaderAuth({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();
  if (!isLoaded) return <div className="h-8 w-20" aria-hidden />;

  // Mobile renders inside the Radix sheet, where a Clerk UserButton popover fights the
  // sheet's focus trap (the bug: tapping the avatar/Account did nothing). So show plain
  // rows that close the sheet on tap instead of the popover avatar.
  if (mobile) {
    const row = "rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-ink hover:bg-muted";
    if (isSignedIn) {
      return (
        <div className="flex flex-col">
          <Link href="/account" onClick={onNavigate} className={row}>Account</Link>
          <button
            type="button"
            onClick={() => { onNavigate?.(); void signOut({ redirectUrl: "/" }); }}
            className={row}
          >
            Sign out
          </button>
        </div>
      );
    }
    return (
      <Button asChild className="w-full">
        <Link href="/sign-in" onClick={onNavigate}>Sign in</Link>
      </Button>
    );
  }

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
  return (
    <Button asChild size="sm">
      <Link href="/sign-in">Sign in</Link>
    </Button>
  );
}
