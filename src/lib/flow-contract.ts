import { readFileSync } from "node:fs";
import { parseFlowSpec, type FlowSpec } from "@feltdb/core";
import { flowPath } from "@/lib/paths";

export interface ContractActor {
  id: string;
  label: string;
  kind: string;
  claims: Record<string, string>;
}

export interface ContractGrant {
  policyName: string;
  capability: string;
  actorId: string;
}

export interface ApplicationContract {
  spec: FlowSpec;
  actors: Record<string, ContractActor>;
  capabilities: string[];
  grants: ContractGrant[];
}

function parseQuotedValue(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseActorClaims(statements: string[]) {
  const claims: Record<string, string> = {};

  for (const statement of statements) {
    if (!statement.startsWith("claim ")) {
      continue;
    }

    const assignment = statement.slice("claim ".length).trim();
    const [key, value] = assignment.split("=");
    if (key && value) {
      claims[key.trim()] = parseQuotedValue(value);
    }
  }

  return claims;
}

function parseStatementValue(statements: string[], prefix: string) {
  const statement = statements.find((candidate) => candidate.startsWith(prefix));
  return statement ? parseQuotedValue(statement.slice(prefix.length)) : undefined;
}

function parseActorLabel(name: string, statements: string[]) {
  return parseStatementValue(statements, "label ") ?? name;
}

function parseActorKind(statements: string[]) {
  const kindStatement = statements.find((statement) => statement.startsWith("kind "));
  return kindStatement ? kindStatement.slice("kind ".length).trim() : "human";
}

function parseGrant(policyName: string, statement: string): ContractGrant | null {
  const match = /^allow\s+(\S+)\s+to\s+(\S+)$/.exec(statement.trim());
  if (!match) {
    return null;
  }

  return {
    policyName,
    capability: parseQuotedValue(match[1]),
    actorId: parseQuotedValue(match[2]),
  };
}

export function loadApplicationContract(): ApplicationContract {
  const spec = parseFlowSpec(readFileSync(flowPath(), "utf8"));
  const actors = Object.fromEntries(
    spec.agents.map((agent) => [
      parseStatementValue(agent.statements, "principal ") ?? agent.name,
      {
        id: parseStatementValue(agent.statements, "principal ") ?? agent.name,
        label: parseActorLabel(agent.name, agent.statements),
        kind: parseActorKind(agent.statements),
        claims: parseActorClaims(agent.statements),
      },
    ]),
  );

  const grants = spec.policies.flatMap((policy) =>
    policy.statements
      .map((statement) => parseGrant(policy.name, statement))
      .filter((grant): grant is ContractGrant => grant !== null),
  );

  return {
    spec,
    actors,
    capabilities: spec.capabilities.map(
      (capability) => parseStatementValue(capability.statements, "protocol ") ?? capability.name,
    ),
    grants,
  };
}

export function actorCapabilities(contract: ApplicationContract, actorId: string) {
  return contract.grants
    .filter((grant) => grant.actorId === actorId)
    .map((grant) => grant.capability);
}

export function policyForCapability(contract: ApplicationContract, actorId: string, capability: string) {
  return contract.grants.find(
    (grant) => grant.actorId === actorId && grant.capability === capability,
  );
}
