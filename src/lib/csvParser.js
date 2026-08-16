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

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const pad = (n) => String(n).padStart(2, "0");
const expandYear = (y) => (String(y).length === 2 ? (parseInt(y, 10) < 70 ? `20${y}` : `19${y}`) : String(y));

// Normalize a variety of date formats to ISO YYYY-MM-DD for sorting/filtering.
export function normalizeDate(raw) {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const s = String(raw).trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s);
  if (m) {
    let y = expandYear(m[3]);
    let mo = pad(m[1]);
    let d = pad(m[2]);
    if (parseInt(m[1], 10) > 12 && parseInt(m[2], 10) <= 12) {
      mo = pad(m[2]);
      d = pad(m[1]);
    }
    return `${y}-${mo}-${d}`;
  }
  m = /([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})/.exec(s);
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mo !== undefined) return `${expandYear(m[3])}-${pad(mo + 1)}-${pad(m[2])}`;
  }
  m = /(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})/.exec(s);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo !== undefined) return `${expandYear(m[3])}-${pad(mo + 1)}-${pad(m[1])}`;
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

// --- Free-form / "any format" extraction -------------------------------------
// Handles pasted bank statements, receipt text, or PDF/copy-paste dumps that are
// NOT clean delimited CSV: e.g. "Dec 24, 2025 STARBUCKS 5.75" or
// "2025-12-25 AMAZON.COM 49.99" or "12/26/2025 UBER 23.40". We still route real
// CSV through parseBankCSV so its column mapping stays intact.

const DATE_PATTERNS = [
  /\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/,
  /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/,
  /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}\b/,
  /\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4}\b/,
  /\b[A-Za-z]{3,9}\s+\d{1,2}\b/,
];

function findDate(line) {
  for (const re of DATE_PATTERNS) {
    const m = re.exec(line);
    if (!m) continue;
    let value = m[0];
    // Month-name-only match: look for a year elsewhere in the line.
    if (!/\d{4}/.test(value)) {
      const y = /\b(19|20)\d{2}\b/.exec(line);
      if (y) value = `${value} ${y[0]}`;
    }
    return { value, index: m.index };
  }
  return null;
}

function findAmount(s) {
  const re = /[-+]?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\(\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\s?\)/g;
  let m;
  const cands = [];
  while ((m = re.exec(s))) {
    const v = m[0];
    const digits = v.replace(/[^0-9.]/g, "");
    const isYearish = /^\d{4}$/.test(digits) && parseInt(digits, 10) > 1900 && parseInt(digits, 10) < 2100;
    if (isYearish) continue;
    const before = s.slice(0, m.index).trim().slice(-3).toUpperCase();
    const after = s.slice(m.index + v.length).trim().slice(0, 3).toUpperCase();
    let neg = /\(.*\)/.test(v) || /^\s*-/.test(v);
    if (after.startsWith("DR")) neg = true;
    if (after.startsWith("CR")) neg = false;
    if (before.endsWith("DR")) neg = true;
    if (before.endsWith("CR")) neg = false;
    cands.push({
      value: v,
      index: m.index,
      neg,
      hasMoney: /[\$,.]/.test(v),
      decimals: (digits.split(".")[1] || "").length,
    });
  }
  if (cands.length === 0) return null;
  const money = cands.filter((c) => c.hasMoney);
  const chosen = money.length
    ? money[0]
    : cands.length === 1
      ? cands[0]
      : cands.find((c) => c.decimals === 2) || cands[0];
  return chosen;
}

function extractLine(line) {
  const dateRes = findDate(line);
  if (!dateRes) return null;
  const iso = normalizeDate(dateRes.value);
  if (!iso) return null;

  const withoutDate =
    line.slice(0, dateRes.index) + " " + line.slice(dateRes.index + dateRes.value.length);
  const amtRes = findAmount(withoutDate);
  if (!amtRes) return null;

  const amount = Math.abs(normalizeAmount(amtRes.value)) * (amtRes.neg ? -1 : 1);
  const withoutAmt =
    withoutDate.slice(0, amtRes.index) + " " + withoutDate.slice(amtRes.index + amtRes.value.length);
  let description = withoutAmt
    .replace(/\b(CR|DR)\b/gi, " ")
    .replace(/[\s|#:.\-–—,]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!description) description = "Unknown Merchant";

  const category = categorizeTransaction(description);
  const cleanMerchant = cleanMerchantName(description);
  return {
    id: (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: iso,
    rawDescription: description,
    cleanMerchant,
    amount: Math.abs(amount),
    category: CATEGORIES.includes(category) ? category : "OTHER",
    needsReview: category === "OTHER",
    intent: null,
  };
}

function looksLikeDelimited(text) {
  const firstLine = (text.split(/\r?\n/)[0] || "").trim();
  const headerLike =
    /date|description|amount|merchant|payee|transaction|post\s*date|debit|credit/i.test(firstLine);
  const delim = /[,;\t]/.test(firstLine);
  return headerLike && delim;
}

// Top-level entry: route clean CSV through the column mapper, otherwise attempt
// per-line free-form extraction. Returns the same row shape as parseBankCSV.
export function parseAnyFormat(raw) {
  const text = (raw || "").trim();
  if (!text) return [];
  if (looksLikeDelimited(text)) return parseBankCSV(text);
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(extractLine)
    .filter(Boolean);
}
