import { useState } from 'react'
import { totalsByCategory, totalSpend, savingsRate, CATEGORIES, SAVINGS_TARGET, FORTY_PCT_RULE, monthKey, exportCSV, notify, gotoTab, detectRecurring, merchantOf, lensSaving } from '../lib/finance.js'
import LensMini from './LensMini.jsx'
import Scorecard from './Scorecard.jsx'

const CAT_COLORS = {
  Rent: '#0FA8B0', Food: '#F2A93B', Subscriptions: '#F26A1B',
  Transport: '#3E6FB5', Fun: '#7A5BC7', Other: '#8A94A0',
}

const LABELS = ['Your score', 'Your leaks', 'Where your money goes', 'Your plan']

function Donut({ totals }) {
  const data = CATEGORIES.map((c) => ({ label: c, value: totals[c] || 0, color: CAT_COLORS[c] }))
    .filter((d) => d.value > 0)
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const R = 58, C = 2 * Math.PI * R
  let offset = 0
  return (
    <svg width="170" height="170" viewBox="0 0 170 170">
      <g transform="translate(85,85) rotate(-90)">
        <circle r={R} cx="0" cy="0" fill="none" stroke="#e6ddc8" strokeWidth="22" />
        {data.map((d, i) => {
          const frac = d.value / total
          const dash = `${frac * C} ${C - frac * C}`
          const el = (
            <circle key={i} r={R} cx="0" cy="0" fill="none" stroke={d.color} strokeWidth="22"
              strokeDasharray={dash} strokeDashoffset={-offset} />
          )
          offset += frac * C
          return el
        })}
      </g>
      <text x="85" y="80" textAnchor="middle" fontSize="18" fontWeight="700">${total.toFixed(0)}</text>
      <text x="85" y="96" textAnchor="middle" fontSize="11" fill="#6b6354">spend</text>
    </svg>
  )
}

function Gauge({ rate }) {
  if (rate === null) {
    return (
      <div className="gauge">
        <div className="gauge-num" style={{ color: 'var(--muted)' }}>—</div>
        <div className="gauge-bar">
          <div className="gauge-fill" style={{ width: '0%', background: 'var(--amber)' }} />
          <div className="gauge-target" style={{ left: `${SAVINGS_TARGET * 100}%` }} title="20% target" />
        </div>
        <div className="muted">Savings rate · target {SAVINGS_TARGET * 100}%</div>
      </div>
    )
  }
  const pct = Math.max(0, Math.min(1, rate)) * 100
  const hit = rate >= SAVINGS_TARGET
  return (
    <div className="gauge">
      <div className="gauge-num" style={{ color: hit ? 'var(--green)' : 'var(--red)' }}>
        {(rate * 100).toFixed(1)}%
      </div>
      <div className="gauge-bar">
        <div className="gauge-fill" style={{ width: `${pct}%`, background: hit ? 'var(--green)' : 'var(--amber)' }} />
        <div className="gauge-target" style={{ left: `${SAVINGS_TARGET * 100}%` }} title="20% target" />
      </div>
      <div className="muted">Savings rate · target {SAVINGS_TARGET * 100}%</div>
    </div>
  )
}

