"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type BillItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  quantity: number;
};

type GuestSplitItem = {
  orderItemId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

type Guest = {
  id: string;
  name: string;
  method: string;
  subtotal: number;
  items: GuestSplitItem[];
};

type BillData = {
  orderId: string;
  tableNumber: string;
  status: string;
  billStatus: string;
  totalAmount: number;
  settledTotal: number;
  items: BillItem[];
  guests: Guest[];
};

type SplitSuggestion = {
  guestName: string;
  assignments: { orderItemId: string; quantity: number }[];
};

function BillContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";

  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestInputs, setGuestInputs] = useState<string[]>(["Person 1", "Person 2"]);
  const [splits, setSplits] = useState<Record<string, Record<string, number>>>({});
  const [guestMethods, setGuestMethods] = useState<Record<string, string>>({});
  const [suggesting, setSuggesting] = useState(false);
  const [settling, setSettling] = useState(false);
  const [receipt, setReceipt] = useState<object | null>(null);
  const [error, setError] = useState("");

  const fetchBill = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/bill?orderId=${orderId}`);
      const data = await res.json();
      if (data.success) {
        setBill(data.bill);
        if (data.bill.guests.length > 0) {
          setGuestInputs(data.bill.guests.map((g: Guest) => g.name));
          const initSplits: Record<string, Record<string, number>> = {};
          const initMethods: Record<string, string> = {};
          for (const g of data.bill.guests) {
            initMethods[g.id] = g.method;
            for (const si of g.items) {
              if (!initSplits[si.orderItemId]) initSplits[si.orderItemId] = {};
              initSplits[si.orderItemId][g.id] = (initSplits[si.orderItemId][g.id] || 0) + si.quantity;
            }
          }
          setSplits(initSplits);
          setGuestMethods(initMethods);
        }
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to load bill.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const saveGuests = async (names: string[]) => {
    if (!orderId || names.length === 0) return null;
    const res = await fetch("/api/bill/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, guests: names.map((n) => ({ name: n })) }),
    });
    const data = await res.json();
    if (data.success) return data.guests;
    return null;
  };

  const handleGuestsChange = (index: number, value: string) => {
    const next = [...guestInputs];
    next[index] = value;
    setGuestInputs(next);
  };

  const addGuest = () => {
    setGuestInputs((prev) => [...prev, `Person ${prev.length + 1}`]);
  };

  const removeGuest = (index: number) => {
    if (guestInputs.length <= 1) return;
    setGuestInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAssignItem = (orderItemId: string, guestIdx: number) => {
    if (!bill) return;
    const item = bill.items.find((i) => i.id === orderItemId);
    if (!item) return;

    const committed = Object.values(splits[orderItemId] || {}).reduce((s, q) => s + q, 0);
    const remaining = item.quantity - committed;
    if (remaining <= 0) return;

    setSplits((prev) => {
      const next = { ...prev };
      if (!next[orderItemId]) next[orderItemId] = {};
      const guestId = `guest_${guestIdx}`;
      next[orderItemId] = { ...next[orderItemId], [guestId]: (next[orderItemId][guestId] || 0) + 1 };
      return next;
    });
  };

  const handleUnassignItem = (orderItemId: string, guestIdx: number) => {
    setSplits((prev) => {
      const next = { ...prev };
      if (!next[orderItemId]) return prev;
      const guestId = `guest_${guestIdx}`;
      const current = next[orderItemId][guestId] || 0;
      if (current <= 1) {
        const { [guestId]: _, ...rest } = next[orderItemId];
        next[orderItemId] = rest;
      } else {
        next[orderItemId] = { ...next[orderItemId], [guestId]: current - 1 };
      }
      return next;
    });
  };

  const getItemAssignment = (orderItemId: string) => {
    const result: { guestIdx: number; qty: number }[] = [];
    for (const [guestId, qty] of Object.entries(splits[orderItemId] || {})) {
      const idx = parseInt(guestId.replace("guest_", ""));
      if (qty > 0) result.push({ guestIdx: idx, qty });
    }
    return result;
  };

  const getGuestSubtotal = (guestIdx: number) => {
    if (!bill) return 0;
    let total = 0;
    const guestId = `guest_${guestIdx}`;
    for (const item of bill.items) {
      const qty = splits[item.id]?.[guestId] || 0;
      total += item.price * qty;
    }
    return total;
  };

  const handleAiSuggest = async () => {
    if (!orderId || guestInputs.length === 0) return;
    setSuggesting(true);
    try {
      const saved = await saveGuests(guestInputs);
      if (!saved) return;

      const res = await fetch("/api/bill/suggest-split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, guestNames: guestInputs }),
      });
      const data = await res.json();
      if (data.success && data.suggestion) {
        const newSplits: Record<string, Record<string, number>> = {};
        for (const s of data.suggestion as SplitSuggestion[]) {
          const guestIdx = guestInputs.indexOf(s.guestName);
          if (guestIdx === -1) continue;
          const guestId = `guest_${guestIdx}`;
          for (const a of s.assignments) {
            if (!newSplits[a.orderItemId]) newSplits[a.orderItemId] = {};
            newSplits[a.orderItemId][guestId] = (newSplits[a.orderItemId][guestId] || 0) + a.quantity;
          }
        }
        setSplits(newSplits);
      }
    } catch {
      setError("AI suggestion failed.");
    } finally {
      setSuggesting(false);
    }
  };

  const handleSettle = async () => {
    if (!orderId || !bill) return;
    setSettling(true);
    try {
      const saved = await saveGuests(guestInputs);
      if (!saved) return;

      const guestIdMap: Record<string, string> = {};
      for (let i = 0; i < saved.length; i++) {
        guestIdMap[`guest_${i}`] = saved[i].id;
      }

      const splitPayload: { guestId: string; orderItemId: string; quantity: number }[] = [];
      for (const [orderItemId, assignment] of Object.entries(splits)) {
        for (const [tempId, qty] of Object.entries(assignment)) {
          const realGuestId = guestIdMap[tempId];
          if (realGuestId) {
            splitPayload.push({ guestId: realGuestId, orderItemId, quantity: qty });
          }
        }
      }

      const methodsPayload = saved.map((g: Guest) => ({
        guestId: g.id,
        method: guestMethods[`guest_${saved.indexOf(g)}`] || "CASH",
      }));

      const res = await fetch("/api/bill/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          splits: splitPayload,
          guestMethods: methodsPayload,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReceipt(data.receipt);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Settlement failed.");
    } finally {
      setSettling(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-500 text-sm font-mono">Loading bill...</p>
      </main>
    );
  }

  if (!orderId) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 text-sm font-mono mb-4">No order selected.</p>
          <Link href="/" className="text-emerald-400 text-sm hover:underline">
            &larr; Back to Tables
          </Link>
        </div>
      </main>
    );
  }

  if (error && !bill) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm font-mono mb-4">{error}</p>
          <Link href="/" className="text-emerald-400 text-sm hover:underline">
            &larr; Back to Tables
          </Link>
        </div>
      </main>
    );
  }

  if (receipt) {
    const r = receipt as {
      tableNumber: string;
      total: number;
      guests: { name: string; method: string; subtotal: number; items: { name: string; quantity: number; lineTotal: number }[] }[];
      settledAt: string;
    };
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans flex items-center justify-center">
        <div className="bg-slate-800 border border-emerald-500/30 rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-emerald-400 text-3xl mb-2">&#10003;</div>
          <h1 className="text-xl font-bold text-emerald-400 mb-1">Bill Settled</h1>
          <p className="text-sm text-slate-400 mb-6 font-mono">{r.tableNumber} &middot; {new Date(r.settledAt).toLocaleString()}</p>
          <div className="text-left space-y-4 mb-6">
            {r.guests.map((g, i) => (
              <div key={i} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-slate-200">{g.name}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-600">
                    {g.method}
                  </span>
                </div>
                {g.items.map((it, j) => (
                  <div key={j} className="flex justify-between text-xs text-slate-400 ml-2">
                    <span>{it.quantity}x {it.name}</span>
                    <span>RM {it.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold text-slate-200 mt-1 pt-1 border-t border-slate-700">
                  <span>Subtotal</span>
                  <span>RM {g.subtotal.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-lg font-bold text-emerald-400 mb-6 px-1">
            <span>Total Paid</span>
            <span>RM {r.total.toFixed(2)}</span>
          </div>
          <Link
            href="/"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-medium px-6 py-2 rounded-lg transition text-sm"
          >
            &larr; Back to Tables
          </Link>
        </div>
      </main>
    );
  }

  const groupedItems = (bill?.items || []).reduce<Record<string, BillItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const totalAssigned = Object.values(splits).reduce((sum, assignment) => {
    return sum + Object.values(assignment).reduce((s, q) => s + q, 0);
  }, 0);

  const totalItems = (bill?.items || []).reduce((s, i) => s + i.quantity, 0);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <header className="border-b border-slate-800 pb-4 mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-emerald-400 transition">
            &larr; Tables
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-emerald-400">Bill Review</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-mono">
            {bill?.tableNumber}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            RM {bill?.totalAmount.toFixed(2)}
          </span>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2 mb-4">
          {error}
        </div>
      )}

      {totalAssigned < totalItems && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-lg px-4 py-2 mb-4">
          {totalItems - totalAssigned} item(s) not yet assigned to any guest.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 space-y-4">
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Order Items &mdash; tap to assign
            </h2>
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="mb-4 last:mb-0">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">{category}</h3>
                <div className="space-y-1">
                  {items.map((item) => {
                    const assigned = getItemAssignment(item.id);
                    const assignedQty = assigned.reduce((s, a) => s + a.qty, 0);
                    const fullyAssigned = assignedQty >= item.quantity;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition ${
                          fullyAssigned
                            ? "bg-emerald-900/20 border-emerald-700/30 text-slate-300"
                            : "bg-slate-800 border-slate-700 hover:border-slate-600 cursor-pointer"
                        }`}
                        onClick={() => {
                          if (!fullyAssigned && guestInputs.length > 0) {
                            const nextUnassigned = assigned.length > 0
                              ? (assigned.find((a) => a.qty < item.quantity)?.guestIdx ?? -1)
                              : -1;
                            if (nextUnassigned >= 0) {
                              handleAssignItem(item.id, nextUnassigned);
                            }
                          }
                        }}
                      >
                        <div className="flex-1">
                          <span className="text-sm">{item.name}</span>
                          <span className="text-xs text-slate-500 ml-2 font-mono">
                            &times;{item.quantity} &middot; RM{item.price.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex gap-1 text-[10px] font-mono">
                          {assigned.map((a) => (
                            <span
                              key={a.guestIdx}
                              className={`px-1.5 py-0.5 rounded ${
                                a.qty >= 1 ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-500"
                              }`}
                            >
                              G{a.guestIdx + 1}&times;{a.qty}
                            </span>
                          ))}
                          {!fullyAssigned && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-500">
                              +{item.quantity - assignedQty}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5 space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Guests
            </h2>
            <div className="space-y-3 mb-4">
              {guestInputs.map((name, idx) => (
                <div key={idx} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      value={name}
                      onChange={(e) => handleGuestsChange(idx, e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                      placeholder="Guest name"
                    />
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                      RM {getGuestSubtotal(idx).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {bill?.items.map((item) => {
                      const qty = splits[item.id]?.[`guest_${idx}`] || 0;
                      if (qty === 0) return null;
                      return (
                        <span
                          key={item.id}
                          className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1"
                        >
                          {item.name}&times;{qty}
                          <button
                            onClick={() => handleUnassignItem(item.id, idx)}
                            className="text-red-400 hover:text-red-300 ml-0.5"
                          >
                            &times;
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">Pay:</span>
                    <button
                      onClick={() =>
                        setGuestMethods((prev) => ({
                          ...prev,
                          [`guest_${idx}`]: prev[`guest_${idx}`] === "CARD" ? "CASH" : "CARD",
                        }))
                      }
                      className={`text-xs font-mono px-2 py-0.5 rounded-full border transition ${
                        (guestMethods[`guest_${idx}`] || "CASH") === "CARD"
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {(guestMethods[`guest_${idx}`] || "CASH") === "CARD" ? "CARD" : "CASH"}
                    </button>
                    {guestInputs.length > 1 && (
                      <button
                        onClick={() => removeGuest(idx)}
                        className="text-[10px] text-red-400 hover:text-red-300 ml-auto"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addGuest}
              className="w-full text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg transition mb-3"
            >
              + Add Guest
            </button>
            <div className="border-t border-slate-700 pt-3 space-y-2">
              <button
                onClick={handleAiSuggest}
                disabled={suggesting || guestInputs.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition text-xs"
              >
                {suggesting ? "AI thinking..." : "AI Suggest Split"}
              </button>
              <button
                onClick={handleSettle}
                disabled={settling || totalAssigned < totalItems || Object.keys(splits).length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-950 font-medium py-2.5 rounded-lg transition text-sm"
              >
                {settling ? "Settling..." : "Settle Bill"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function BillPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <p className="text-slate-500 text-sm font-mono">Loading bill...</p>
        </div>
      }
    >
      <BillContent />
    </Suspense>
  );
}
