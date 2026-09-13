import { NextResponse } from "next/server";

export function middleware(request) {
  const response = NextResponse.next();
  const origin = request.headers.get("origin");
  const allowedOrigin = process.env.FRONTEND_ORIGIN;

  if (origin && allowedOrigin && origin === allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    response.headers.set("Vary", "Origin");
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
