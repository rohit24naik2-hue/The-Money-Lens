import db, { SETTINGS_ID } from "./db.js";
import {
  sumByCategory,
  calculateFinancialMetrics,
  calculateCompoundValue,
  toMonthly,
  isGhostSubscription,
  CATEGORIES,
} from "./finance.js";

const uid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Reactivity: every mutation dispatches a window event so any view listening
// (see useLiveData) re-renders live without a page refresh.
import { notifyDataChanged } from "./events.js";

// ---------- Settings ----------
export async function loadSettings() {
  return db.settings.get(SETTINGS_ID);
}
export async function saveSettings(settings) {
  const r = await db.settings.put({ id: SETTINGS_ID, ...settings });
  notifyDataChanged();
  return r;
}

// ---------- Transactions ----------
export async function loadTransactions() {
  return db.transactions.toArray();
}
export async function importTransactions(rows) {
  const txns = rows.map((r) => ({
    id: uid(),
    date: r.date || new Date().toISOString().slice(0, 10),
    rawDescription: r.rawDescription || "",
    cleanMerchant: r.cleanMerchant || r.rawDescription || "",
    amount: Number(r.amount) || 0,
    category: CATEGORIES.includes(r.category) ? r.category : "OTHER",
    intent: r.intent || null,
    needsReview: !!r.needsReview,
  }));
  await db.transactions.bulkAdd(txns);
  notifyDataChanged();
  return txns.length;
}
export async function updateTransaction(id, patch) {
  const r = await db.transactions.update(id, patch);
  notifyDataChanged();
  return r;
}
export async function clearTransactions() {
  const r = await db.transactions.clear();
  notifyDataChanged();
  return r;
}

// ---------- Subscriptions ----------
export async function loadSubscriptions() {
  const subs = await db.subscriptions.toArray();
  const now = Date.now();
  return subs.map((s) => ({
    ...s,
    monthlyCost: toMonthly(s.cost, s.billingCycle),
    ghost: isGhostSubscription(s, now),
  }));
}
export async function addSubscription(data) {
  const id = uid();
  await db.subscriptions.add({ id, ...data });
  notifyDataChanged();
  return id;
}
export async function updateSubscription(id, patch) {
  const r = await db.subscriptions.update(id, patch);
  notifyDataChanged();
  return r;
}
export async function deleteSubscription(id) {
  const r = await db.subscriptions.delete(id);
  notifyDataChanged();
  return r;
}

// Detect likely recurring subscriptions from imported transactions so the
// Subscriptions tab is never empty after a CSV import. Groups transactions
// already tagged SUBSCRIPTIONS by merchant and estimates a monthly cost.
export async function detectSubscriptionsFromTransactions() {
  const txns = await loadTransactions();
  const groups = {};
  for (const t of txns) {
    if (t.category !== "SUBSCRIPTIONS") continue;
    const key = (t.cleanMerchant || t.rawDescription || "").trim();
    if (!key) continue;
    if (!groups[key]) groups[key] = { name: key, total: 0, count: 0, months: new Set() };
    groups[key].total += Number(t.amount) || 0;
    groups[key].count += 1;
    groups[key].months.add((t.date || "").slice(0, 7));
  }
  const result = Object.values(groups)
    .filter((g) => g.count >= 2)
    .map((g) => {
      const months = g.months.size || 1;
      return {
        name: g.name,
        count: g.count,
        avgAmount: Math.round((g.total / g.count) * 100) / 100,
        perMonth: Math.round(g.total / months),
      };
    })
    .sort((a, b) => b.perMonth - a.perMonth);
  return result;
}

// ---------- Sinking funds ----------
export async function loadSinkingFunds() {
  return db.sinkingFunds.toArray();
}
export async function addSinkingFund(data) {
  const id = uid();
  await db.sinkingFunds.add({ id, ...data });
  notifyDataChanged();
  return id;
}
export async function updateSinkingFund(id, patch) {
  const r = await db.sinkingFunds.update(id, patch);
  notifyDataChanged();
  return r;
}

