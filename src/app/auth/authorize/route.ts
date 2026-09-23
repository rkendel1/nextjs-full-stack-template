import { NextRequest, NextResponse } from "next/server";
import { decideCapability } from "@/lib/authboundry";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { capability?: string };
  const decision = await decideCapability({
    capability: body.capability ?? "",
    sessionId: request.cookies.get(SESSION_COOKIE_NAME)?.value,
    operationInput: {},
  });

  return NextResponse.json(
    { allowed: decision.allowed, policy: decision.policy, reason: decision.reason },
    { status: decision.allowed ? 200 : 403 },
  );
}
