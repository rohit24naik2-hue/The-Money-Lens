import React, { useEffect, useState } from "react";
import { Button, Card, Badge, Input, Label } from "../components/ui.jsx";
import {
  loadSubscriptions,
  addSubscription,
  updateSubscription,
  deleteSubscription,
} from "../lib/store.js";

export default function Subscriptions() {
  const [subs, setSubs] = useState([]);
  const [form, setForm] = useState({ name: "", cost: "", billingCycle: "MONTHLY" });
  const [error, setError] = useState("");

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

  async function add(e) {
    e.preventDefault();
    await addSubscription({ ...form, cost: Number(form.cost) });
    setForm({ name: "", cost: "", billingCycle: "MONTHLY" });
    load();
  }
  function setStatus(id, status) {
    updateSubscription(id, { status }).then(load);
  }

  const recovered = subs
    .filter((s) => s.status === "CUT" || s.status === "MERGE")
    .reduce((a, s) => a + (s.monthlyCost || 0), 0);
  const total = subs.reduce((a, s) => a + (s.monthlyCost || 0), 0);

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
          <div className="text-2xl font-extrabold">${Math.round(total)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-ink/50">Recovered (cut/merged)</div>
          <div className="text-2xl font-extrabold text-positive">${Math.round(recovered)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-ink/50">Count</div>
          <div className="text-2xl font-extrabold">{subs.length}</div>
        </Card>
      </div>

      <Card>
        <form onSubmit={add} className="flex gap-3 items-end flex-wrap">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Cost</Label>
            <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required />
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
      </Card>

      {error && <div className="text-urgent text-sm">{error}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        {subs.map((s) => (
          <Card key={s.id} className={s.ghost ? "border-urgent/40" : ""}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-ink/50">
                  ${Math.round(s.monthlyCost)}/mo · {s.billingCycle.toLowerCase()}
                </div>
                {s.ghost && <Badge tone="urgent">Ghost fee — unused &gt;30d</Badge>}
              </div>
              <Badge tone={s.status === "KEEP" ? "teal" : s.status === "CUT" ? "urgent" : "amber"}>
                {s.status}
              </Badge>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="teal" className="text-xs" onClick={() => setStatus(s.id, "KEEP")}>
                Keep
              </Button>
              <Button variant="accent" className="text-xs" onClick={() => setStatus(s.id, "MERGE")}>
                Merge
              </Button>
              <Button variant="danger" className="text-xs" onClick={() => setStatus(s.id, "CUT")}>
                Cut
              </Button>
              <Button variant="ghost" className="text-xs ml-auto" onClick={() => deleteSubscription(s.id).then(load)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
