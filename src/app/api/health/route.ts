import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Quick deploy check: serverless needs Upstash or sessions break across invocations.
 * GET returns whether Redis env is present (does not expose secrets).
 */
export async function GET() {
  const hasRedis = Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
  return NextResponse.json(
    {
      ok: true,
      sessionStore: hasRedis ? "redis" : "memory",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
