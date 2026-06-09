"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
};

type CartItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
};

type TableOrderItem = {
  id: string;
  quantity: number;
  menuItem: MenuItem;
};

type ActiveOrder = {
  id: string;
  status: string;
  totalAmount: number;
  rawNotes: string | null;
  aiKitchenSummary: string | null;
  items: TableOrderItem[];
};

function PosContent() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("tableId") || "";

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [kitchenTicket, setKitchenTicket] = useState<string | null>(null);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/menu-items")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setMenu(data.items);
      });
  }, []);

  useEffect(() => {
    if (!tableId) return;

    fetch(`/api/tables/${tableId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;

        const table = data.table;
        setTableNumber(table.tableNumber);

        const activeOrder: ActiveOrder | undefined = table.orders?.[0];
        if (activeOrder) {
          setExistingOrderId(activeOrder.id);
          setCart(
            activeOrder.items.map((i: TableOrderItem) => ({
              menuItemId: i.menuItem.id,
              name: i.menuItem.name,
              price: i.menuItem.price,
              quantity: i.quantity,
            }))
          );
          setNotes(activeOrder.rawNotes || "");
          setKitchenTicket(activeOrder.aiKitchenSummary);
        }
      });
  }, [tableId]);

  const handleAddToOrder = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const match = prev.find((i) => i.menuItemId === item.id);
      if (match)
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
    setKitchenTicket(null);
  }, []);

  const handleUpdateQty = useCallback((menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.menuItemId === menuItemId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
    setKitchenTicket(null);
  }, []);

  const totalCart = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleDispatchOrder = async () => {
    if (!tableId || cart.length === 0) return;
    setLoading(true);

    const isUpdate = !!existingOrderId;
    const url = "/api/orders";
    const method = isUpdate ? "PUT" : "POST";
    const body = isUpdate
      ? {
          orderId: existingOrderId,
          items: cart.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
          })),
          rawNotes: notes,
        }
      : {
          tableId,
          items: cart.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
          })),
          rawNotes: notes,
        };

    setDispatchError(null);

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        setKitchenTicket(data.order.aiKitchenSummary);
        setExistingOrderId(data.order.id);
        setDispatchError(null);
      } else {
        setDispatchError(data.error || "Dispatch failed with no error message.");
      }
    } catch (e) {
      setDispatchError(
        e instanceof Error ? e.message : "Network error — check console for details."
      );
      console.error("Dispatch failed", e);
    } finally {
      setLoading(false);
    }
  };

  const groupedMenu = menu.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <header className="border-b border-slate-800 pb-4 mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-emerald-400 transition"
          >
            &larr; Tables
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-emerald-400">
            OrderUp Smart POS
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-mono">
            {tableNumber || "No table"}
          </span>
          {existingOrderId && (
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded-full border border-amber-500/20 font-mono">
              Existing Order
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Menu Items Matrix
            </h2>
            {Object.entries(groupedMenu).map(([category, items]) => (
              <div key={category} className="mb-4 last:mb-0">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">
                  {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddToOrder(item)}
                      className="p-3 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition text-left rounded-lg flex justify-between items-center group"
                    >
                      <div>
                        <p className="font-medium text-slate-200 group-hover:text-emerald-400 transition text-sm">
                          {item.name}
                        </p>
                      </div>
                      <span className="font-mono text-xs bg-slate-900 px-2 py-1 rounded border border-slate-700 shrink-0 ml-2">
                        RM {item.price.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
            <label className="block text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Remarks
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Hold the sambal on 1 nasi lemak, make roti canai super crispy, send drink out first sharp!!"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 h-24 resize-none transition"
            />
          </div>
        </section>

        <section className="lg:col-span-5 space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Live Cart Processing
              </h2>
              {existingOrderId && (
                <div className="text-[10px] font-mono text-amber-400/60 mb-3 border border-amber-500/10 bg-amber-500/5 rounded-lg px-3 py-2">
                  Modifying existing order — dispatch will update the current
                  ticket
                </div>
              )}
              {cart.length === 0 ? (
                <p className="text-sm text-slate-500 italic py-4">
                  Basket currently empty. Tap menu items to add.
                </p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto mb-4 border-b border-slate-700 pb-4">
                  {cart.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between items-center text-sm font-mono text-slate-300"
                    >
                      <span className="flex-1 truncate mr-2">{item.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleUpdateQty(item.menuItemId, -1)}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-xs transition"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-slate-200">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.menuItemId, 1)}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-xs transition"
                        >
                          +
                        </button>
                        <span className="w-16 text-right text-slate-400">
                          RM {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-between text-sm font-semibold text-slate-200 mb-4 px-1">
                <span>Total</span>
                <span>RM {totalCart.toFixed(2)}</span>
              </div>
            </div>
            {dispatchError && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
                {dispatchError}
              </div>
            )}
            <button
              disabled={cart.length === 0 || loading || !tableId}
              onClick={handleDispatchOrder}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed font-medium text-slate-950 py-3 rounded-lg transition tracking-wide text-sm shadow-lg shadow-emerald-950/20"
            >
              {loading
                ? "Transmitting to Expediter System..."
                : existingOrderId
                  ? "Update Order in Kitchen Pipeline"
                  : "Dispatch to Kitchen Pipeline"}
            </button>
          </div>

          <div className="bg-slate-950 border border-emerald-500/20 rounded-xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500/10 border-l border-b border-emerald-500/20 text-[10px] uppercase font-mono tracking-widest text-emerald-400 px-3 py-1 rounded-bl">
              AI Expediter Component
            </div>
            <h3 className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase mb-4">
              {"///"} KITCHEN_LIVE_TICKET_STAMP
            </h3>
            {kitchenTicket ? (
              <div className="prose prose-invert max-w-none text-sm font-mono text-emerald-300 whitespace-pre-line leading-relaxed">
                {kitchenTicket}
              </div>
            ) : existingOrderId ? (
              <p className="text-xs font-mono text-slate-600 italic">
                Cart modified — dispatch to regenerate kitchen ticket with
                changes
              </p>
            ) : (
              <p className="text-xs font-mono text-slate-600 italic">
                Awaiting structural intake payload to analyze operational
                overhead...
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <p className="text-slate-500 text-sm font-mono">Loading POS...</p>
        </div>
      }
    >
      <PosContent />
    </Suspense>
  );
}
