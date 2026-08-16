import React, { useEffect, useState } from "react";
import { Button, Card, Badge, Input, Label, ProgressBar } from "../components/ui.jsx";
import { calculateCompoundValue } from "../lib/finance.js";
import {
  loadSettings,
  loadSubscriptions,
  loadSinkingFunds,
  addSinkingFund,
} from "../lib/store.js";

export default function Capital() {
  const [settings, setSettings] = useState(null);
  const [subs, setSubs] = useState([]);
  const [funds, setFunds] = useState([]);
  const [form, setForm] = useState({ name: "", targetAmount: "", targetDate: "", monthlySetAside: "" });
  const [error, setError] = useState("");

  async function load() {
    const [s, sub, f] = await Promise.all([
      loadSettings(),
      loadSubscriptions(),
      loadSinkingFunds(),
    ]);
    setSettings(s);
    setSubs(sub);
    setFunds(f);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function add(e) {
    e.preventDefault();
    await addSinkingFund({
      name: form.name,
      targetAmount: Number(form.targetAmount),
      targetDate: form.targetDate || new Date().toISOString().slice(0, 10),
      monthlySetAside: Number(form.monthlySetAside),
    });
    setForm({ name: "", targetAmount: "", targetDate: "", monthlySetAside: "" });
    load();
  }

  if (error) return <div className="text-urgent">{error}</div>;
  if (!settings) return <div className="text-ink/50">Loading…</div>;

  const takeHome = settings.monthlyTakeHome || 0;
  const recovered = subs
    .filter((s) => s.status === "CUT" || s.status === "MERGE")
    .reduce((a, s) => a + (s.monthlyCost || 0), 0);
  const tenYear = Math.round(calculateCompoundValue(recovered, 10));
  const twentyYear = Math.round(calculateCompoundValue(recovered, 20));
  const thirtyYear = Math.round(calculateCompoundValue(recovered, 30));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Capital Priority Pipeline</h1>
        <p className="text-sm text-ink/60">
          Freed cash is systematically directed: emergency cushion → high-interest debt → sinking
          funds → compounding wealth.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="font-semibold">1 · Emergency Cushion</div>
          <p className="text-sm text-ink/60 mt-1">Target: 1 month of base living expenses.</p>
          <div className="mt-3">
            <ProgressBar value={takeHome} max={takeHome || 1} tone="amber" />
            <div className="text-xs text-ink/50 mt-1">Goal: ${takeHome}/mo baseline</div>
          </div>
        </Card>

        <Card>
          <div className="font-semibold">2 · High-Interest Debt Payoff</div>
          <p className="text-sm text-ink/60 mt-1">
            Paying a 22% credit card = a <b>guaranteed 22% return</b>, better than almost any
            investment.
          </p>
          <Badge tone="urgent" className="mt-3">ROI: 22% guaranteed</Badge>
        </Card>

        <Card>
          <div className="font-semibold">3 · Sinking Funds</div>
          <p className="text-sm text-ink/60 mt-1">
            Auto-set-asides for irregular annual/quarterly costs.
          </p>
          <div className="mt-3 space-y-2">
            {funds.length === 0 && <div className="text-xs text-ink/40">No sinking funds yet.</div>}
            {funds.map((f) => (
              <div key={f.id} className="text-sm">
                <div className="flex justify-between">
                  <span>{f.name}</span>
                  <span className="font-medium">${Math.round(f.monthlySetAside)}/mo</span>
                </div>
                <ProgressBar value={f.monthlySetAside} max={Math.max(1, f.monthlySetAside)} tone="teal" />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="font-semibold">4 · Pay-Yourself-First Compounding</div>
          <p className="text-sm text-ink/70 mt-1">
            Invest the recovered ${Math.round(recovered)}/mo at 7%:
          </p>
          <div className="mt-3 flex gap-6">
            <div>
              <div className="text-2xl font-extrabold text-positive">${tenYear.toLocaleString()}</div>
              <div className="text-xs text-ink/60">10y</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-positive">${twentyYear.toLocaleString()}</div>
              <div className="text-xs text-ink/60">20y</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-positive">${thirtyYear.toLocaleString()}</div>
              <div className="text-xs text-ink/60">30y</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <form onSubmit={add} className="flex gap-3 items-end flex-wrap">
          <div>
            <Label>Sinking fund name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Car repair" required />
          </div>
          <div>
            <Label>Target ($)</Label>
            <Input type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
          </div>
          <div>
            <Label>Monthly set-aside ($)</Label>
            <Input type="number" value={form.monthlySetAside} onChange={(e) => setForm({ ...form, monthlySetAside: e.target.value })} required />
          </div>
          <div>
            <Label>Target date</Label>
            <Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
          </div>
          <Button type="submit">Add fund</Button>
        </form>
      </Card>
    </div>
  );
}
