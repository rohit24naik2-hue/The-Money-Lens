import React, { useEffect, useState } from "react";
import { Button, Card, Badge, Input, Label } from "../components/ui.jsx";
import {
  loadSubscriptions,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  detectSubscriptionsFromTransactions,
} from "../lib/store.js";
import { useLiveData } from "../lib/useLiveData.js";

export default function Subscriptions() {
  const [subs, setSubs] = useState([]);
  const [form, setForm] = useState({ name: "", cost: "", billingCycle: "MONTHLY" });
  const [error, setError] = useState("");
  const [merging, setMerging] = useState(null); // { id, target }
  const [detected] = useLiveData(detectSubscriptionsFromTransactions);

  async function load() {
    try {
      setSubs(await loadSubscriptions());
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // Validate and add a manual subscription (also used by detected items).
  // New subs default to KEEP (active); only Cut/Merge stop the spend.
  async function commitAdd({ name, cost, billingCycle }) {
    const trimmed = (name || "").trim();
    const amount = Number(cost);
    if (!trimmed) return "Please enter a subscription name.";
    if (!amount || amount <= 0) return "Cost must be greater than 0.";
    const dup = subs.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (dup) return `"${trimmed}" is already in your list.`;
    await addSubscription({ name: trimmed, cost: amount, billingCycle, status: "KEEP" });
    return "";
  }

  // Merge = consolidate: cancel THIS sub but roll its job into another you keep.
  function startMerge(s) {
    const others = subs.filter((o) => o.id !== s.id).map((o) => o.name);
    setMerging({ id: s.id, target: others[0] || "" });
  }
  async function confirmMerge() {
    if (!merging) return;
    const target = merging.target.trim();
    if (!target) {
      setError("Type or choose what this subscription merges into.");
      return;
    }
    await updateSubscription(merging.id, { status: "MERGE", mergedInto: target });
    setMerging(null);
    setError("");
    load();
  }

  async function add(e) {
    e.preventDefault();
    const msg = await commitAdd({ ...form, cost: Number(form.cost) });
    if (msg) {
      setError(msg);
      return;
    }
    setError("");
    setForm({ name: "", cost: "", billingCycle: "MONTHLY" });
    load();
  }

  async function addDetected(d) {
    const msg = await commitAdd({ name: d.name, cost: d.perMonth, billingCycle: "MONTHLY" });
    if (msg) {
      setError(msg);
      return;
    }
    setError("");
    load();
  }

  // Bulk-add every detected recurring charge at once (duplicates are skipped).
  async function addAllDetected() {
    let added = 0;
    for (const d of detected || []) {
      const msg = await commitAdd({ name: d.name, cost: d.perMonth, billingCycle: "MONTHLY" });
      if (!msg) added++;
    }
    setError(added ? `Added ${added} detected subscription(s).` : "No new subscriptions to add.");
    load();
  }

  function setStatus(id, status) {
    updateSubscription(id, { status }).then(load);
  }

  // Active = what you currently pay. Cut and Merge both cancel THIS line,
  // so its cost counts as recovered (you stopped paying it).
  const active = subs.filter((s) => (s.status || "KEEP") === "KEEP");
  const activeMonthly = active.reduce((a, s) => a + (s.monthlyCost || 0), 0);
  const recovered = subs
    .filter((s) => s.status === "CUT" || s.status === "MERGE")
    .reduce((a, s) => a + (s.monthlyCost || 0), 0);
  const sorted = [...subs].sort((a, b) => (b.monthlyCost || 0) - (a.monthlyCost || 0));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Subscription Triage Desk</h1>
        <p className="text-sm text-ink/60">
          Keep, Cut, or Merge every recurring charge. Ghost fees (unused &gt; 30 days) are flagged
          automatically. Your data lives only in this browser.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-xs uppercase text-ink/50">Active monthly</div>
          <div className="text-2xl font-extrabold">${Math.round(activeMonthly)}</div>
          <div className="text-xs text-ink/50 mt-1">${Math.round(activeMonthly * 12)}/yr</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-ink/50">Recovered (cut/merged)</div>
          <div className="text-2xl font-extrabold text-positive">${Math.round(recovered)}</div>
          <div className="text-xs text-ink/50 mt-1">${Math.round(recovered * 12)}/yr back in pocket</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-ink/50">Tracked</div>
          <div className="text-2xl font-extrabold">{subs.length}</div>
          <div className="text-xs text-ink/50 mt-1">{active.length} active</div>
        </Card>
      </div>

      <Card>
        <form onSubmit={add} className="flex gap-3 items-end flex-wrap">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Netflix"
              required
            />
          </div>
          <div>
            <Label>Cost</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <Label>Cycle</Label>
            <select
              className="rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm"
              value={form.billingCycle}
              onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
            >
              <option>MONTHLY</option>
              <option>ANNUALLY</option>
            </select>
          </div>
          <Button type="submit">Add</Button>
        </form>
        {error && <div className="text-urgent text-sm mt-2">{error}</div>}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {sorted.map((s) => (
          <Card key={s.id} className={s.ghost ? "border-urgent/40" : ""}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-ink/50">
                  ${Math.round(s.monthlyCost)}/mo · {s.billingCycle.toLowerCase()}
                </div>
                {s.ghost && <Badge tone="urgent" className="mt-1">Ghost fee — unused &gt;30d</Badge>}
                {s.status === "MERGE" && s.mergedInto && (
                  <div className="text-xs text-ink/50 mt-1">Merged into {s.mergedInto}</div>
                )}
              </div>
              <Badge tone={s.status === "KEEP" ? "teal" : s.status === "CUT" ? "urgent" : "amber"}>
                {s.status}
              </Badge>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              {merging && merging.id === s.id ? (
                <>
                  <Input
                    className="flex-1 min-w-[10rem]"
                    value={merging.target}
                    placeholder="Merges into (e.g. Canva Pro)"
                    onChange={(e) => setMerging({ ...merging, target: e.target.value })}
                  />
                  <Button variant="accent" className="text-xs" onClick={confirmMerge}>
                    Confirm
                  </Button>
                  <Button variant="ghost" className="text-xs" onClick={() => setMerging(null)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="teal" className="text-xs" onClick={() => setStatus(s.id, "KEEP")}>
                    Keep
                  </Button>
                  <Button variant="accent" className="text-xs" onClick={() => startMerge(s)}>
                    Merge
                  </Button>
                  <Button variant="danger" className="text-xs" onClick={() => setStatus(s.id, "CUT")}>
                    Cut
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-xs ml-auto"
                    onClick={() => deleteSubscription(s.id).then(load)}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
        {subs.length === 0 && (
          <Card className="md:col-span-2 text-center text-ink/50 py-8">
            No subscriptions yet. Import a CSV and add the detected recurring charges above.
          </Card>
        )}
      </div>
            {(detected || []).length > 0 && (
        <Card className="border-teal/40">
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold">Detected from your transactions</div>
            <Button variant="teal" className="text-xs" onClick={addAllDetected}>
              Add all
            </Button>
          </div>
          <p className="text-sm text-ink/60 mb-3">
            Recurring charges we found in your imported data. Add them to start triaging.
          </p>
          <div className="space-y-2">
            {(detected || []).map((d) => (
              <div
                key={d.name}
                className="flex items-center justify-between rounded-lg bg-cream/50 px-3 py-2"
              >
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-ink/50">
                    ~${d.perMonth}/mo · seen {d.count}×
                  </div>
                </div>
                <Button variant="teal" className="text-xs" onClick={() => addDetected(d)}>
                  Add
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