// ---------- Decision logs ----------
export async function loadDecisions() {
  return db.decisionLogs.toArray();
}
export async function addDecision(data) {
  const id = uid();
  await db.decisionLogs.add({ id, date: new Date().toISOString().slice(0, 10), ...data });
  notifyDataChanged();
  return id;
}
export async function deleteDecision(id) {
  const r = await db.decisionLogs.delete(id);
  notifyDataChanged();
  return r;
}

// ---------- Derived dashboard ----------
export function buildDashboard(settings, transactions, subscriptions) {
  transactions = transactions || [];
  subscriptions = subscriptions || [];
  const takeHome = Number(settings?.monthlyTakeHome) || 0;
  const rate = Number(settings?.hourlyRate) || 0;
  const expenses = sumByCategory(transactions.filter((t) => t.amount >= 0));
  const metrics = calculateFinancialMetrics(takeHome, expenses);
  const totalSubMonthly = subscriptions.reduce((a, s) => a + (s.monthlyCost || 0), 0);
  const recovered = subscriptions
    .filter((s) => s.status === "CUT" || s.status === "MERGE")
    .reduce((a, s) => a + (s.monthlyCost || 0), 0);
  const tenYear = Math.round(calculateCompoundValue(recovered, 10));
  const twentyYear = Math.round(calculateCompoundValue(recovered, 20));
  const thirtyYear = Math.round(calculateCompoundValue(recovered, 30));
  return {
    settings: { ...settings, hourlyBillableRate: rate },
    metrics,
    expenses,
    subscriptions: { totalMonthly: Math.round(totalSubMonthly), recovered: Math.round(recovered) },
    compound: { recovered: Math.round(recovered), tenYear, twentyYear, thirtyYear },
  };
}

// ---------- Backup / restore ----------
export async function exportData() {
  const [settings, transactions, subscriptions, sinkingFunds, decisionLogs] = await Promise.all([
    db.settings.toArray(),
    db.transactions.toArray(),
    db.subscriptions.toArray(),
    db.sinkingFunds.toArray(),
    db.decisionLogs.toArray(),
  ]);
  return JSON.stringify(
    { version: 1, settings, transactions, subscriptions, sinkingFunds, decisionLogs },
    null,
    2
  );
}
export async function importData(json) {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  if (data.settings) await db.settings.bulkPut(data.settings);
  if (Array.isArray(data.transactions)) await db.transactions.bulkPut(data.transactions);
  if (Array.isArray(data.subscriptions)) await db.subscriptions.bulkPut(data.subscriptions);
  if (Array.isArray(data.sinkingFunds)) await db.sinkingFunds.bulkPut(data.sinkingFunds);
  if (Array.isArray(data.decisionLogs)) await db.decisionLogs.bulkPut(data.decisionLogs);
  notifyDataChanged();
}
export async function clearAll() {
  await Promise.all([
    db.settings.clear(),
    db.transactions.clear(),
    db.subscriptions.clear(),
    db.sinkingFunds.clear(),
    db.decisionLogs.clear(),
  ]);
  notifyDataChanged();
}

export { uid };

