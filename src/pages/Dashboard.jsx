import React, { useCallback } from "react";
import { MetricCard, Card, ProgressBar, Badge } from "../components/ui.jsx";
import { CATEGORIES } from "../lib/finance.js";
import {
  loadSettings,
  loadTransactions,
  loadSubscriptions,
  buildDashboard,
} from "../lib/store.js";
import { useLiveData } from "../lib/useLiveData.js";

const CAT_TONES = {
  RENT: "teal",
  FOOD: "energy",
  SUBSCRIPTIONS: "amber",
  TRANSPORT: "ink",
  FUN: "urgent",
  OTHER: "neutral",
};

export default function Dashboard() {
  const loader = useCallback(
    () =>
      Promise.all([loadSettings(), loadTransactions(), loadSubscriptions()]).then(
        ([settings, transactions, subscriptions]) =>
          buildDashboard(settings, transactions, subscriptions)
      ),
    []
  );
  const [data] = useLiveData(loader);

  if (!data) return <div className="text-ink/50">Loading your real numbers…</div>;

  const { settings, metrics, expenses, subscriptions, compound } = data;
  const maxCat = Math.max(1, ...CATEGORIES.map((c) => expenses[c] || 0));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Your 15-Minute Command Dashboard</h1>
        <p className="text-sm text-ink/60">
          You can't fix what you can't see. Here are your real numbers.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Take-Home Income" value={`$${settings.monthlyTakeHome}`} />
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
          value={`$${subscriptions.recovered}`}
          tone="positive"
          hint="from cut/merged subs"
        />
      </div>

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

      <Card className="bg-ink text-cream">
        <div className="font-semibold mb-2">Opportunity Cost Compounder</div>
        <p className="text-sm text-cream/70">
          If you invest the <b>${compound.recovered}</b>/mo you've recovered at 7%:
        </p>
        <div className="mt-3 flex gap-8">
          <div>
            <div className="text-2xl font-extrabold text-positive">${compound.tenYear.toLocaleString()}</div>
            <div className="text-xs text-cream/60">in 10 years</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-positive">${compound.twentyYear.toLocaleString()}</div>
            <div className="text-xs text-cream/60">in 20 years</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-positive">${compound.thirtyYear.toLocaleString()}</div>
            <div className="text-xs text-cream/60">in 30 years</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
