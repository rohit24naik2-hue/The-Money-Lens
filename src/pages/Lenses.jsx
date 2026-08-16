import React, { useEffect, useState } from "react";
import { Button, Card, Badge, Input, Label, Textarea } from "../components/ui.jsx";
import { rentVsBuy, aiToolVerdict, cryptoMonthlyCap } from "../lib/finance.js";
import {
  useSettings,
  getHourlyRate,
} from "../context/SettingsContext.jsx";
import { loadDecisions, addDecision, deleteDecision } from "../lib/store.js";

export default function Lenses() {
  const { settings, setSettings } = useSettings();
  const [hourly, setHourly] = useState(getHourlyRate(settings));
  const [decisions, setDecisions] = useState([]);
  const [aiForm, setAiForm] = useState({ cost: "", hours: "" });

  async function load() {
    setDecisions(await loadDecisions());
  }
  useEffect(() => {
    load();
  }, []);

  function saveRate() {
    setSettings({ ...settings, hourlyRate: Number(hourly) });
  }

  function aiVerdict() {
    const v = aiToolVerdict({
      costMonthly: Number(aiForm.cost),
      hoursSavedPerWeek: Number(aiForm.hours),
      hourlyRate: getHourlyRate(settings),
    });
    setAiResult(v);
  }
  const [aiResult, setAiResult] = useState(null);

  async function logDecision(text, verdict) {
    await addDecision({ lensId: "lenses", text, verdict });
    load();
  }

  if (!settings) return <div className="text-ink/50">Loading…</div>;

  const rvb = rentVsBuy({ monthlyRent: settings.monthlyRent, hourlyRate: getHourlyRate(settings) });
  const crypto = cryptoMonthlyCap(settings.monthlyTakeHome);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">The Crossovers</h1>
        <p className="text-sm text-ink/60">
          Every money decision evaluated through the lens of your real hourly rate — so the cost of
          everything is measured in hours of your life.
        </p>
      </header>

      <Card>
        <Label>Your hourly rate ($/hr)</Label>
        <div className="flex gap-3 items-end w-48">
          <Input type="number" value={hourly} onChange={(e) => setHourly(e.target.value)} />
          <Button variant="teal" onClick={saveRate}>Save</Button>
        </div>
        <p className="text-xs text-ink/50 mt-1">
          Set once in setup; this converts dollars into the hours of life each purchase costs.
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="font-semibold">Rent vs. Buy</div>
          <p className="text-sm text-ink/60 mt-1">Monthly rent ${settings.monthlyRent} →</p>
          <div className="mt-2 text-sm">
            {rvb.buyWins ? (
              <Badge tone="positive">Buying may be better: ${rvb.ownMonthly}/mo all-in vs ${rvb.rentMonthly}/mo rent</Badge>
            ) : (
              <Badge tone="amber">Renting keeps you flexible: ${rvb.rentMonthly}/mo vs ${rvb.ownMonthly}/mo to own</Badge>
            )}
          </div>
          <div className="mt-3">
            <Button variant="ghost" onClick={() => logDecision(`Rent vs Buy review — ${rvb.buyWins ? "buy" : "rent"}`, rvb.buyWins ? "buy" : "rent")}>
              Log this insight
            </Button>
          </div>
        </Card>

        <Card>
          <div className="font-semibold">AI Tool Subscription Verdict</div>
          <p className="text-sm text-ink/60 mt-1">Does the tool pay for itself in saved hours?</p>
          <div className="mt-3 flex gap-3 items-end flex-wrap">
            <div>
              <Label>Monthly cost</Label>
              <Input type="number" value={aiForm.cost} onChange={(e) => setAiForm({ ...aiForm, cost: e.target.value })} />
            </div>
            <div>
              <Label>Hours saved/mo</Label>
              <Input type="number" value={aiForm.hours} onChange={(e) => setAiForm({ ...aiForm, hours: e.target.value })} />
            </div>
            <Button onClick={aiVerdict}>Check</Button>
          </div>
          {aiResult && (
            <div className="mt-3">
              <Badge tone={aiResult.worthIt ? "positive" : "urgent"}>
                {aiResult.worthIt ? "worth it" : "not worth it"} — saves ${aiResult.monthlyValue}/mo vs ${aiResult.monthlyCost} cost
              </Badge>
            </div>
          )}
          {aiResult && (
            <div className="mt-2">
              <Button variant="ghost" onClick={() => logDecision(`AI tool $${aiForm.cost}/mo → ${aiResult.worthIt ? "worth it" : "not worth it"}`, aiResult.worthIt ? "worth it" : "not worth it")}>
                Log this insight
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <div className="font-semibold">Crypto Guardrail</div>
          <p className="text-sm text-ink/60 mt-1">{crypto.message}</p>
          <Badge tone="amber" className="mt-3">Hard cap: ${crypto.maxPerMonth}/mo of take-home</Badge>
          <div className="mt-3">
            <Button variant="ghost" onClick={() => logDecision(`Crypto check — ${crypto.message}`, "guardrail")}>
              Log this insight
            </Button>
          </div>
        </Card>

        <Card className="bg-ink text-cream">
          <div className="font-semibold">Decision Log</div>
          <p className="text-xs text-cream/60 mt-1">Everything you've judged through the Lens.</p>
          <div className="mt-3 space-y-2">
            {decisions.length === 0 && <div className="text-xs text-cream/40">No decisions logged yet.</div>}
            {decisions.map((d) => (
              <div key={d.id} className="flex justify-between items-center text-sm">
                <span className="text-cream/80">{d.text}</span>
                <Button
                  variant="ghost"
                  className="text-cream/50 text-xs"
                  onClick={() => deleteDecision(d.id).then(load)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