// ---------- Demo data seed ----------
// Populates all stores with realistic, varied entries so the app isn't empty.
export async function seedDemoData() {
  const day = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };

  await clearAll();

  const settings = {
    id: SETTINGS_ID,
    monthlyTakeHome: 5200,
    monthlyRent: 1800,
    hourlyRate: 35,
    openaiApiKey: "",
  };

  // Transactions across all 6 categories, spread over ~90 days.
  const raw = [
    // RENT
    ["Zelle Rent", "RENT", 1800, 1],
    ["Zelle Rent", "RENT", 1800, 31],
    ["Zelle Rent", "RENT", 1800, 61],
    // FOOD
    ["SQ *WHOLE FOODS", "FOOD", 86.2, 2],
    ["CHIPOTLE", "FOOD", 13.5, 5],
    ["SQ *FARMERS MKT", "FOOD", 42.0, 9],
    ["UBER EATS", "FOOD", 28.4, 12],
    ["TRADER JOE'S", "FOOD", 64.1, 16],
    ["SQ *COFFEE", "FOOD", 4.5, 19],
    ["DOORDASH", "FOOD", 31.7, 23],
    ["SQ *WHOLE FOODS", "FOOD", 91.3, 27],
    ["CHIPOTLE", "FOOD", 13.5, 33],
    ["SQ *FARMERS MKT", "FOOD", 38.6, 37],
    ["UBER EATS", "FOOD", 25.9, 41],
    ["TRADER JOE'S", "FOOD", 59.8, 45],
    ["SQ *COFFEE", "FOOD", 4.5, 49],
    ["DOORDASH", "FOOD", 22.1, 52],
    ["SQ *WHOLE FOODS", "FOOD", 88.0, 56],
    ["CHIPOTLE", "FOOD", 13.5, 60],
    ["SQ *FARMERS MKT", "FOOD", 44.2, 64],
    ["UBER EATS", "FOOD", 29.3, 68],
    ["TRADER JOE'S", "FOOD", 61.7, 72],
    ["SQ *COFFEE", "FOOD", 4.5, 76],
    ["DOORDASH", "FOOD", 27.4, 80],
    ["SQ *WHOLE FOODS", "FOOD", 79.9, 84],
    ["CHIPOTLE", "FOOD", 13.5, 88],
    // SUBSCRIPTIONS
    ["NETFLIX.COM", "SUBSCRIPTIONS", 15.99, 3],
    ["SPOTIFY", "SUBSCRIPTIONS", 11.99, 6],
    ["DISNEY+", "SUBSCRIPTIONS", 13.99, 8],
    ["ADOBE CC", "SUBSCRIPTIONS", 54.99, 11],
    ["HELLOFRESH", "SUBSCRIPTIONS", 59.99, 14],
    ["DROPBOX", "SUBSCRIPTIONS", 9.99, 20],
    ["GYM POWERHOUSE", "SUBSCRIPTIONS", 39.99, 26],
    ["MEDITATION APP", "SUBSCRIPTIONS", 12.99, 30],
    ["NETFLIX.COM", "SUBSCRIPTIONS", 15.99, 33],
    ["SPOTIFY", "SUBSCRIPTIONS", 11.99, 36],
    ["DISNEY+", "SUBSCRIPTIONS", 13.99, 38],
    ["HELLOFRESH", "SUBSCRIPTIONS", 59.99, 44],
    ["GYM POWERHOUSE", "SUBSCRIPTIONS", 39.99, 56],
    ["MEDITATION APP", "SUBSCRIPTIONS", 12.99, 60],
    ["NETFLIX.COM", "SUBSCRIPTIONS", 15.99, 63],
    ["SPOTIFY", "SUBSCRIPTIONS", 11.99, 66],
    ["DISNEY+", "SUBSCRIPTIONS", 13.99, 68],
    ["DROPBOX", "SUBSCRIPTIONS", 9.99, 80],
    ["GYM POWERHOUSE", "SUBSCRIPTIONS", 39.99, 86],
    // TRANSPORT
    ["SHELL GAS", "TRANSPORT", 48.2, 4],
    ["UBER TRIP", "TRANSPORT", 23.1, 7],
    ["LYFT", "TRANSPORT", 19.4, 15],
    ["SHELL GAS", "TRANSPORT", 51.0, 21],
    ["METRO CARD", "TRANSPORT", 60.0, 28],
    ["UBER TRIP", "TRANSPORT", 17.8, 35],
    ["SHELL GAS", "TRANSPORT", 46.9, 42],
    ["LYFT", "TRANSPORT", 21.3, 50],
    ["METRO CARD", "TRANSPORT", 60.0, 58],
    ["UBER TRIP", "TRANSPORT", 24.6, 66],
    ["SHELL GAS", "TRANSPORT", 49.7, 74],
    ["LYFT", "TRANSPORT", 18.9, 82],
    ["METRO CARD", "TRANSPORT", 60.0, 90],
    // FUN
    ["STEAM GAMES", "FUN", 29.99, 10],
    ["AMAZON MP3", "FUN", 14.5, 13],
    ["AMC THEATERS", "FUN", 32.0, 18],
    ["STEAM GAMES", "FUN", 19.99, 25],
    ["CONCERT TIX", "FUN", 75.0, 39],
    ["AMAZON MP3", "FUN", 12.0, 47],
    ["AMC THEATERS", "FUN", 32.0, 55],
    ["STEAM GAMES", "FUN", 24.99, 62],
    ["BOWLING", "FUN", 28.0, 70],
    ["CONCERT TIX", "FUN", 65.0, 78],
    ["AMAZON MP3", "FUN", 13.5, 85],
    ["AMC THEATERS", "FUN", 32.0, 89],
    // OTHER
    ["AMAZON.COM", "OTHER", 42.3, 1],
    ["WALGREENS PHARM", "OTHER", 18.7, 17],
    ["IKEA", "OTHER", 134.5, 29],
    ["AMAZON.COM", "OTHER", 27.9, 46],
    ["DRYWALL SUPPLY", "OTHER", 61.2, 53],
    ["WALGREENS PHARM", "OTHER", 22.4, 71],
    ["AMAZON.COM", "OTHER", 39.8, 83],
  ];
  const transactions = raw.map(([cleanMerchant, category, amount, off]) => ({
    id: uid(),
    date: day(off),
    rawDescription: cleanMerchant,
    cleanMerchant,
    amount,
    category,
    intent: null,
    needsReview: false,
  }));

  const ghostDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };
  const subscriptions = [
    { id: uid(), name: "Netflix", cost: 15.99, billingCycle: "MONTHLY", status: "KEEP", lastUsedDate: ghostDate(2) },
    { id: uid(), name: "Spotify", cost: 11.99, billingCycle: "MONTHLY", status: "KEEP", lastUsedDate: ghostDate(1) },
    { id: uid(), name: "Disney+", cost: 13.99, billingCycle: "MONTHLY", status: "KEEP", lastUsedDate: ghostDate(3) },
    { id: uid(), name: "Adobe Creative Cloud", cost: 54.99, billingCycle: "MONTHLY", status: "MERGE", mergedInto: "Canva Pro", lastUsedDate: ghostDate(10) },
    { id: uid(), name: "HelloFresh", cost: 59.99, billingCycle: "MONTHLY", status: "CUT", lastUsedDate: ghostDate(20) },
    { id: uid(), name: "Dropbox Plus", cost: 119.88, billingCycle: "ANNUALLY", status: "KEEP", lastUsedDate: ghostDate(5) },
    { id: uid(), name: "Powerhouse Gym", cost: 39.99, billingCycle: "MONTHLY", status: "CUT", lastUsedDate: ghostDate(75) },
    { id: uid(), name: "Calm Meditation", cost: 12.99, billingCycle: "MONTHLY", status: "CUT", lastUsedDate: ghostDate(48) },
  ];

  const sinkingFunds = [
    { id: uid(), name: "Car repair", targetAmount: 1200, targetDate: day(-240), monthlySetAside: 120 },
    { id: uid(), name: "Vacation", targetAmount: 3000, targetDate: day(-360), monthlySetAside: 200 },
    { id: uid(), name: "Holiday gifts", targetAmount: 800, targetDate: day(-150), monthlySetAside: 100 },
  ];

  const decisionLogs = [
    { id: uid(), date: day(8), lensId: "lenses", text: "Kept annual Dropbox ($119.88) vs $119.88/mo — obvious win", verdict: "kept" },
    { id: uid(), name: "decision", date: day(22), lensId: "lenses", text: "Skipped $200 sneakers — that's ~6 hours of life", verdict: "skipped" },
    { id: uid(), date: day(40), lensId: "lenses", text: "Renting keeps flexibility: $1800/mo vs ~$2400 to own", verdict: "rent" },
  ];

  await db.settings.put(settings);
  await db.transactions.bulkPut(transactions);
  await db.subscriptions.bulkPut(subscriptions);
  await db.sinkingFunds.bulkPut(sinkingFunds);
  await db.decisionLogs.bulkPut(decisionLogs);
  notifyDataChanged();

  return {
    transactions: transactions.length,
    subscriptions: subscriptions.length,
    sinkingFunds: sinkingFunds.length,
    decisionLogs: decisionLogs.length,
  };
}
