import React, { useState } from "react";
import Papa from "papaparse";
import { Button, Card, Badge } from "../components/ui.jsx";
import { categorizeTransactions } from "../lib/categorizer.js";
import { importTransactions } from "../lib/store.js";
import { useSettings } from "../context/SettingsContext.jsx";

const SAMPLE = `date,description,amount
2026-01-02,SQ *COFFEE,4.50
2026-01-03,NETFLIX.COM,15.99
2026-01-05,WHOLE FOODS MARKET,86.20
2026-01-06,UBER TRIP,23.10`;

export default function Import() {
  const { settings } = useSettings();
  const [text, setText] = useState(SAMPLE);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    f.text().then(setText);
  }

  async function previewCategorize() {
    setBusy(true);
    setMsg("");
    try {
      const rows = parseRows(text);
      const result = await categorizeTransactions(rows, settings?.openaiApiKey);
      setPreview(result);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    setBusy(true);
    setMsg("");
    try {
      const rows = parseRows(text);
      const result = await categorizeTransactions(rows, settings?.openaiApiKey);
      const n = await importTransactions(result);
      setMsg(`Imported ${n} transactions.`);
      setPreview(null);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Zero-Permission CSV Import</h1>
        <p className="text-sm text-ink/60">
          Drop in 3 months of bank CSV (date, description, amount). Stays on this device — nothing is
          uploaded. The Lens normalizes merchants and applies the 6 standard buckets.
        </p>
      </header>

      <Card>
        <div className="flex items-center gap-3 mb-3">
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm" />
          {fileName && <span className="text-xs text-ink/50">{fileName}</span>}
        </div>
        <textarea
          className="w-full h-56 rounded-lg border border-ink/20 bg-white p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-teal"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex gap-3">
          <Button onClick={previewCategorize} disabled={busy}>
            {busy ? "…" : "Preview categorization"}
          </Button>
          <Button variant="teal" onClick={doImport} disabled={busy}>
            Import
          </Button>
        </div>
        {msg && <div className="mt-3 text-sm text-teal">{msg}</div>}
      </Card>

      {preview && (
        <Card>
          <div className="font-semibold mb-3">Preview ({preview.length} rows)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink/50 border-b">
                  <th className="py-2">Merchant</th>
                  <th>Category</th>
                  <th>Review?</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-b border-ink/5">
                    <td className="py-1.5">{r.cleanMerchant}</td>
                    <td>
                      <Badge tone="teal">{r.category}</Badge>
                    </td>
                    <td>{r.needsReview ? <Badge tone="amber">?</Badge> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// Parse pasted CSV (date, description, amount) into row objects.
function parseRows(text) {
  const parsed = Papa.parse(text.trim(), { skipEmptyLines: true });
  const lines = parsed.data;
  if (!lines.length) return [];
  const header = lines[0].map((c) => String(c).toLowerCase());
  const dateIdx = header.findIndex((h) => h.includes("date"));
  const amtIdx = header.findIndex((h) => h.includes("amount"));
  const start = header.length >= 2 ? 1 : 0;

  const rows = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i];
    if (!Array.isArray(cols) || cols.length < 2) continue;
    const descCols =
      dateIdx >= 0
        ? cols.filter((_, idx) => idx !== dateIdx && idx !== amtIdx)
        : cols.slice(0, -1);
    rows.push({
      date: dateIdx >= 0 ? cols[dateIdx] : cols[0],
      rawDescription: descCols.join(" ").trim(),
      amount: amtIdx >= 0 ? parseFloat(cols[amtIdx]) || 0 : 0,
    });
  }
  return rows;
}
