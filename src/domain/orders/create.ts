import { randomUUID } from "node:crypto";
import { getApplicationRuntime } from "@/lib/application";
import { decideCapability, persistAuthorizationEvidence } from "@/lib/authboundry";
import { DEFAULT_TENANT_ID } from "@/lib/constants";
import type {
  AuthorizationEvidenceRecord,
  CreateOrderInput,
  OrderActionResult,
  OrderRecord,
} from "@/domain/orders/types";

function normalizeInput(input: CreateOrderInput) {
  return {
    product: input.product.trim(),
    quantity: Number(input.quantity),
  };
}

export async function createOrder(input: CreateOrderInput, sessionId?: string | null) {
  const normalized = normalizeInput(input);
  if (!normalized.product) {
    throw new Error("Product is required.");
  }
  if (!Number.isInteger(normalized.quantity) || normalized.quantity <= 0) {
    throw new Error("Quantity must be a positive integer.");
  }

  const draft = await decideCapability({
    capability: "orders.create",
    sessionId,
    operationInput: normalized,
  });

  if (!draft.allowed) {
    const deniedEvidence = await persistAuthorizationEvidence({
      ...draft,
      effect: "not_performed",
    });

    return {
      authorization: "Denied",
      capability: draft.capability,
      effect: "Not performed",
      state: "FeltDB unchanged",
      evidence: deniedEvidence,
    } satisfies OrderActionResult;
  }

  const { application } = await getApplicationRuntime();
  const orderId = randomUUID();
  let jobId = "";
  const evidenceId = draft.id;
  const createdAt = new Date().toISOString();
  const order: OrderRecord = {
    id: orderId,
    tenant_id: DEFAULT_TENANT_ID,
    product: normalized.product,
    quantity: normalized.quantity,
    status: "queued",
    created_at: createdAt,
    created_by: draft.principal_id,
    authorization_id: evidenceId,
    job_id: "",
  };
  const evidence: AuthorizationEvidenceRecord = {
    ...draft,
    effect: "order.created",
    resource_id: orderId,
  };

  await application.transaction(async (tx) => {
    jobId = tx.queueJob({
      tenantId: DEFAULT_TENANT_ID,
      type: "orders.fulfill",
      payload: {
        orderId,
        product: normalized.product,
        quantity: normalized.quantity,
        createdBy: draft.principal_id,
      },
      maxAttempts: 3,
    });

    order.job_id = jobId;
    evidence.job_id = jobId;

    await tx.collection<OrderRecord>("Orders").insert(order, orderId);
    await tx.collection<AuthorizationEvidenceRecord>("AuthorizationEvidence").insert(
      evidence,
      evidenceId,
    );
  });

  await application.publish(
    "orders.created",
    {
      orderId,
      product: normalized.product,
      quantity: normalized.quantity,
      evidenceId,
      jobId,
    },
    DEFAULT_TENANT_ID,
  );

  return {
    authorization: "Allowed",
    capability: draft.capability,
    effect: "Order created",
    state: "Persisted to FeltDB",
    evidence,
    order,
    jobId,
  } satisfies OrderActionResult;
}
