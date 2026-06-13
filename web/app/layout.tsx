import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LemonScript from "@/components/LemonScript";
import { SITE } from "@/site.config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SITE.brand} — ${SITE.tagline}`, template: `%s — ${SITE.brand}` },
  description:
    "Pre-session market research and decision support: a free Snapshot and a full Pro report " +
    "for each instrument, with every call scored against the tape afterwards. Not personal advice.",
  metadataBase: new URL(SITE.url),
  openGraph: { title: SITE.brand, description: SITE.tagline, type: "website" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        <body
          className="flex min-h-full flex-col"
          style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif' }}
        >
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <LemonScript />
        </body>
      </html>
    </ClerkProvider>
  );
}
