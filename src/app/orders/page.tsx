import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";
import { AuthorizationTestButton } from "@/components/authorization-test-button";
import { CreateOrderForm } from "@/components/create-order-form";
import { OrderTable } from "@/components/order-table";
import { loadOrdersPageData } from "@/domain/orders/read";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const state = await loadOrdersPageData();

  return (
    <main className="pageShell">
      <section className="hero card">
        <div>
          <p className="eyebrow">Orders</p>
          <h1>Orders</h1>
          <p>The demo keeps durable order state, authorization evidence, and AppPort job state in FeltDB.</p>
        </div>
        <Link href="/" className="secondaryButton">
          Back Home
        </Link>
      </section>
      <AuthPanel />
      <CreateOrderForm />
      <AuthorizationTestButton />
      <OrderTable orders={state.orders} evidence={state.evidence} />
    </main>
  );
}
