import { NextResponse } from "next/server";
import { listDemoPrincipals } from "@/lib/authboundry";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ providers: listDemoPrincipals() });
}
