import Link from "next/link";
import { Hero } from "@/components/ui";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <Hero title="Page not found" tag="That page doesn't exist — or it moved." />
      <div className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-sm text-muted-foreground">
          The link may be broken, or a report may have been unpublished. Try one of these instead.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/reports">Browse reports</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
