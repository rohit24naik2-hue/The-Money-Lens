import React from "react";
import { MetricCard, Card, ProgressBar, Badge } from "../components/ui.jsx";
import ImportPanel from "../components/ImportPanel.jsx";
import { CATEGORIES } from "../lib/finance.js";
import { loadSubscriptions, buildDashboard } from "../lib/store.js";
import { useLiveData } from "../lib/useLiveData.js";
import { useMoneyLens } from "../context/MoneyLensContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

const CAT_TONES = {
  RENT: "teal",
  FOOD: "energy",
  SUBSCRIPTIONS: "amber",
  TRANSPORT: "ink",
  FUN: "urgent",
  OTHER: "neutral",
};

export default function Dashboard() {
  const { transactions } = useMoneyLens();
  const { settings } = useSettings();
  const [subscriptions] = useLiveData(loadSubscriptions);

  const data = buildDashboard(settings, transactions, subscriptions);

  if (!data) return <div className="text-ink/50">Loading your real numbers…</div>;

  const { metrics, expenses, compound } = data;
  const maxCat = Math.max(1, ...CATEGORIES.map((c) => expenses[c] || 0));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Your 15-Minute Command Dashboard</h1>
        <p className="text-sm text-ink/60">
          You can't fix what you can't see. Here are your real numbers, like a report card for your
          piggy bank!
        </p>
      </header>

      <ImportPanel />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Take-Home Income" value={`$${data.settings.monthlyTakeHome}`} />
        <MetricCard
          label="Net Savings Rate"
          value={`${metrics.savingsRate.toFixed(1)}%`}
          tone={metrics.savingsHealthy ? "positive" : "urgent"}
          hint={metrics.savingsHealthy ? "Healthy (≥20%)" : "Below 20% target"}
        />
        <MetricCard
          label="Food + Fun"
          value={`${metrics.foodFunRatio.toFixed(1)}%`}
          tone={metrics.leakDetected ? "urgent" : "teal"}
          hint={metrics.leakDetected ? "Invisible leak alert (>40%)" : "Within 40% rule"}
        />
        <MetricCard
          label="Leaks Recovered"
          value={`$${data.subscriptions.recovered}`}
          tone="positive"
          hint="from cut/merged subs"
        />
      </div>

      <Card className="bg-cream/40">
        <div className="font-semibold mb-1">What do these numbers mean?</div>
        <ul className="text-sm text-ink/70 space-y-1 list-disc list-inside">
          <li>
            <b>Take-Home Income</b> — the money that lands in your piggy bank after work.
          </li>
          <li>
            <b>Net Savings Rate</b> — how much of that money you keep instead of spending. 20% or more
            is great, like saving a cookie out of every five!
          </li>
          <li>
            <b>Food + Fun</b> — snacks and play money. If it's more than 40% of your income, that's a
            "leak" we'll warn you about.
          </li>
          <li>
            <b>Leaks Recovered</b> — money you got back by cutting or merging subscriptions.
          </li>
        </ul>
      </Card>

      {metrics.leakDetected && (
        <Card className="border-urgent/40">
          <Badge tone="urgent">Invisible Leak Alert</Badge>
          <p className="mt-2 text-sm">
            Food + Fun is <b>{metrics.foodFunRatio.toFixed(1)}%</b> of take-home — over the 40% rule.
            Trim Fun or subscriptions to free up cash for compounding.
          </p>
        </Card>
      )}

      <Card>
        <div className="font-semibold mb-3">Spend by category</div>
        <div className="space-y-3">
          {CATEGORIES.map((c) => (
            <div key={c}>
              <div className="flex justify-between text-sm">
                <span>{c}</span>
                <span className="font-medium">${Math.round(expenses[c] || 0)}</span>
              </div>
              <ProgressBar value={expenses[c] || 0} max={maxCat} tone={CAT_TONES[c]} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="font-semibold mb-2">Opportunity Cost Compounder</div>
        <p className="text-sm text-ink/70">
          If you drop the <b>${compound.recovered}</b>/mo you got back into a piggy bank that grows
          by itself (about 7% a year), look how big it gets:
        </p>
        <div className="mt-3 flex gap-8">
          <div>
            <div className="text-2xl font-extrabold text-positive">${compound.tenYear.toLocaleString()}</div>
            <div className="text-xs text-ink/60">in 10 years</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-positive">${compound.twentyYear.toLocaleString()}</div>
            <div className="text-xs text-ink/60">in 20 years</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-positive">${compound.thirtyYear.toLocaleString()}</div>
            <div className="text-xs text-ink/60">in 30 years</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
