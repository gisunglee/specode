/**
 * Next.js 미들웨어 — API 요청 로깅
 *
 * 📌 /api/* 경로로 들어오는 모든 요청을 터미널에 기록합니다.
 *    → GET /api/screens/7?foo=bar 형태로 출력
 *    → 운영 환경에서는 로깅하지 않습니다.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    const { method } = request;
    const path = request.nextUrl.pathname;
    const search = request.nextUrl.search;
    console.log(`→ ${method} ${path}${search}`);
  }
  return NextResponse.next();
}

/** /api 경로만 매칭 */
export const config = {
  matcher: "/api/:path*",
};
