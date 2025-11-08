import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const target = base ? `${base}/api/docs` : "/api/openapi.json"; // fallback to JSON if base not set
  // Use 307 to preserve method
  return NextResponse.redirect(target, { status: 307 });
}
