import { NextRequest, NextResponse } from "next/server";
import { buildProjection, createDemoSession } from "@/lib/authboundry";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { actorId?: string };
    const session = await createDemoSession(body.actorId ?? "");
    const projection = await buildProjection(session.id);
    const response = NextResponse.json(projection);
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: session.id,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(session.expires_at),
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Sign in failed." },
      { status: 400 },
    );
  }
}
