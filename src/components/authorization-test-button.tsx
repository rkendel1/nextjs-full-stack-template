"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderActionResult } from "@/domain/orders/types";

export function AuthorizationTestButton() {
  const router = useRouter();
  const [result, setResult] = useState<OrderActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const runTest = () => {
    startTransition(async () => {
      const response = await fetch("/api/orders/authorization-test", { method: "POST" });
      const body = (await response.json()) as OrderActionResult;
      setResult(body);
      router.refresh();
    });
  };

  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <h2>Run authorization test</h2>
          <p>Attempts orders.create as the demo viewer and must fail closed.</p>
        </div>
      </div>
      <button type="button" className="secondaryButton" onClick={runTest} disabled={isPending}>
        {isPending ? "Running…" : "Run Authorization Test"}
      </button>
      {result ? (
        <div className="resultCard denied">
          <strong>Authorization: {result.authorization}</strong>
          <span>Capability: {result.capability}</span>
          <span>Effect: {result.effect}</span>
          <span>Evidence: {result.evidence.id}</span>
        </div>
      ) : null}
    </section>
  );
}
