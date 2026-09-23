import { randomUUID } from "node:crypto";
import type { AuthProjection } from "@authboundry/core";
import { actorCapabilities, loadApplicationContract, policyForCapability } from "@/lib/flow-contract";
import { getApplicationRuntime } from "@/lib/application";
import { DEFAULT_TENANT_ID } from "@/lib/constants";
import type { AuthorizationEvidenceRecord, AuthSessionRecord } from "@/domain/orders/types";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export interface DemoPrincipalOption {
  id: string;
  label: string;
  kind: string;
}

export interface AuthorizationDecisionDraft extends Record<string, unknown> {
  id: string;
  tenant_id: string;
  capability: string;
  allowed: boolean;
  policy: string;
  principal_id: string;
  principal_kind: string;
  session_id?: string | null;
  claims: Record<string, string>;
  delegation?: Record<string, unknown> | null;
  effect: string;
  reason: string;
  resource_id?: string;
  job_id?: string;
  input: Record<string, unknown>;
  created_at: string;
}

function nowIso() {
  return new Date().toISOString();
}

function isExpired(session: AuthSessionRecord) {
  return new Date(session.expires_at).getTime() <= Date.now();
}

export function listDemoPrincipals(): DemoPrincipalOption[] {
  const contract = loadApplicationContract();
  return Object.values(contract.actors).map((actor) => ({
    id: actor.id,
    label: actor.label,
    kind: actor.kind,
  }));
}

export async function getSessionRecord(sessionId?: string | null) {
  if (!sessionId) {
    return null;
  }

  const { application } = await getApplicationRuntime();
  const sessions = application.state.collection<AuthSessionRecord>("AuthSessions");
  const session = await sessions.get(sessionId);

  if (!session || isExpired(session)) {
    return null;
  }

  return session;
}

export async function createDemoSession(actorId: string) {
  const contract = loadApplicationContract();
  const actor = contract.actors[actorId];
  if (!actor) {
    throw new Error(`Unknown actor '${actorId}'`);
  }

  const session: AuthSessionRecord = {
    id: randomUUID(),
    tenant_id: DEFAULT_TENANT_ID,
    principal_id: actor.id,
    principal_kind: actor.kind,
    claims: actor.claims,
    delegation: null,
    created_at: nowIso(),
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };

  const { application } = await getApplicationRuntime();
  await application.state.collection<AuthSessionRecord>("AuthSessions").insert(session, session.id);
  return session;
}

export async function buildProjection(sessionId?: string | null): Promise<AuthProjection> {
  const session = await getSessionRecord(sessionId);
  if (!session) {
    return {
      authenticated: false,
      principal: null,
      tenant: null,
      claims: {},
      capabilities: [],
      session: null,
      delegation: null,
    };
  }

  const contract = loadApplicationContract();
  const actor = contract.actors[session.principal_id];
  const capabilities = actor ? actorCapabilities(contract, actor.id) : [];

  return {
    authenticated: true,
    principal: {
      id: session.principal_id,
      kind: session.principal_kind,
      label: actor?.label ?? session.principal_id,
    },
    tenant: { id: session.tenant_id },
    claims: session.claims,
    capabilities,
    session: { expires_at: Math.floor(new Date(session.expires_at).getTime() / 1000) },
    delegation: session.delegation ?? null,
  };
}

export async function decideCapability(input: {
  capability: string;
  sessionId?: string | null;
  operationInput: Record<string, unknown>;
}) {
  const projection = await buildProjection(input.sessionId);
  const contract = loadApplicationContract();
  const principalId = projection.principal?.id ?? "anonymous";
  const principalKind = projection.principal?.kind ?? "anonymous";
  const policy = projection.principal
    ? policyForCapability(contract, projection.principal.id, input.capability)
    : undefined;

  return {
    id: randomUUID(),
    tenant_id: projection.tenant?.id ?? DEFAULT_TENANT_ID,
    capability: input.capability,
    allowed: Boolean(policy),
    policy: policy?.policyName ?? "authorization.default.deny",
    principal_id: principalId,
    principal_kind: principalKind,
    session_id: input.sessionId ?? null,
    claims: projection.claims as Record<string, string>,
    delegation: (projection.delegation as Record<string, unknown> | null) ?? null,
    effect: policy ? "pending" : "not_performed",
    reason: policy
      ? `Authorized by ${policy.policyName}`
      : `No policy in feltdb.flow grants ${input.capability} to ${principalId}`,
    input: input.operationInput,
    created_at: nowIso(),
  } satisfies AuthorizationDecisionDraft;
}

export async function persistAuthorizationEvidence(draft: AuthorizationDecisionDraft) {
  const { application } = await getApplicationRuntime();
  const evidence = draft satisfies AuthorizationEvidenceRecord;
  await application.state
    .collection<AuthorizationEvidenceRecord>("AuthorizationEvidence")
    .insert(evidence, evidence.id);
  return evidence;
}
