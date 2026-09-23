import { NextResponse } from "next/server";
import { createDemoSession } from "@/lib/authboundry";
import { createOrder } from "@/domain/orders/create";

export const runtime = "nodejs";

export async function POST() {
  const session = await createDemoSession("demo.viewer");
  const result = await createOrder({ product: "Unauthorized Order", quantity: 1 }, session.id);
  return NextResponse.json(result, { status: result.authorization === "Allowed" ? 200 : 403 });
}
