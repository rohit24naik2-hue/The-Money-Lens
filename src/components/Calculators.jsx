import { useState } from 'react'
import { aiRoi, rentVsBuy, cryptoCap, futureValue } from '../lib/finance.js'

function Field({ label, value, onChange, step = 1 }) {
  return (
    <label className="field">
      {label}
      <input type="number" step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
    </label>
  )
}

export default function Calculators() {
  const [ai, setAi] = useState({ cost: 20, hrs: 2, hourly: 25 })
  const [rb, setRb] = useState({ price: 400000, downPct: 20, rate: 4, rent: 1700, years: 7, closingPct: 9, roomRent: 0 })
  const [cr, setCr] = useState({ portfolio: 10000 })
  const [fv, setFv] = useState({ monthly: 200, years: 30, rate: 7 })

  const roi = aiRoi(ai.cost, ai.hrs, ai.hourly)
  const rent = rentVsBuy(rb)
  const cap = cryptoCap(cr.portfolio)
  const fvVal = futureValue(fv.monthly, fv.years, fv.rate)
  const fv10 = futureValue(fv.monthly, 10, fv.rate)
  const fv20 = futureValue(fv.monthly, 20, fv.rate)

  return (
    <div className="calc">
      <h2>Crossover calculators</h2>

      <div className="card">
        <h3>AI tool ROI</h3>
        <div className="row">
          <Field label="Cost $/mo" value={ai.cost} onChange={(v) => setAi({ ...ai, cost: v })} />
          <Field label="Hours saved/wk" value={ai.hrs} onChange={(v) => setAi({ ...ai, hrs: v })} />
          <Field label="Your $/hr" value={ai.hourly} onChange={(v) => setAi({ ...ai, hourly: v })} />
        </div>
        <p>
          Value created: <strong>${roi.earned.toFixed(0)}/mo</strong> · Net:{' '}
          <strong style={{ color: roi.worthIt ? 'var(--green)' : 'var(--red)' }}>
            ${roi.net.toFixed(0)}/mo {roi.worthIt ? '✓ worth it' : '✗ leak'}
          </strong>
        </p>
        <p className="muted">Trap: 5 tools at $20 = $100/mo, 4 unused = pure leak.</p>
      </div>

      <div className="card">
        <h3>Rent vs Buy (5-year test)</h3>
        <div className="row">
          <Field label="Price $" value={rb.price} onChange={(v) => setRb({ ...rb, price: v })} />
          <Field label="Down %" value={rb.downPct} onChange={(v) => setRb({ ...rb, downPct: v })} />
          <Field label="Rate %" value={rb.rate} step={0.1} onChange={(v) => setRb({ ...rb, rate: v })} />
          <Field label="Rent $/mo" value={rb.rent} onChange={(v) => setRb({ ...rb, rent: v })} />
          <Field label="Years" value={rb.years} onChange={(v) => setRb({ ...rb, years: v })} />
          <Field label="Closing %" value={rb.closingPct} onChange={(v) => setRb({ ...rb, closingPct: v })} />
          <Field label="Room rent $ (hack)" value={rb.roomRent} onChange={(v) => setRb({ ...rb, roomRent: v })} />
        </div>
        <p>
          Own all-in: <strong>${rent.ownMonthly.toFixed(0)}/mo</strong> vs Rent:{' '}
          <strong>${rent.rentMonthly}/mo</strong> · difference ${rent.diff.toFixed(0)}/mo
        </p>
        <p className={rent.fiveYear ? 'alert' : 'muted'}>
          {rent.fiveYear
            ? 'Staying < 5 yrs and owning costs more → rent wins after closing fees.'
            : 'Long enough hold (or house-hack) can flip this.'}
          {rent.houseHack && ' · House-hack makes owning cheaper than renting.'}
        </p>
          <p className="muted">Closing costs ≈ ${rent.closing.toFixed(0)}. Housing rule: own cost &gt; 28% gross → rent.</p>
      </div>

      <div className="card">
        <h3>Crypto 5% cap</h3>
        <div className="row">
          <Field label="Investable portfolio $" value={cr.portfolio} onChange={(v) => setCr({ portfolio: v })} />
        </div>
        <p>
          Max into crypto (5%): <strong style={{ color: 'var(--orange)' }}>${cap.toFixed(0)}</strong>. Everything else →
          diversified index funds. No leverage.
        </p>
      </div>

      <div className="card">
        <h3>Compounding (index fund @ rate)</h3>
        <div className="row">
          <Field label="Monthly $" value={fv.monthly} onChange={(v) => setFv({ ...fv, monthly: v })} />
          <Field label="Years" value={fv.years} onChange={(v) => setFv({ ...fv, years: v })} />
          <Field label="Rate %" value={fv.rate} step={0.1} onChange={(v) => setFv({ ...fv, rate: v })} />
        </div>
        <p>
          In {fv.years} yr: <strong style={{ color: 'var(--green)' }}>${fvVal.toFixed(0)}</strong> (you put in $
          {(fv.monthly * fv.years * 12).toFixed(0)})
        </p>
        <p className="muted">
          10 yr ≈ ${fv10.toFixed(0)} · 20 yr ≈ ${fv20.toFixed(0)}. Time in the market beats timing it.
        </p>
      </div>
    </div>
  )
}
