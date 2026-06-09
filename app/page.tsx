"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TableData = {
  id: string;
  tableNumber: string;
  status: string;
  orders: {
    id: string;
    totalAmount: number;
    status: string;
    items: { menuItem: { name: string }; quantity: number }[];
  }[];
};

const statusConfig: Record<
  string,
  { label: string; bg: string; border: string; badge: string }
> = {
  AVAILABLE: {
    label: "Available",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  OCCUPIED: {
    label: "Occupied",
    bg: "bg-amber-500/5",
    border: "border-amber-500/30",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  BILLING: {
    label: "Billing",
    bg: "bg-red-500/5",
    border: "border-red-500/30",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

export default function TableDashboard() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTables();
  }, []);

  async function fetchTables() {
    try {
      const res = await fetch("/api/tables");
      const data = await res.json();
      if (data.success) setTables(data.tables);
    } catch (e) {
      console.error("Failed to fetch tables", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <header className="border-b border-slate-800 pb-4 mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-emerald-400">
          OrderUp Smart POS
        </h1>
        <div className="flex items-center gap-3">
          <span
            className="text-xs text-slate-500 font-mono"
            suppressHydrationWarning
          >
            {new Date().toLocaleTimeString()}
          </span>
          <button
            onClick={fetchTables}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Table Management
        </h2>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Occupied
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            Billing
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-slate-800/50 border border-slate-700/60 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {tables.map((table) => {
            const cfg = statusConfig[table.status] || statusConfig.AVAILABLE;
            const activeOrder = table.orders[0];
            return (
              <div
                key={table.id}
                className={`${cfg.bg} ${cfg.border} border rounded-xl p-4 flex flex-col justify-between transition hover:shadow-lg hover:shadow-slate-900/50`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-lg font-bold font-mono text-slate-200">
                    {table.tableNumber}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full border ${cfg.badge}`}
                  >
                    {cfg.label}
                  </span>
                </div>

                {activeOrder ? (
                  <div className="text-xs text-slate-400 space-y-1 mb-3">
                    <p className="font-mono">
                      {activeOrder.items.reduce(
                        (sum, i) => sum + i.quantity,
                        0
                      )}{" "}
                      items · RM {activeOrder.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-slate-500 capitalize">{activeOrder.status.toLowerCase()}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic mb-3">
                    No active order
                  </p>
                )}

                {table.status === "AVAILABLE" ? (
                  <Link
                    href={`/pos?tableId=${table.id}`}
                    className="text-xs text-center bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-medium py-2 rounded-lg transition tracking-wide mt-auto"
                  >
                    Seat Guest
                  </Link>
                ) : (
                  <div className="flex gap-2 mt-auto">
                    <Link
                      href={`/pos?tableId=${table.id}`}
                      className="flex-1 text-xs text-center bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-medium py-2 rounded-lg transition tracking-wide"
                    >
                      Manage Order
                    </Link>
                    <Link
                      href={`/bill?orderId=${activeOrder?.id}`}
                      className="flex-1 text-xs text-center bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2 rounded-lg transition tracking-wide"
                    >
                      View Bill
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
