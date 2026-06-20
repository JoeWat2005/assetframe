import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Native <details> styled to match the admin Card — collapsed by default, zero client JS. Used to
// progressively disclose advanced / rarely-needed zones (Operate the box, the bottom Reference
// section) so the daily loop is the only thing expanded on load. Works server-side; the chevron
// rotates via the `open` attribute.
export default function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
  className,
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className={cn("group/cs mt-4 scroll-mt-24 overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10", className)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="font-heading text-base font-medium leading-snug">{title}</span>
          {description && <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open/cs:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
