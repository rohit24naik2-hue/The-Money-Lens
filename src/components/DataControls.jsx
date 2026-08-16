import React, { useRef, useState } from "react";
import { Button } from "./ui.jsx";
import { exportData, importData, clearAll, seedDemoData } from "../lib/store.js";

export default function DataControls({ onChanged }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState("");

  async function doExport() {
    const json = await exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "money-lens-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Exported backup.");
  }

  async function doImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      await importData(text);
      setMsg("Imported. Reloading data…");
      onChanged && onChanged();
    } catch {
      setMsg("Import failed — invalid file.");
    }
    e.target.value = "";
  }

  async function doClear() {
    if (!confirm("Erase ALL local data? This cannot be undone.")) return;
    await clearAll();
    setMsg("All local data cleared.");
    onChanged && onChanged();
  }

  async function doSeed() {
    if (!confirm("Replace current data with demo data? This overwrites everything.")) return;
    const r = await seedDemoData();
    setMsg(
      `Seeded: ${r.transactions} transactions, ${r.subscriptions} subs, ${r.sinkingFunds} funds, ${r.decisionLogs} decisions.`
    );
    onChanged && onChanged();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" onClick={doExport}>
        Export JSON
      </Button>
      <Button variant="ghost" onClick={() => fileRef.current?.click()}>
        Import JSON
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={doImport}
      />
      <Button variant="danger" onClick={doClear}>
        Clear all data
      </Button>
      <Button variant="accent" onClick={doSeed}>
        Load demo data
      </Button>
      {msg && <span className="text-xs text-ink/50">{msg}</span>}
    </div>
  );
}
