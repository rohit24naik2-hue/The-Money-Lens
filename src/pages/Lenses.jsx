import React, { useEffect, useState, useCallback } from "react";
import { Button, Card, Badge, Input, Label } from "../components/ui.jsx";
import { rentVsBuy, aiToolVerdict, cryptoMonthlyCap, insuranceGuardrail } from "../lib/finance.js";
import {
  useSettings,
  getHourlyRate,
} from "../context/SettingsContext.jsx";
import { loadDecisions, addDecision, deleteDecision, clearAll } from "../lib/store.js";
import { useLiveData } from "../lib/useLiveData.js";

export default function Lenses() {
  const { settings, setSettings, loadSettings } = useSettings();
  const [hourly, setHourly] = useState(getHourlyRate(settings));
  const [aiForm, setAiForm] = useState({ cost: "", hours: "" });
  const [aiResult, setAiResult] = useState(null);
  const [rvbForm, setRvbForm] = useState({
    homePrice: "",
    downPct: "20",
    rent: settings?.monthlyRent || "",
    years: "5",
    roomRent: "0",
  });
  const [insForm, setInsForm] = useState({ premium: "", product: "TERM" });

  const loader = useCallback(() => loadDecisions(), []);
  const [decisions] = useLiveData(loader);

  useEffect(() => {
    if (settings && !rvbForm.rent) setRvbForm((f) => ({ ...f, rent: settings.monthlyRent }));
  }, [settings, rvbForm.rent]);

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

  async function logDecision(text, verdict) {
    await addDecision({ lensId: "lenses", text, verdict });
  }

  async function doReset() {
    if (!confirm("Reset ALL data? This erases every transaction, subscription, and your settings, and returns you to setup. This cannot be undone.")) return;
    await clearAll();
    await loadSettings();
  }

  if (!settings) return <div className="text-ink/50">Loading…</div>;

  const rvb = rentVsBuy({
    homePrice: Number(rvbForm.homePrice),
    downPct: Number(rvbForm.downPct) / 100,
    monthlyRent: Number(rvbForm.rent),
    roomRent: Number(rvbForm.roomRent),
    years: Number(rvbForm.years),
  });
  const crypto = cryptoMonthlyCap(settings.monthlyTakeHome);
  const ins = insuranceGuardrail({
    monthlyPremium: insForm.premium,
    monthlyTakeHome: settings.monthlyTakeHome,
    product: insForm.product,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">The Crossovers</h1>
        <p className="text-sm text-ink/60">
          Every money decision looked at through your real hourly rate — so the cost of everything is
          measured in hours of your life. A $20 toy might cost you one hour of work!
        </p>
      </header>

      <Card className="bg-cream/40">
        <div className="font-semibold mb-1">The four big questions:</div>
        <ul className="text-sm text-ink/70 space-y-1 list-disc list-inside">
          <li>
            <b>Rent vs Buy</b> — is it smarter to keep renting or to buy a house?
          </li>
          <li>
            <b>AI Tool</b> — does a paid helper actually save you enough time to be worth it?
          </li>
          <li>
            <b>Crypto</b> — only a tiny bit, like a lottery ticket, not your whole allowance.
          </li>
          <li>
            <b>Insurance</b> — simple protection (term life) instead of fancy, pricey plans.
          </li>
        </ul>
      </Card>

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
          <div className="font-semibold">Real Estate — 5-Year Test</div>
          <p className="text-sm text-ink/60 mt-1">Does buying beat renting over your horizon?</p>
          <div className="mt-3 grid grid-cols-2 gap-3 items-end">
            <div>
              <Label>Home price</Label>
              <Input type="number" value={rvbForm.homePrice} onChange={(e) => setRvbForm({ ...rvbForm, homePrice: e.target.value })} placeholder="450000" />
            </div>
            <div>
              <Label>Down %</Label>
              <Input type="number" value={rvbForm.downPct} onChange={(e) => setRvbForm({ ...rvbForm, downPct: e.target.value })} />
            </div>
            <div>
              <Label>Est. rent/mo</Label>
              <Input type="number" value={rvbForm.rent} onChange={(e) => setRvbForm({ ...rvbForm, rent: e.target.value })} />
            </div>
            <div>
              <Label>Horizon (yrs)</Label>
              <Input type="number" value={rvbForm.years} onChange={(e) => setRvbForm({ ...rvbForm, years: e.target.value })} />
            </div>
            <div>
              <Label>House-hack income/mo</Label>
              <Input type="number" value={rvbForm.roomRent} onChange={(e) => setRvbForm({ ...rvbForm, roomRent: e.target.value })} />
            </div>
          </div>
          <div className="mt-3 text-sm">
            {rvb.buyWins ? (
              <Badge tone="positive">Buying wins: ${rvb.ownMonthly}/mo all-in vs ${rvb.rentMonthly}/mo rent</Badge>
            ) : rvb.homePrice > 0 ? (
              <Badge tone="amber">Renting wins: ${rvb.rentMonthly}/mo vs ${rvb.ownMonthly}/mo to own</Badge>
            ) : (
              <Badge tone="amber">Enter a home price to compare vs ${rvb.rentMonthly}/mo rent</Badge>
            )}
            {rvb.homePrice > 0 && Number(rvbForm.years) < 5 && (
              <div className="mt-2 text-xs text-ink/60">
                Horizon &lt; 5 yrs — closing costs typically eat buying gains. Renting is safer.
              </div>
            )}
          </div>
          <div className="mt-3">
            <Button variant="ghost" onClick={() => logDecision(`Rent vs Buy (${rvbForm.years}y) — ${rvb.buyWins ? "buy" : "rent"}`, rvb.buyWins ? "buy" : "rent")}>
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

        <Card>
          <div className="font-semibold">Insurance Crossover</div>
          <p className="text-sm text-ink/60 mt-1">Term life ~10x income; avoid whole/universal life.</p>
          <div className="mt-3 flex gap-3 items-end flex-wrap">
            <div>
              <Label>Monthly premium</Label>
              <Input type="number" value={insForm.premium} onChange={(e) => setInsForm({ ...insForm, premium: e.target.value })} />
            </div>
            <div>
              <Label>Product</Label>
              <select
                className="rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm"
                value={insForm.product}
                onChange={(e) => setInsForm({ ...insForm, product: e.target.value })}
              >
                <option>TERM</option>
                <option>WHOLE</option>
                <option>UNIVERSAL</option>
              </select>
            </div>
          </div>
          {insForm.premium && (
            <div className="mt-3 space-y-1 text-sm">
              <Badge tone={ins.wrongProduct || ins.overPaying ? "urgent" : "positive"}>{ins.verdict}</Badge>
              <div className="text-ink/60">{ins.message}</div>
              <div className="text-xs text-ink/50">Recommended term-life coverage: ${ins.recommendedTermLife.toLocaleString()}</div>
            </div>
          )}
          {insForm.premium && (
            <div className="mt-2">
              <Button variant="ghost" onClick={() => logDecision(`Insurance (${insForm.product}) — ${ins.verdict}`, ins.verdict)}>
                Log this insight
              </Button>
            </div>
          )}
        </Card>

        <Card className="md:col-span-2">
          <div className="font-semibold">Decision Log</div>
          <p className="text-xs text-ink/60 mt-1">Everything you've judged through the Lens.</p>
          <div className="mt-3 space-y-2">
            {(!decisions || decisions.length === 0) && <div className="text-xs text-ink/40">No decisions logged yet.</div>}
            {(decisions || []).map((d) => (
              <div key={d.id} className="flex justify-between items-center text-sm">
                <span className="text-ink/80">{d.text}</span>
                <Button
                  variant="ghost"
                  className="text-ink/50 text-xs"
                  onClick={() => deleteDecision(d.id)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="bg-cream/40 border border-ink/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="font-semibold">Reset everything</div>
            <p className="text-xs text-ink/60 mt-1">
              Erases all transactions, subscriptions, and your settings, and returns you to setup. Cannot
              be undone.
            </p>
          </div>
          <Button variant="danger" onClick={doReset}>
            Reset all data
          </Button>
        </div>
      </Card>
    </div>
  );
}