export default function Dashboard({ state, update }) {
  const { txns, income, budgets } = state
  const months = ['All', ...Array.from(new Set(txns.map((t) => monthKey(t.date)))).filter((m) => m !== 'Unknown').sort()]
  const [month, setMonth] = useState('All')
  const [openRec, setOpenRec] = useState(null)
  const [simulate, setSimulate] = useState(false)
  const [step, setStep] = useState(0)
  const recurring = detectRecurring(txns)

  const lensFor = (r) => {
    const hit = txns.find(
      (t) => merchantOf(t.desc) === r.merchant && Math.round(t.amount) === Math.round(r.amount) && t.lens
    )
    return hit ? hit.lens : null
  }
  const applyLensToMerchant = (r, res) => {
    const next = txns.map((t) =>
      merchantOf(t.desc) === r.merchant && Math.round(t.amount) === Math.round(r.amount)
        ? { ...t, lens: res }
        : t
    )
    update({ txns: next })
  }

  const filtered = month === 'All' ? txns : txns.filter((t) => monthKey(t.date) === month)
  const totals = totalsByCategory(filtered)
  const spend = totalSpend(filtered)
  // "All" spans multiple months: compare against income × months, and evaluate the
  // 40% rule on the per-month average so it doesn't false-trigger on summed totals.
  const monthsInView = month === 'All'
    ? Array.from(new Set(filtered.map((t) => monthKey(t.date)))).filter((m) => m !== 'Unknown')
    : [month]
  const monthCount = Math.max(1, monthsInView.length)
  const periodIncome = income * monthCount

  const rate = spend === 0 ? null : savingsRate(periodIncome, spend)
  const foodFun = (totals.Food || 0) + (totals.Fun || 0)
  const avgFoodFun = foodFun / monthCount
  const leak = income > 0 && avgFoodFun > income * FORTY_PCT_RULE
  const maxCat = Math.max(1, ...CATEGORIES.map((c) => Math.max(0, totals[c] || 0)))
  const topCat = CATEGORIES.reduce((a, c) => (totals[c] || 0) > (totals[a] || 0) ? c : a, CATEGORIES[0])
  const overCount = CATEGORIES.filter((c) => budgets[c] > 0 && (totals[c] || 0) > budgets[c]).length
  const lensed = filtered.filter((t) => t.lens)
  const cutCount = lensed.filter((t) => t.lens.mode === 'cut').length
  const adjustCount = lensed.filter((t) => t.lens.mode === 'adjust').length
  const leakingPerMo = lensed.reduce((s, t) => s + lensSaving(t), 0) / monthCount
  const reclaimedYr = leakingPerMo * 12
  const coverage = filtered.length > 0 ? lensed.length / filtered.length : 0
  const milestones = [
    { label: 'First cut', done: cutCount > 0 },
    { label: 'Halfway', done: coverage >= 0.5 },
    { label: '20% Club', done: rate !== null && rate >= SAVINGS_TARGET },
    { label: 'Full sweep', done: recurring.length > 0 && recurring.every((r) => lensFor(r)) },
  ]

  // P1-2 — simulate applying every decision (cut = full, adjust = the difference).
  const saveSum = lensed.reduce((s, t) => s + lensSaving(t), 0)
  const simSpend = Math.max(0, spend - saveSum)
  const simRate = simSpend === 0 ? null : savingsRate(periodIncome, simSpend)
  const simNet = periodIncome - simSpend
  const shownRate = simulate ? simRate : rate
  const shownNet = simulate ? simNet : periodIncome - spend

  const setBudget = (cat, v) => update({ budgets: { ...budgets, [cat]: parseFloat(v) || 0 } })

  const doExport = () => {
    const csv = exportCSV(filtered, budgets)
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `money-lens-${month === 'All' ? 'all' : month}.csv`
    a.click()
    notify(`Exported ${month} CSV (${filtered.length} rows)`)
  }

  const nav = (
    <div className="sec-nav">
      {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>← Back</button>}
      {step < LABELS.length - 1
        ? <button className="btn primary" onClick={() => setStep(step + 1)}>Next →</button>
        : <button className="btn" onClick={() => setStep(0)}>↑ Start over</button>}
    </div>
  )

  return (
    <section>
      <div className="dash-head">
        <h2>Step 4 · Your result</h2>
        <div className="row" style={{ margin: 0 }}>
          <label className="field">Month
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <button className="btn" onClick={doExport}>Export CSV</button>
        </div>
      </div>

      {txns.length === 0 ? (
        <div className="empty">
          <h3>Nothing to show yet</h3>
          <p className="muted">Add some transactions first — the dashboard fills in by itself.</p>
          <div className="row">
            <button className="btn primary" onClick={() => gotoTab('data')}>Go to Your data</button>
            <button className="btn" onClick={() => gotoTab('rules')}>Set up rules</button>
          </div>
        </div>
      ) : (
        <>
          <div className="section-nav">
            {LABELS.map((label, i) => (
              <button key={label} className={i === step ? 'on' : ''} onClick={() => setStep(i)}>{i + 1} · {label}</button>
            ))}
          </div>

          {step === 0 && (
            <section className="dash-section">
              <h3>Your score</h3>
              <p className="plain">This is your money score. The bigger the number, the better you are doing.</p>
              <div className="dash-top">
                <div className="card">
                  <label>Income (take-home / mo)</label>
                  <input type="number" value={income} onChange={(e) => update({ income: parseFloat(e.target.value) || 0 })} />
                  <div className="muted">Expenses ({month}): ${spend.toFixed(0)}</div>
                </div>
                <Gauge rate={shownRate} />
              </div>
              <Scorecard
                reclaimedYr={reclaimedYr}
                cutCount={cutCount}
                adjustCount={adjustCount}
                reviewed={lensed.length}
                total={filtered.length}
                milestones={milestones}
              />
              {nav}
            </section>
          )}

          {step === 1 && (
            <section className="dash-section">
              <h3>Your leaks</h3>
              <p className="plain">These quietly take your money every month. Look at each one and decide if it is worth it.</p>
              {recurring.length > 0 ? (
                <div className="card">
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead><tr><th>Merchant</th><th>$/mo</th><th>/yr</th><th>Lens</th></tr></thead>
                      <tbody>
                        {recurring.map((r) => {
                          const lf = lensFor(r)
                          return (
                            <tr key={r.merchant + r.amount}>
                              <td><strong>{r.merchant}</strong></td>
                              <td>${r.amount.toFixed(0)}</td>
                              <td>${r.annual.toFixed(0)}</td>
                              <td>
                                {lf ? (
                                  lf.mode === 'adjust' ? (
                                    <span className="flag adj">ADJUST</span>
                                  ) : (
                                    <span className={lf.verdict ? 'flag ok' : 'flag no'}>{lf.verdict ? 'PASS' : 'LEAK'}</span>
                                  )
                                ) : (
                                  <button className="btn" onClick={() => setOpenRec(r.merchant + r.amount)}>Run Lens</button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {openRec !== null && (
                    (() => {
                      const r = recurring.find((x) => x.merchant + x.amount === openRec)
                      if (!r) return null
                      return (
                        <LensMini
                          amount={r.amount}
                          name={r.merchant}
                          label={`Lens on ${r.merchant} ($${r.amount.toFixed(0)}/mo)`}
                          initial={lensFor(r)}
                          onSave={(res) => { applyLensToMerchant(r, res); setOpenRec(null); notify('Lens result saved') }}
                          onCancel={() => setOpenRec(null)}
                        />
                      )
                    })()
                  )}
                </div>
              ) : (
                <p className="muted">No repeating charges found — nice, fewer leaks to worry about.</p>
              )}
              <div className="row">
                <button className="btn primary" onClick={() => gotoTab('lenstest')}>Go to the Lens Test →</button>
              </div>
              {nav}
            </section>
          )}

          {step === 2 && (
            <section className="dash-section">
              <h3>Where your money goes</h3>
              <p className="plain">This pie shows where every dollar goes. Set a limit for any box — going over turns red.</p>
              <div className="dash-top">
                <div className="card donut-card">
                  <Donut totals={totals} />
                  <div className="legend">
                    {CATEGORIES.map((c) => (
                      <div key={c} className="legend-row">
                        <span className="sw" style={{ background: CAT_COLORS[c] }} />
                        <span>{c}</span><span className="muted">${(totals[c] || 0).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="stats">
                  <div className="stat">
                    <span className="stat-label">Total spend</span>
                    <span className="stat-num">${spend.toFixed(0)}</span>
                    <span className="muted">{month}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Top category</span>
                    <span className="stat-num">{topCat}</span>
                    <span className="muted">${(totals[topCat] || 0).toFixed(0)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Over budget</span>
                    <span className="stat-num" style={{ color: overCount ? 'var(--red)' : 'var(--green)' }}>{overCount}</span>
                    <span className="muted">categories</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Lens verdicts</span>
                    <span className="stat-num">{lensed.length - cutCount - adjustCount}/{lensed.length}</span>
                    <span className="muted">{cutCount} cut · {adjustCount} adjust</span>
                  </div>
                </div>
              </div>

              {leak && (
                <div className="alert">
                  40% rule: Food + Fun (${foodFun.toFixed(0)}) is more than 40% of what you bring home — that is likely your leak.
                </div>
              )}

              <table className="tbl">
                <thead>
                  <tr><th>Category</th><th>Spent</th><th>Budget</th><th>Status</th><th>Share</th></tr>
                </thead>
                <tbody>
                  {CATEGORIES.map((c) => {
                    const raw = totals[c] || 0
                    const spent = Math.max(0, raw)
                    const bud = budgets[c] || 0
                    const over = bud > 0 && raw > bud
                    return (
                      <tr key={c}>
                        <td><strong>{c}</strong></td>
                        <td>${spent.toFixed(0)}</td>
                        <td><input type="number" className="bud" value={bud} onChange={(e) => setBudget(c, e.target.value)} /></td>
                        <td>
                          {bud > 0 && (
                            <span className={over ? 'flag over' : 'flag ok'}>{over ? 'OVER' : 'OK'}</span>
                          )}
                        </td>
                        <td>
                          <div className="bar"><div className="bar-fill" style={{ width: `${(spent / maxCat) * 100}%`, background: CAT_COLORS[c] }} /></div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="muted">Tip: add a budget per category and anything over flags red — the problems point at themselves.</p>
              {nav}
            </section>
          )}

          {step === 3 && (
            <section className="dash-section">
              <h3>Your plan</h3>
              <p className="plain">Pretend you cut the leaks. Flip the switch and watch your score jump!</p>
              <div className="card plan-card">
                <label className="field sim-toggle" title={(cutCount + adjustCount) === 0 ? 'Mark some charges as leaks first' : 'Preview your numbers if those leaks were cut'}>
                  <input type="checkbox" checked={simulate} disabled={(cutCount + adjustCount) === 0} onChange={(e) => setSimulate(e.target.checked)} />
                  Pretend I cut the leaks
                </label>
                <div className="stat">
                  <span className="stat-label">Net saved</span>
                  <span className="stat-num" style={{ color: 'var(--green)' }}>${(shownNet).toFixed(0)}</span>
                  <span className="muted">{simulate ? 'if leaks cut' : (month === 'All' ? 'all months' : 'this month')}</span>
                </div>
              </div>
              {simulate && (cutCount + adjustCount) > 0 && (
                <div className="alert good">
                  {cutCount} cut{adjustCount ? `, ${adjustCount} adjusted` : ''} → ${saveSum.toFixed(0)}/mo back.
                  Savings rate {(simRate * 100).toFixed(1)}%
                  {rate !== null && ` (was ${(rate * 100).toFixed(1)}%)`},
                  +${(simNet - (periodIncome - spend)).toFixed(0)}/mo kept.
                </div>
              )}
              {!simulate && (cutCount + adjustCount) === 0 && (
                <p className="muted">Tip: go to the Lens Test and mark some charges as leaks to see your plan here.</p>
              )}
              {nav}
            </section>
          )}
        </>
      )}
    </section>
  )
}
