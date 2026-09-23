import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createOrder } from "@/domain/orders/create";
import { loadOrdersPageData } from "@/domain/orders/read";
import { closeApplicationRuntime, createApplicationRuntime } from "@/lib/application";
import { createDemoSession } from "@/lib/authboundry";

let dataPath = "";

async function resetRuntime() {
  await closeApplicationRuntime();
  if (dataPath) {
    await rm(dataPath, { recursive: true, force: true });
  }
  dataPath = await mkdtemp(path.join(os.tmpdir(), "felt-starter-"));
  process.env.FELTDB_PATH = dataPath;
}

describe("orders starter integration", () => {
  beforeEach(async () => {
    await resetRuntime();
  });

  afterEach(async () => {
    await closeApplicationRuntime();
  });

  it("persists an authorized order mutation and enqueues an AppPort job", async () => {
    const session = await createDemoSession("demo.order_manager");
    const result = await createOrder({ product: "Integration Order", quantity: 3 }, session.id);
    const state = await loadOrdersPageData();

    expect(result.authorization).toBe("Allowed");
    expect(result.order?.product).toBe("Integration Order");
    expect(result.jobId).toBeTruthy();
    expect(state.orders).toHaveLength(1);
    expect(state.orders[0]?.authorization_id).toBe(result.evidence.id);
    expect(state.jobs.some((job) => job.id === result.jobId && job.type === "orders.fulfill")).toBe(true);
    expect(state.evidence.some((entry) => entry.id === result.evidence.id && entry.allowed)).toBe(true);
  });

  it("fails closed for an unauthorized actor and leaves FeltDB order state unchanged", async () => {
    const session = await createDemoSession("demo.viewer");
    const result = await createOrder({ product: "Denied Order", quantity: 1 }, session.id);
    const state = await loadOrdersPageData();

    expect(result.authorization).toBe("Denied");
    expect(state.orders).toHaveLength(0);
    expect(state.jobs).toHaveLength(0);
    expect(state.evidence).toHaveLength(1);
    expect(state.evidence[0]).toMatchObject({
      allowed: false,
      capability: "orders.create",
      effect: "not_performed",
    });
  });

  it("retains durable state across runtime reinitialization", async () => {
    const session = await createDemoSession("demo.order_manager");
    const created = await createOrder({ product: "Restart Proof", quantity: 2 }, session.id);

    await closeApplicationRuntime();

    const runtime = await createApplicationRuntime({ dataPath });
    const orders = await runtime.application.state.collection("Orders").list();
    const evidence = await runtime.application.state
      .collection<{ id: string }>("AuthorizationEvidence")
      .list();

    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ product: "Restart Proof" });
    expect(evidence.some((entry) => entry.id === created.evidence.id)).toBe(true);

    await runtime.application.close();
  });
});
