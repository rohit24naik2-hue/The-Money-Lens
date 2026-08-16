import React, { useState } from "react";
import { Button, Card } from "../components/ui.jsx";

const PROMPT = `Categorize my bank transactions.

Use exactly these categories, one per row:
Rent, Food, Subscriptions, Transport, Fun, Other

Rules:
- Keep ALL of my original rows (date, description, amount). Do not drop or merge them.
- Add a new "Category" column.
- If a description is unclear, make your best guess and mark it with a "?" (e.g., "Other?").
- Merge merchant variants (e.g., "SQ FOODTRUCK" and "SQUARE FOOD TRUCK") so totals are real.
- Return the result as a table.

Example rows to learn from:
2026-01-02, SQ *COFFEE, 4.50 → Food
2026-01-03, NETFLIX.COM, 15.99 → Subscriptions

My transactions:
[paste your CSV rows here — date, description, amount]`;

const TEMPLATE_CSV = `Date,Description,Amount,Category
2026-01-02,SQ *COFFEE,4.50,Food
2026-01-03,NETFLIX.COM,15.99,Subscriptions
2026-01-05,WHOLE FOODS MARKET,86.20,Food
2026-01-06,UBER TRIP,23.10,Transport
2026-01-08,Zelle Rent,1400.00,Rent
2026-01-09,CHIPOTLE,18.20,Fun
2026-01-12,SPOTIFY,10.99,Subscriptions
2026-01-15,AMAZON,42.10,Other
2026-01-18,SHELL GAS,38.40,Transport
2026-01-22,DOORDASH,31.50,Food
2026-01-25,GYM MEMBERSHIP,29.00,Subscriptions
2026-01-28,CINEMARK,16.00,Fun

Category,Monthly Budget,Spent,Status
Rent,1400,=SUMIF(D:D,A16,C:C),=IF(C16>B16,"Over","OK")
Food,600,=SUMIF(D:D,A17,C:C),=IF(C17>B17,"Over","OK")
Subscriptions,120,=SUMIF(D:D,A18,C:C),=IF(C18>B18,"Over","OK")
Transport,200,=SUMIF(D:D,A19,C:C),=IF(C19>B19,"Over","OK")
Fun,400,=SUMIF(D:D,A20,C:C),=IF(C20>B20,"Over","OK")
Other,300,=SUMIF(D:D,A21,C:C),=IF(C21>B21,"Over","OK")`;

export default function Assets() {
  const [copied, setCopied] = useState(false);

  function copyPrompt() {
    navigator.clipboard?.writeText(PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function downloadCsv() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "money-lens-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Assets</h1>
        <p className="text-sm text-ink/60">
          The free tools from the video — the categorization prompt and the spreadsheet template —
          ready to copy and download.
        </p>
      </header>

      <Card>
        <div className="font-semibold mb-1">Categorization prompt</div>
        <p className="text-sm text-ink/60 mb-3">
          Paste this into any AI chat, add your CSV rows, and get a clean Category column in seconds.
        </p>
        <pre className="bg-ink/5 rounded-lg p-3 text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto">
{PROMPT}
        </pre>
        <div className="mt-3">
          <Button variant="teal" onClick={copyPrompt}>
            {copied ? "Copied!" : "Copy prompt"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="font-semibold mb-1">Spreadsheet template</div>
        <p className="text-sm text-ink/60 mb-3">
          A ready-made Google Sheet: paste your transactions, set a monthly budget per category, and the
          <span className="font-mono"> Spent</span> and <span className="font-mono">Status</span> columns
          calculate themselves (red "Over" when you blow the budget).
        </p>
        <ol className="text-sm text-ink/70 list-decimal list-inside space-y-1 mb-3">
          <li>Click below to download <span className="font-mono">money-lens-template.csv</span>.</li>
          <li>In Google Sheets: <b>File → Import → Upload</b> the file.</li>
          <li>Replace the sample rows with your own, set your budgets, and add a red conditional-format rule on <span className="font-mono">Status</span>.</li>
        </ol>
        <Button variant="teal" onClick={downloadCsv}>
          Download template (.csv)
        </Button>
      </Card>
    </div>
  );
}
