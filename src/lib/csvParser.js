// Robust client-side bank CSV parsing, merchant normalization, and categorization.
// Handles the messy real-world variation banks throw at us: inconsistent headers
// (Date / Trans Date / Post Date), currency symbols ($ , USD), negative amounts,
// and Debit/Credit split columns. No server involved.

import Papa from "papaparse";
import { CATEGORIES } from "./finance.js";

// Strip prefixes/badges banks add so "SQ *COFFEE SHOP" and "SQUARE COFFEE" collapse.
export function cleanMerchantName(raw) {
  if (!raw) return "Unknown";
  let s = String(raw).toUpperCase().trim();
  s = s.replace(/^(SQ\*|SQ\s*\*|TST\*|TST\s*\*|PAYPAL\*|PAYPAL\s*\*|SP\*|SP\s*\*|POS\*|POS\s*\*|ACH\s*\*?)/, "");
  s = s.replace(/#\d+|\bSTORE\s*\d+\b|\.\s*COM\b|\bLLC\b|\bINC\b|\bCO\b/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s || "Unknown";
}

const CATEGORY_RULES = [
  [/RENT|REALTY|MORTGAGE|CON EDISON|UTILITY|WATER|HOA|LANDLORD/i, "RENT"],
  [/WHOLE FOODS|TRADER|CHIPOTLE|SAFEWAY|COFFEE|IN-N-OUT|PANERA|FOOD|GROCERY|BAKERY|DOORDASH|UBER EATS|RESTAURANT|MARKET|DINING/i, "FOOD"],
  [/NETFLIX|SPOTIFY|APPLE|OPENAI|HULU|NOTION|NYTIMES|PRIME|XFINITY|VERIZON|CHATGPT|DISNEY|ADOBE|DROPBOX|SUBSCRIPTION|MEMBERSHIP/i, "SUBSCRIPTIONS"],
  [/UBER|LYFT|CHEVRON|SHELL|GAS|TRANSPORT|PARKING|METRO|TRANSIT|TOLL|FUEL/i, "TRANSPORT"],
  [/STEAM|AMC|SEPHORA|BEST BUY|TARGET|CVS|HOME DEPOT|BARISTA|THEATER|THEATRE|CONCERT|GAMES|BOWLING|HOBBY/i, "FUN"],
];

export function categorizeTransaction(description) {
  const d = (description || "").toUpperCase();
  for (const [re, cat] of CATEGORY_RULES) {
    if (re.test(d)) return cat;
  }
  return "OTHER";
}

// Parse a money string like "$1,234.50", "-4.5", "USD 12" -> positive float.
export function normalizeAmount(raw) {
  if (typeof raw === "number") return Math.abs(raw) || 0;
  const cleaned = String(raw || "0").replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  return Math.abs(n);
}

// Normalize a variety of date formats to ISO YYYY-MM-DD for sorting/filtering.
export function normalizeDate(raw) {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const s = String(raw).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (us) {
    const [, m, d, y] = us;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return s.slice(0, 10);
}

const HEADER_GROUPS = {
  date: ["date", "transactiondate", "transdate", "postdate", "posteddate", "posted", "settlementdate", "valuedate"],
  description: ["description", "name", "payee", "memo", "details", "narration", "merchant", "particulars"],
  amount: ["amount", "amt", "value"],
  debit: ["debit", "withdrawal", "withdrawals", "paidout"],
  credit: ["credit", "deposit", "deposits", "paidin"],
};

function pick(header, group) {
  return group.find((h) => header.includes(h));
}

export function parseBankCSV(input) {
  const parsed = Papa.parse(input, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""),
  });

  const headers = parsed.meta.fields || [];
  const map = {};
  for (const [field, group] of Object.entries(HEADER_GROUPS)) {
    map[field] = pick(headers.join("|"), group);
  }

  const rows = [];
  for (const row of parsed.data) {
    if (!row || typeof row !== "object") continue;

    const date =
      (map.date && row[map.date]) ||
      (row["date"]) ||
      new Date().toISOString().slice(0, 10);

    const rawDescription =
      (map.description && row[map.description]) ||
      row["description"] ||
      row["name"] ||
      "Unknown Merchant";

    let amount = 0;
    if (map.amount && row[map.amount] !== undefined && row[map.amount] !== "") {
      amount = normalizeAmount(row[map.amount]);
    } else {
      const debit = map.debit && row[map.debit] ? normalizeAmount(row[map.debit]) : 0;
      const credit = map.credit && row[map.credit] ? normalizeAmount(row[map.credit]) : 0;
      amount = Math.max(debit, credit);
    }

    const category = categorizeTransaction(rawDescription);
    const cleanMerchant = cleanMerchantName(rawDescription);

    rows.push({
      id: (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: normalizeDate(date),
      rawDescription: String(rawDescription),
      cleanMerchant,
      amount,
      category: CATEGORIES.includes(category) ? category : "OTHER",
      needsReview: category === "OTHER",
      intent: null,
    });
  }
  return rows;
}
