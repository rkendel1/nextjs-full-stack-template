import { NextRequest, NextResponse } from "next/server";
import { buildProjection } from "@/lib/authboundry";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const projection = await buildProjection(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  return NextResponse.json(projection, { status: projection.authenticated ? 200 : 401 });
}
