import React, { useState } from "react";
import { Button, Card, Badge } from "./ui.jsx";
import { parseBankCSV } from "../lib/csvParser.js";
import { categorizeTransactions } from "../lib/categorizer.js";
import { useSettings } from "../context/SettingsContext.jsx";
import { useMoneyLens } from "../context/MoneyLensContext.jsx";

const SAMPLE = `date,description,amount
2026-01-02,SQ *COFFEE,4.50
2026-01-03,NETFLIX.COM,15.99
2026-01-05,WHOLE FOODS MARKET,86.20
2026-01-06,UBER TRIP,23.10`;

export default function ImportPanel() {
  const { settings } = useSettings();
  const { addTransactions } = useMoneyLens();
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
      const rows = parseBankCSV(text);
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
      const rows = parseBankCSV(text);
      const result = await categorizeTransactions(rows, settings?.openaiApiKey);
      const n = await addTransactions(result);
      setMsg(`Imported ${n} transactions.`);
      setPreview(null);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="font-semibold mb-1">Bring in your bank data</div>
      <p className="text-sm text-ink/60 mb-3">
        Paste 3 months of bank CSV (date, description, amount) or drop the file. It stays on this
        device only — nothing is uploaded.
      </p>
      <div className="flex items-center gap-3 mb-3">
        <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm" />
        {fileName && <span className="text-xs text-ink/50">{fileName}</span>}
      </div>
      <textarea
        className="w-full h-40 rounded-lg border border-ink/20 bg-white p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-teal"
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

      {preview && (
        <div className="mt-4">
          <div className="font-semibold mb-1">Preview ({preview.length} rows)</div>
          <p className="text-sm text-ink/50 mb-3">
            We guessed the right box for each. Any with a "?" is one we weren't sure about — you can
            check those.
          </p>
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
        </div>
      )}
    </Card>
  );
}
