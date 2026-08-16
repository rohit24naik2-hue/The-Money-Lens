// Shared financial rules engine — mirrors the philosophy spec.
// Used by both the API (server/lib/finance.js) and the client (src/lib/finance.js).

export const CATEGORIES = [
  "RENT",
  "FOOD",
  "SUBSCRIPTIONS",
  "TRANSPORT",
  "FUN",
  "OTHER",
];

export const SAVINGS_RATE_TARGET = 20; // percent
export const FOOD_FUN_LEAK_THRESHOLD = 40; // percent of take-home
export const COMPOUND_RATE = 0.07; // broad index fund avg
export const CRYPTO_CAP = 0.05; // 5% of portfolio

export function calculateFinancialMetrics(takeHome, expenses) {
  const totalSpent = Object.values(expenses).reduce(
    (a, b) => a + (Number(b) || 0),
    0
  );
  const income = Number(takeHome) || 0;
  const savingsRate =
    income > 0 ? ((income - totalSpent) / income) * 100 : 0;
  const foodFunRatio =
    income > 0
      ? (((expenses.FOOD || 0) + (expenses.FUN || 0)) / income) * 100
      : 0;
  const leakDetected = foodFunRatio > FOOD_FUN_LEAK_THRESHOLD;
  const savingsHealthy = savingsRate >= SAVINGS_RATE_TARGET;
  return {
    totalSpent,
    savingsRate,
    foodFunRatio,
    leakDetected,
    savingsHealthy,
  };
}

export function calculateCompoundValue(monthlyAmount, years, rate = COMPOUND_RATE) {
  const months = years * 12;
  const r = rate / 12;
  if (r === 0) return monthlyAmount * months;
  return monthlyAmount * (((1 + r) ** months - 1) / r);
}

// Sum a list of transactions (each: {amount, type, category}) into category totals.
export function sumByCategory(transactions, categoryKey = "category") {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  for (const t of transactions || []) {
    const cat = (t[categoryKey] || "OTHER").toUpperCase();
    if (cat in totals) totals[cat] += Number(t.amount) || 0;
  }
  return totals;
}

// Monthly cost normalization for subscriptions (annual -> monthly).
export function toMonthly(cost, cycle) {
  const c = Number(cost) || 0;
  return cycle === "ANNUALLY" ? c / 12 : c;
}

// Ghost-fee detection: unused for > 30 days or price hike vs prior (hike handled upstream).
export function isGhostSubscription(sub, now = Date.now()) {
  if (!sub.lastUsedDate) return false;
  const days =
    (now - new Date(sub.lastUsedDate).getTime()) / (1000 * 60 * 60 * 24);
  return days > 30;
}

// AI / SaaS Lens verdict: (Hours Saved/Wk * Hourly Rate * 4) vs Tool Cost.
export function aiToolVerdict({ costMonthly, hoursSavedPerWeek, hourlyRate }) {
  const value = (Number(hoursSavedPerWeek) || 0) * (Number(hourlyRate) || 0) * 4;
  const cost = Number(costMonthly) || 0;
  const net = value - cost;
  return {
    monthlyValue: Math.round(value * 100) / 100,
    monthlyCost: cost,
    net,
    worthIt: net > 0,
  };
}

// Real estate 5-year lens: simple rent-vs-buy cash-flow signal.
export function rentVsBuy({
  homePrice,
  downPct,
  mortgageRate,
  monthlyRent,
  roomRent = 0,
  years = 5,
  closingPct = 0.09,
}) {
  const down = (Number(homePrice) || 0) * (Number(downPct) || 0.2);
  const loan = (Number(homePrice) || 0) - down;
  const r = (Number(mortgageRate) || 0) / 100 / 12;
  const n = 30 * 12;
  const pi =
    r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));
  const ownMonthly = pi + (loan * (Number(closingPct) || 0.09)) / (years * 12);
  const netOwn = ownMonthly - Number(roomRent) || 0;
  return {
    ownMonthly: Math.round(ownMonthly),
    rentMonthly: Math.round(Number(monthlyRent) || 0),
    netOwnWithHouseHack: Math.round(netOwn),
    buyWins: netOwn < Number(monthlyRent),
  };
}

// Crypto guardrail: flags if crypto holding exceeds 5% of total portfolio.
export function cryptoGuardrail({ cryptoValue, totalPortfolio }) {
  const total = Number(totalPortfolio) || 0;
  const crypto = Number(cryptoValue) || 0;
  const pct = total > 0 ? crypto / total : 0;
  return {
    pct: Math.round(pct * 10000) / 100,
    withinCap: pct <= CRYPTO_CAP,
  };
}

// Derive an hourly rate from settings (explicit, else back-solved from take-home).
export function getHourlyRate(settings) {
  if (settings && Number(settings.hourlyRate) > 0) return Number(settings.hourlyRate);
  const takeHome = (settings && Number(settings.monthlyTakeHome)) || 0;
  return Math.round(takeHome / 173); // ~173 working hours/month
}

// Client-friendly crypto guardrail: max monthly crypto spend = 5% of take-home.
export function cryptoMonthlyCap(monthlyTakeHome) {
  const maxPerMonth = Math.round((Number(monthlyTakeHome) || 0) * CRYPTO_CAP);
  return {
    maxPerMonth,
    message:
      maxPerMonth > 0
        ? `Keep crypto to a hard cap of $${maxPerMonth}/mo — under 5% of take-home. Treat it as a lottery ticket, not a plan.`
        : "Set your take-home income to get a crypto guardrail cap.",
  };
}

// Capital priority pipeline allocation suggestion.
export function capitalPipeline({ takeHome, recovered }) {
  return {
    emergencyCushion: Math.round(Number(takeHome) || 0), // 1 month base expenses
    freedMonthly: Math.round(Number(recovered) || 0),
    tenYear: Math.round(calculateCompoundValue(Number(recovered) || 0, 10)),
    twentyYear: Math.round(calculateCompoundValue(Number(recovered) || 0, 20)),
  };
}
