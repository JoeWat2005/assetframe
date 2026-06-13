// Next.js 16 renamed the `middleware` convention to `proxy`. Clerk attaches its
// auth context here so server components / route handlers can call auth()/currentUser().
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  // Run on everything except static files and Next internals; include API routes.
  matcher: ["/((?!_next|.*\\.[^/]+$).*)", "/(api|trpc)(.*)"],
};
