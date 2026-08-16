import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";
import { Button } from "./ui.jsx";
import DataControls from "./DataControls.jsx";
import { clearAll } from "../lib/store.js";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/subscriptions", label: "Subscriptions" },
  { to: "/capital", label: "Capital Plan" },
  { to: "/lenses", label: "The Crossovers" },
];

export default function Layout({ children }) {
  const { setEditing, loadSettings } = useSettings();
  const [showData, setShowData] = useState(false);

  async function doReset() {
    if (!confirm("Reset ALL data? This erases every transaction, subscription, and your settings, and returns you to setup. This cannot be undone.")) return;
    await clearAll();
    await loadSettings();
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 bg-ink text-cream flex flex-col">
        <div className="px-5 py-6">
          <div className="text-lg font-extrabold tracking-tight">The Money Lens</div>
          <div className="text-xs text-cream/60 mt-1">You can't fix what you can't see.</div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-energy text-white" : "text-cream/80 hover:bg-cream/10"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={doReset}
            className="block w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20"
          >
            Reset all data
          </button>
        </nav>
        <div className="px-5 py-4 space-y-2">
          <Button
            variant="ghost"
            className="w-full text-cream border-cream/30"
            onClick={() => setEditing(true)}
          >
            Edit setup
          </Button>
          <Button
            variant="ghost"
            className="w-full text-cream border-cream/30"
            onClick={() => setShowData((s) => !s)}
          >
            {showData ? "Hide data tools" : "Data & backup"}
          </Button>
          {showData && (
            <div className="rounded-lg bg-cream/10 p-3">
              <DataControls />
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
