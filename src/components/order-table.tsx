import type { AuthorizationEvidenceRecord, OrderRecord } from "@/domain/orders/types";

export function OrderTable({
  orders,
  evidence,
}: {
  orders: OrderRecord[];
  evidence: AuthorizationEvidenceRecord[];
}) {
  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <h2>Orders</h2>
          <p>Durable application state from FeltDB.</p>
        </div>
      </div>
      <table className="dataTable">
        <thead>
          <tr>
            <th>ID</th>
            <th>Product</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Created By</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={5}>No orders yet.</td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.product}</td>
                <td>{order.quantity}</td>
                <td>{order.status}</td>
                <td>{order.created_by}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="evidenceList">
        <h3>Recent authorization evidence</h3>
        <ul>
          {evidence.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.allowed ? "Allowed" : "Denied"}</strong> · {entry.capability} · {entry.effect} · {entry.policy}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
