export interface OrderRecord extends Record<string, unknown> {
  id: string;
  tenant_id: string;
  product: string;
  quantity: number;
  status: "queued";
  created_at: string;
  created_by: string;
  authorization_id: string;
  job_id: string;
}

export interface AuthSessionRecord extends Record<string, unknown> {
  id: string;
  tenant_id: string;
  principal_id: string;
  principal_kind: string;
  claims: Record<string, string>;
  delegation?: Record<string, unknown> | null;
  created_at: string;
  expires_at: string;
}

export interface AuthorizationEvidenceRecord extends Record<string, unknown> {
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

export interface CreateOrderInput {
  product: string;
  quantity: number;
}

export interface OrderActionResult {
  authorization: "Allowed" | "Denied";
  capability: string;
  effect: string;
  state: string;
  evidence: AuthorizationEvidenceRecord;
  order?: OrderRecord;
  jobId?: string;
}
