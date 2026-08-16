// Core finance logic for The Money Lens — grounded in the narration method.

export const CATEGORIES = ['Rent', 'Food', 'Subscriptions', 'Transport', 'Fun', 'Other']
export const SAVINGS_TARGET = 0.20 // 20% target savings rate
export const FORTY_PCT_RULE = 0.40 // Food + Fun > 40% of income = leak

// Keyword → category rules (covers the narration's examples).
const RULES = [
  [/\b(rent|mortgage|landlord)\b/i, 'Rent'],
  [/\b(netflix|spotify|subscription|sub|disney|hulu|yt\s*premium|apple\s*music|prime|adobe|notion|saas|cloud|gym|membership|fitness)\b/i, 'Subscriptions'],
  [/\b(uber|lyft|gas|fuel|transit|metro|train|bus|parking|shell|bp|chevron|car)\b/i, 'Transport'],
  [/\b(restaurant|grocery|food|doordash|uber\s*eats|grubhub|coffee|starbucks|mcdonald|groceries|eating)\b/i, 'Food'],
  [/\b(bar|movie|netflix\s*&\s*fun|game|steam|playstation|xbox|concerts|fun|trip|travel\s*fun|alcohol|beer|wine)\b/i, 'Fun'],
]

export function categorize(desc = '') {
  for (const [re, cat] of RULES) {
    if (re.test(desc)) return cat
  }
  return 'Other'
}

// Apply user-defined merchant rules first (substring match), then the built-in rules.
export function categorizeWith(desc = '', rules = []) {
  const d = (desc || '').toLowerCase()
  for (const r of rules || []) {
    if (r.kw && d.includes(String(r.kw).toLowerCase())) return r.cat
  }
  return categorize(desc)
}

// Normalized merchant key from a description (first clean token).
export function merchantOf(desc = '') {
  const s = String(desc).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim()
  const first = s.split(/\s+/)[0]
  return first || 'other'
}

// Find charges that repeat across months (subscriptions / recurring leaks).
export function detectRecurring(txns = []) {
  const groups = {}
  for (const t of txns) {
    if (!t.amount || t.amount <= 0) continue
    const m = merchantOf(t.desc)
    const amt = Math.round(t.amount)
    const key = `${m}|${amt}`
    if (!groups[key]) groups[key] = { merchant: m, amount: t.amount, months: new Set(), items: [] }
    groups[key].months.add(monthKey(t.date))
    groups[key].items.push(t)
  }
  return Object.values(groups)
    .filter((g) => g.items.length >= 2 && g.months.size >= 2)
    .map((g) => ({
      merchant: g.merchant,
      amount: g.amount,
      count: g.items.length,
      months: g.months.size,
      annual: g.amount * 12,
    }))
    .sort((a, b) => b.annual - a.annual)
}

// Parse pasted CSV. Accepts header or headerless rows of: date, description, amount.
export function parseCSV(text, rules = []) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (!lines.length) return []
  const rows = lines.map((l) => l.split(/[,;\t]/).map((c) => c.trim()))
  const header = rows[0].map((c) => c.toLowerCase())
  const hasHeader = header.some((h) => /date|description|desc|amount|category/.test(h))
  const data = hasHeader ? rows.slice(1) : rows
  return data.map((cols) => {
    // detect date first, then amount (pure number/currency), then description
    let amount = null, desc = '', date = ''
    cols.forEach((c) => {
      const t = c.trim()
      if (!date && isDateStr(t)) { date = t; return }
      const num = parseFloat(t.replace(/[$,]/g, ''))
      if (amount === null && !isNaN(num) && /[0-9]/.test(t)) { amount = num; return }
      if (!desc) desc = t
    })
    const category = cols.map((c) => c.trim()).find((c) => CATEGORIES.includes(c)) || categorizeWith(desc, rules)
    return { date, desc, amount: amount || 0, category }
  })
}

// Fire a lightweight toast (consumed by App). Safe in non-browser contexts.
export function notify(msg) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('toast', { detail: msg }))
  }
}

// Navigate between tabs from anywhere (consumed by App).
export function gotoTab(id) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('goto', { detail: id }))
  }
}

