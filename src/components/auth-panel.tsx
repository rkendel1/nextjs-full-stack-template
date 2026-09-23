"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createAuthBoundry, type AuthProjection } from "@authboundry/core";
import { useRouter } from "next/navigation";

const ACTORS = [
  { id: "demo.order_manager", label: "Sign in as Order Manager" },
  { id: "demo.viewer", label: "Sign in as Viewer" },
];

const ANONYMOUS: AuthProjection = {
  authenticated: false,
  principal: null,
  tenant: null,
  claims: {},
  capabilities: [],
  session: null,
  delegation: null,
};

export function AuthPanel() {
  const router = useRouter();
  const authClient = useMemo(() => createAuthBoundry(), []);
  const [auth, setAuth] = useState<AuthProjection>(ANONYMOUS);
  const [authorizeResult, setAuthorizeResult] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    authClient.session().then(setAuth).catch(() => setAuth(ANONYMOUS));
    return authClient.subscribe((state) => setAuth(state.auth));
  }, [authClient]);

  const signIn = (actorId: string) => {
    startTransition(async () => {
      const next = await authClient.signIn({ actorId });
      setAuth(next);
      router.refresh();
    });
  };

  const signOut = () => {
    startTransition(async () => {
      const next = await authClient.signOut();
      setAuth(next);
      setAuthorizeResult("");
      router.refresh();
    });
  };

  const authorize = () => {
    startTransition(async () => {
      const allowed = await authClient.authorize("orders.create");
      setAuthorizeResult(allowed ? "orders.create is currently allowed" : "orders.create is currently denied");
    });
  };

  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <h2>Authority projection</h2>
          <p>Powered by the @authboundry/core client contract.</p>
        </div>
        {auth.authenticated ? (
          <button type="button" className="secondaryButton" onClick={signOut} disabled={isPending}>
            Sign out
          </button>
        ) : null}
      </div>
      <dl className="statusList compactList">
        <div>
          <dt>Authenticated</dt>
          <dd>{auth.authenticated ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Principal</dt>
          <dd>{auth.principal?.id ?? "anonymous"}</dd>
        </div>
        <div>
          <dt>Tenant</dt>
          <dd>{auth.tenant?.id ?? "none"}</dd>
        </div>
        <div>
          <dt>Claims</dt>
          <dd>{Object.entries(auth.claims).map(([key, value]) => `${key}=${String(value)}`).join(", ") || "none"}</dd>
        </div>
        <div>
          <dt>Capabilities</dt>
          <dd>{auth.capabilities.join(", ") || "none"}</dd>
        </div>
        <div>
          <dt>Delegation</dt>
          <dd>{auth.delegation ? JSON.stringify(auth.delegation) : "none"}</dd>
        </div>
      </dl>
      <div className="buttonRow">
        {ACTORS.map((actor) => (
          <button key={actor.id} type="button" className="secondaryButton" onClick={() => signIn(actor.id)} disabled={isPending}>
            {actor.label}
          </button>
        ))}
        <button type="button" className="secondaryButton" onClick={authorize} disabled={isPending}>
          Check orders.create
        </button>
      </div>
      {authorizeResult ? <p className="helperText">{authorizeResult}</p> : null}
    </section>
  );
}
