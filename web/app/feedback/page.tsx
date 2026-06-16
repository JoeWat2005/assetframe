import type { Metadata } from "next";
import { Hero } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import FeedbackForm from "./FeedbackForm";
import { SITE } from "@/site.config";

export const metadata: Metadata = {
  title: "Feedback & feature requests",
  description: "Tell AssetFrame what to build, fix, or cover next. We read every submission.",
  alternates: { canonical: "/feedback" },
};

export default function FeedbackPage() {
  return (
    <>
      <Hero
        title="Feedback & feature requests"
        tag="Tell us what to build, fix, or cover next — we read every submission."
      />
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Card data-animate="up">
          <CardContent>
            <FeedbackForm />
          </CardContent>
        </Card>
        <p className="mt-6 text-sm text-muted-foreground" data-animate="up">
          Prefer email? Reach us at{" "}
          <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-navy underline underline-offset-2">
            {SITE.contactEmail}
          </a>
          .
        </p>
      </div>
    </>
  );
}