// 'YYYY-MM' from a transaction date (accepts YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY).
export function monthKey(date) {
  if (!date) return 'Unknown'
  let m = /^(\d{4})[-/](\d{1,2})/.exec(date) // YYYY-MM...
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/.exec(date) // MM/DD/YYYY
  if (m) {
    let yr = m[3]
    if (yr.length === 2) yr = '20' + yr
    return `${yr}-${m[1].padStart(2, '0')}`
  }
  return 'Unknown'
}

// True for date-shaped strings we support.
function isDateStr(t) {
  return /^(\d{4})[-/]\d{1,2}[-/]\d{1,2}$/.test(t) || /^(\d{1,2})[-/]\d{1,2}[-/]\d{2,4}$/.test(t)
}

// Normalize any supported date string to YYYY-MM-DD for <input type="date">.
export function normalizeDate(str) {
  if (!str) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/.exec(str)
  if (m) {
    let y = m[3]
    if (y.length === 2) y = '20' + y
    return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  return ''
}

// Build a downloadable CSV of categorized transactions + budgets.
export function exportCSV(txns, budgets) {
  const head = 'date,description,amount,category,budget\n'
  const body = txns
    .map((t) => `${t.date},${t.desc},${t.amount},${t.category},${budgets[t.category] || ''}`)
    .join('\n')
  return head + body
}

export function totalsByCategory(txns) {
  const t = Object.fromEntries(CATEGORIES.map((c) => [c, 0]))
  for (const tx of txns) {
    // signed: refunds/credits reduce the category instead of inflating spend
    if (t[tx.category] !== undefined) t[tx.category] += tx.amount
  }
  return t
}

export function totalSpend(txns) {
  // signed net (refunds subtract)
  return txns.reduce((s, tx) => s + tx.amount, 0)
}

export function savingsRate(income, expenses) {
  if (!income) return 0
  return (income - expenses) / income
}

export function futureValue(monthly, years, annualRate) {
  // Annual compounding to match the published video example
  // ($200/mo @7% -> 10yr ~$34k, 20yr ~$100k, 30yr ~$228k).
  const r = annualRate / 100
  const pmt = monthly * 12
  if (r === 0) return pmt * years
  return pmt * ((Math.pow(1 + r, years) - 1) / r)
}

// AI tool verdict: net monthly value = (hours/week * 4.33 * hourly) - cost/mo
export function aiRoi(costPerMonth, hoursPerWeek, hourlyValue) {
  const earned = hoursPerWeek * 4.33 * hourlyValue
  const net = earned - costPerMonth
  return { earned, net, worthIt: net > 0 }
}

// Rent vs Buy: returns monthly cost of owning vs renting and the 5-year test note.
export function rentVsBuy({ price, downPct, rate, rent, years, closingPct, roomRent = 0 }) {
  const down = (price * downPct) / 100
  const loan = price - down
  const r = rate / 100 / 12
  const n = 30 * 12
  const pmi = loan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
  // all-in: principal+interest + ~1.2%/yr combined (tax, insurance, maintenance) /12,
  // tuned to match the video's "~$1,900 all-in" for the $400k / 4% example
  const taxUpkeep = (price * 0.012) / 12
  const ownMonthly = pmi + taxUpkeep - roomRent
  const closing = (price * closingPct) / 100
  return {
    ownMonthly,
    rentMonthly: rent,
    diff: ownMonthly - rent,
    closing,
    houseHack: roomRent > 0 && ownMonthly < rent,
    fiveYear: years < 5 && ownMonthly > rent,
  }
}

export function cryptoCap(portfolio) {
  return portfolio * 0.05
}

// Monthly $ saved by a Lens decision: cut = full amount, adjust = the difference.
export function lensSaving(t) {
  if (!t.lens) return 0
  const amt = Math.abs(t.amount) || 0
  if (t.lens.mode === 'cut') return amt
  if (t.lens.mode === 'adjust') return Math.max(0, amt - (Number(t.lens.adjusted) || 0))
  return 0
}

export const SAMPLE_CSV = `date,description,amount
2026-01-02,SQ COFFEE,4.50
2026-01-03,NETFLIX,15.99
2026-01-04,RENT PYMT,1400.00
2026-01-05,UBER,22.30
2026-01-06,GROCERY MKT,86.40
2026-01-07,ADOBE CC,52.99
2026-01-08,DOORDASH,38.00
2026-01-09,GYM MEMBERSHIP,29.00
2026-01-10,SHELL GAS,45.00
2026-01-11,SPOTIFY,10.99
2026-01-12,MOVIE TICKETS,24.00
2026-01-13,AMAZON PRIME,14.99
2026-01-14,UBER EATS,31.50
2026-02-02,SQ COFFEE,5.20
2026-02-03,NETFLIX,15.99
2026-02-04,RENT PYMT,1400.00
2026-02-05,UBER,19.80
2026-02-06,GROCERY MKT,92.10
2026-02-07,ADOBE CC,52.99
2026-02-08,DOORDASH,41.00
2026-02-09,GYM MEMBERSHIP,29.00
2026-02-10,SHELL GAS,48.00
2026-02-11,SPOTIFY,10.99
2026-02-12,MOVIE TICKETS,32.00
2026-02-13,AMAZON PRIME,14.99
2026-02-14,UBER EATS,27.00
2026-03-02,SQ COFFEE,4.90
2026-03-03,NETFLIX,15.99
2026-03-04,RENT PYMT,1400.00
2026-03-05,UBER,24.10
2026-03-06,GROCERY MKT,78.30
2026-03-07,ADOBE CC,52.99
2026-03-08,DOORDASH,36.00
2026-03-09,GYM MEMBERSHIP,29.00
2026-03-10,SHELL GAS,43.00
2026-03-11,SPOTIFY,10.99
2026-03-12,MOVIE TICKETS,18.00
2026-03-13,AMAZON PRIME,14.99
2026-03-14,UBER EATS,33.00`

export const TIPS = [
  { n: 1, title: 'Subscription audit', body: 'Sort by Subscriptions and cancel what you don’t use. Average find: $50–$100/mo from forgotten free trials.' },
  { n: 2, title: 'The 40% rule', body: 'If Food + Fun exceeds 40% of your income, that’s normally the leak.' },
  { n: 3, title: 'Sink funds', body: 'For irregular costs (car, gifts, taxes): yearly cost ÷ 12, set aside monthly so they stop being surprises.' },
  { n: 4, title: 'Threshold alerts', body: 'Turn on bank alerts when a category crosses a limit.' },
  { n: 5, title: 'Round-up savings', body: 'Spare change swept into savings — set and forget.' },
  { n: 6, title: 'Pay yourself first', body: 'Move savings to a separate account the moment income lands.' },
  { n: 7, title: 'Annual-fee calendar', body: 'Track renewal dates so nothing surprises you. Keystone: a 15-minute monthly review.' },
]

export const INSURANCE = [
  { policy: 'Term life', cost: '$30/mo for $500k', verdict: 'YES', note: 'If anyone depends on your income.' },
  { policy: 'Health', cost: 'premium', verdict: 'YES', note: 'Not optional — one hospital visit dwarfs any premium.' },
  { policy: 'Extended warranty', cost: '$200 on $1000 phone', verdict: 'NO', note: 'Low claim rate, lots of exclusions.' },
  { policy: 'Phone ins (carrier)', cost: 'monthly', verdict: 'NO', note: 'Deductible often eats the benefit.' },
  { policy: 'Rental car at counter', cost: 'daily', verdict: 'NO', note: 'Skip if your credit card already covers it.' },
  { policy: 'Auto', cost: 'required', verdict: 'YES', note: 'Raise deductible; drop collision on an old car.' },
  { policy: 'Home / Renter', cost: 'few $100/yr', verdict: 'YES', note: 'Renters who skip regret it.' },
  { policy: 'Disability', cost: 'modest', verdict: 'YES', note: 'Protects your biggest asset: ability to earn.' },
  { policy: 'Travel', cost: 'per trip', verdict: 'YES*', note: 'Only for costly non-refundable trips + medical abroad.' },
]
