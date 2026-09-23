"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderActionResult } from "@/domain/orders/types";

export function CreateOrderForm() {
  const router = useRouter();
  const [result, setResult] = useState<OrderActionResult | null>(null);
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const submit = async (formData: FormData) => {
    setError("");
    const product = String(formData.get("product") ?? "");
    const quantity = Number(formData.get("quantity") ?? 0);

    startTransition(async () => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product, quantity }),
      });
      const body = (await response.json()) as OrderActionResult | { error: string };

      if (!response.ok) {
        setError("error" in body ? body.error : "Unable to create order.");
        return;
      }

      setResult(body as OrderActionResult);
      router.refresh();
    });
  };

  return (
    <section className="card" id="create-order">
      <div className="cardHeader">
        <div>
          <h2>Create order</h2>
          <p>Protected by the orders.create capability.</p>
        </div>
      </div>
      <form action={submit} className="formGrid">
        <label>
          <span>Product</span>
          <input
            name="product"
            type="text"
            placeholder="Starter Kit"
            aria-label="Name"
            required
          />
        </label>
        <label>
          <span>Quantity</span>
          <input name="quantity" type="number" min="1" step="1" defaultValue="1" required />
        </label>
        <button type="submit" className="primaryButton" aria-label="Create" disabled={isPending}>
          {isPending ? "Creating…" : "Create Order"}
        </button>
      </form>
      {error ? <p className="errorText">{error}</p> : null}
      {result ? (
        <div className="resultCard">
          <strong>Authorization: {result.authorization}</strong>
          <span>Capability: {result.capability}</span>
          <span>Effect: {result.effect}</span>
          <span>State: {result.state}</span>
          <span>Evidence: {result.evidence.id}</span>
          {result.jobId ? <span>AppPort Job: {result.jobId}</span> : null}
        </div>
      ) : null}
    </section>
  );
}
