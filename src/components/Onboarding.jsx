import React, { useState } from "react";
import { useSettings } from "../context/SettingsContext.jsx";
import { Button, Input, Label, Card } from "./ui.jsx";

// Shown on first load (no saved settings) and when the user opens Settings.
export default function Onboarding() {
  const { settings, setSettings, setEditing } = useSettings();
  const [form, setForm] = useState({
    monthlyTakeHome: settings?.monthlyTakeHome || "",
    hourlyBillableRate: settings?.hourlyBillableRate || "",
    baseCurrency: settings?.baseCurrency || "USD",
    openaiApiKey: settings?.openaiApiKey || "",
  });

  function submit(e) {
    e.preventDefault();
    setSettings({
      monthlyTakeHome: Number(form.monthlyTakeHome) || 0,
      hourlyBillableRate: Number(form.hourlyBillableRate) || null,
      baseCurrency: form.baseCurrency,
      openaiApiKey: form.openaiApiKey || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <Card className="w-full max-w-md">
        <h2 className="text-xl font-extrabold">Welcome to The Money Lens</h2>
        <p className="text-sm text-ink/60 mt-1">
          Privacy-first: everything stays in your browser. No account, no server.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div>
            <Label>Monthly take-home income ($)</Label>
            <Input
              type="number"
              required
              value={form.monthlyTakeHome}
              onChange={(e) => setForm({ ...form, monthlyTakeHome: e.target.value })}
            />
          </div>
          <div>
            <Label>Hourly billable rate ($) — for AI-tool math (optional)</Label>
            <Input
              type="number"
              value={form.hourlyBillableRate}
              onChange={(e) => setForm({ ...form, hourlyBillableRate: e.target.value })}
            />
          </div>
          <div>
            <Label>OpenAI API key (optional — enables smart categorization)</Label>
            <Input
              type="password"
              placeholder="sk-…"
              value={form.openaiApiKey}
              onChange={(e) => setForm({ ...form, openaiApiKey: e.target.value })}
            />
            <p className="text-xs text-ink/40 mt-1">
              Stored only in this browser. Leave blank to use the built-in offline categorizer.
            </p>
          </div>
          <Button type="submit" className="w-full">
            Start the 15-minute review
          </Button>
        </form>
      </Card>
    </div>
  );
}
