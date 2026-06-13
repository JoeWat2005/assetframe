import { Skeleton } from "@/components/ui/skeleton";

export function HeroSkeleton() {
  return (
    <section className="bg-navy">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-5 sm:py-14">
        <Skeleton className="h-9 w-56 bg-white/15" />
        <Skeleton className="mt-3 h-5 w-80 max-w-[80%] bg-white/10" />
      </div>
    </section>
  );
}

export function StatsSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-white p-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between border-b border-line p-3 last:border-0">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <>
      <HeroSkeleton />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <StatsSkeleton />
        <div className="mt-6">
          <RowsSkeleton />
        </div>
      </div>
    </>
  );
}

export function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-9 w-64" />
      <Skeleton className="mt-2 h-4 w-40" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-6 h-32 w-full rounded-xl" />
      <Skeleton className="mt-4 h-40 w-full rounded-xl" />
    </div>
  );
}
