import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const backendOrigin = process.env.BACKEND_URL ?? "http://localhost:3080";

export async function proxy(request: NextRequest) {
  const backendUrl = new URL(request.nextUrl.pathname.replace(/^\/api/, "") || "/", backendOrigin);
  backendUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  const response = await fetch(backendUrl, {
    method: request.method,
    headers,
    body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export const config = {
  matcher: ["/api/:path*"],
};
