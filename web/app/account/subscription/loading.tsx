import { HeroSkeleton } from "@/components/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <HeroSkeleton />
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </>
  );
}
