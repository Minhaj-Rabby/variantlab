import { variantLabMiddleware } from "@variantlab/next";
import { type NextRequest, NextResponse } from "next/server";
import experiments from "./experiments.json";

// Note: Next.js middleware runs on the Edge runtime by default in
// Next 14 / 15 — explicitly setting `runtime = "edge"` here is a hard
// error. The Route Handler in `app/api/hello/route.ts` opts in
// explicitly to prove Edge compatibility at build time.

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const apply = variantLabMiddleware(experiments);

export default function middleware(req: NextRequest) {
  return apply(req, NextResponse.next());
}
