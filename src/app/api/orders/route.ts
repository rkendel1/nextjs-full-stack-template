import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/domain/orders/create";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { product?: string; quantity?: number };
    const result = await createOrder(
      {
        product: body.product ?? "",
        quantity: Number(body.quantity ?? 0),
      },
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
    );

    return NextResponse.json(result, { status: result.authorization === "Allowed" ? 200 : 403 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create order." },
      { status: 400 },
    );
  }
}
