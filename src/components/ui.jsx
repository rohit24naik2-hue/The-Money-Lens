import React from "react";

export function Button({ variant = "primary", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50";
  const variants = {
    primary: "bg-ink text-cream hover:opacity-90",
    accent: "bg-energy text-white hover:opacity-90",
    teal: "bg-teal text-white hover:opacity-90",
    danger: "bg-urgent text-white hover:opacity-90",
    ghost: "bg-transparent text-ink border border-ink/20 hover:bg-ink/5",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", children }) {
  return (
    <div className={`rounded-2xl bg-white/80 border border-ink/10 shadow-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal ${className}`}
      {...props}
    />
  );
}

export function Label({ children, className = "" }) {
  return <label className={`block text-xs font-semibold uppercase tracking-wide text-ink/60 ${className}`}>{children}</label>;
}

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal ${className}`}
      {...props}
    />
  );
}

export function Badge({ tone = "neutral", children }) {
  const tones = {
    neutral: "bg-ink/10 text-ink",
    urgent: "bg-urgent text-white",
    teal: "bg-teal text-white",
    positive: "bg-positive text-white",
    amber: "bg-amber text-ink",
    energy: "bg-energy text-white",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function MetricCard({ label, value, hint, tone = "neutral" }) {
  const tones = {
    neutral: "text-ink",
    urgent: "text-urgent",
    positive: "text-positive",
    teal: "text-teal",
    amber: "text-amber",
  };
  return (
    <Card>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</div>
      <div className={`mt-2 text-3xl font-extrabold ${tones[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink/50">{hint}</div>}
    </Card>
  );
}

export function ProgressBar({ value, max = 100, tone = "teal" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colors = {
    teal: "bg-teal",
    urgent: "bg-urgent",
    positive: "bg-positive",
    amber: "bg-amber",
    energy: "bg-energy",
    ink: "bg-ink",
    neutral: "bg-ink/40",
  };
  return (
    <div className="h-3 w-full rounded-full bg-ink/10 overflow-hidden">
      <div className={`h-full ${colors[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
