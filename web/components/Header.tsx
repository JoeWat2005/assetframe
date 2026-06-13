"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import HeaderAuth from "@/components/HeaderAuth";
import { SITE } from "@/site.config";
import {
  NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/reports", label: "Reports" },
  { href: "/track-record", label: "Track record" },
  { href: "/pricing", label: "Pricing" },
];

// Brand link points at the canonical domain in production (never the *.vercel.app host).
const HOME = process.env.NODE_ENV === "production" ? SITE.url : "/";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur supports-backdrop-filter:bg-white/75">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-5">
        <a href={HOME} className="flex items-center" aria-label={SITE.brand}>
          <Image src="/logo.png" alt={SITE.brand} width={124} height={25} priority className="h-6 w-auto" />
        </a>

        {/* desktop */}
        <div className="hidden items-center gap-3 sm:flex">
          <NavigationMenu viewport={false}>
            <NavigationMenuList className="gap-1">
              {NAV.map((n) => (
                <NavigationMenuItem key={n.href}>
                  <NavigationMenuLink
                    asChild
                    active={isActive(n.href)}
                    className="px-3 py-1.5 text-sm font-semibold text-ink hover:text-navy data-active:bg-tile data-active:text-navy"
                  >
                    <Link href={n.href}>{n.label}</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          <div className="flex items-center gap-3 border-l border-line pl-3">
            <HeaderAuth />
          </div>
        </div>

        {/* mobile */}
        <div className="sm:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 gap-0">
              <SheetTitle className="px-4 pt-4 text-navy">Menu</SheetTitle>
              <nav className="mt-2 flex flex-col px-2">
                {NAV.map((n) => (
                  <SheetClose asChild key={n.href}>
                    <Link
                      href={n.href}
                      className={cn(
                        "rounded-lg px-3 py-2.5 text-sm font-semibold",
                        isActive(n.href) ? "bg-tile text-navy" : "text-ink hover:bg-muted"
                      )}
                    >
                      {n.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-3 flex items-center gap-3 border-t border-line px-4 pt-4">
                <HeaderAuth />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
