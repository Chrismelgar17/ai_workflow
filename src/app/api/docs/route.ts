import { NextResponse } from "next/server";

// Prevent static prerendering so we can construct runtime URL
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Prefer explicit backend base; fallback to same-origin openapi JSON
  const base = process.env.NEXT_PUBLIC_API_URL;
  const targetAbsolute = base
    ? new URL('/api/docs', base).toString()
    : new URL('/api/openapi.json', request.url).toString();
  return NextResponse.redirect(targetAbsolute, { status: 307 });
}
