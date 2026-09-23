import Link from "next/link";
import { cookies } from "next/headers";
import { AuthorizationTestButton } from "@/components/authorization-test-button";
import { AuthPanel } from "@/components/auth-panel";
import { getApplicationRuntime } from "@/lib/application";
import { buildProjection } from "@/lib/authboundry";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { loadOrdersPageData } from "@/domain/orders/read";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const [runtime, projection, state] = await Promise.all([
    getApplicationRuntime(),
    buildProjection(sessionId),
    loadOrdersPageData(),
  ]);
  const overview = runtime.application.overview() as { state: { runtime: { mode: string } } };

  return (
    <main className="pageShell">
      <section className="hero card">
        <div>
          <p className="eyebrow">FeltDB Application Starter</p>
          <h1>FeltDB Full-Stack Next.js Starter</h1>
          <p>
            FeltDB is the durable application state authority. AppPort defines the runtime boundary, AppPort Services
            queue durable jobs, AuthBoundry projects the authority context, and Runora verifies the stack end-to-end.
          </p>
        </div>
        <div className="buttonRow">
          <Link href="/orders" className="primaryButton">
            View Orders
          </Link>
          <Link href="/orders#create-order" className="secondaryButton">
            Create Order
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>System status</h2>
        <dl className="statusList">
          <div>
            <dt>Application state</dt>
            <dd>Connected ({String(overview.state.runtime.mode)})</dd>
          </div>
          <div>
            <dt>Authorization</dt>
            <dd>Active ({projection.authenticated ? projection.principal?.id : "anonymous"})</dd>
          </div>
          <div>
            <dt>AppPort</dt>
            <dd>Active ({runtime.contract.capabilities.join(", ")})</dd>
          </div>
          <div>
            <dt>Services</dt>
            <dd>Active ({runtime.application.plan.capabilities.join(", ")})</dd>
          </div>
          <div>
            <dt>Orders</dt>
            <dd>{state.orders.length}</dd>
          </div>
          <div>
            <dt>Queued jobs</dt>
            <dd>{state.jobs.length}</dd>
          </div>
        </dl>
      </section>

      <AuthPanel />
      <AuthorizationTestButton />
    </main>
  );
}
