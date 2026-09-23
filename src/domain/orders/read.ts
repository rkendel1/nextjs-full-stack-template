import { getApplicationRuntime } from "@/lib/application";
import { DEFAULT_TENANT_ID } from "@/lib/constants";
import type { AuthorizationEvidenceRecord, OrderRecord } from "@/domain/orders/types";

export async function listOrders() {
  const { application } = await getApplicationRuntime();
  const orders = await application.state.collection<OrderRecord>("Orders").list();
  return [...orders].sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export async function listAuthorizationEvidence(limit = 10) {
  const { application } = await getApplicationRuntime();
  const evidence = await application.state
    .collection<AuthorizationEvidenceRecord>("AuthorizationEvidence")
    .list();

  return [...evidence]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, limit);
}

export async function listQueuedJobs() {
  const { application } = await getApplicationRuntime();
  const jobs = await application.jobs.listJobs(DEFAULT_TENANT_ID);
  return [...jobs].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function loadOrdersPageData() {
  const [orders, evidence, jobs] = await Promise.all([
    listOrders(),
    listAuthorizationEvidence(),
    listQueuedJobs(),
  ]);

  return { orders, evidence, jobs };
}
