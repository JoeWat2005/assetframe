"use client";
import Link from "next/link";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";

export default function HeaderAuth() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return <div className="h-7 w-20" aria-hidden />;

  if (isSignedIn) {
    return (
      <>
        <Link href="/account" className="text-sm font-semibold text-muted hover:text-navy">
          Account
        </Link>
        <UserButton />
      </>
    );
  }
  return (
    <SignInButton mode="modal">
      <button className="rounded-lg bg-navy px-3 py-1.5 text-[13px] font-bold text-white hover:bg-navy-700">
        Sign in
      </button>
    </SignInButton>
  );
}
