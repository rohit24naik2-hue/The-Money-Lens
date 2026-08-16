import { useState } from 'react'
import { notify } from '../lib/finance.js'

const fmt = (n) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(2))

export default function LensMini({ amount = 0, name = '', label = '', initial, onSave, onCancel }) {
  const start = initial?.worth !== undefined ? initial.worth : (initial ? initial.verdict : null)
  const [worth, setWorth] = useState(start === undefined ? null : start)
  const amt = Number(amount) || 0
  const canSave = worth !== null

  const save = () => {
    if (canSave) onSave({ worth, cost: amt, verdict: worth, mode: 'simple' })
  }

  return (
    <div className="card lens-mini">
      <p className="lens-q">The Money Lens asks one thing:</p>
      <p className="lens-q-2">“Is it worth more than it costs?”</p>

      <p className="lens-cost">
        <strong>{name || 'This'}</strong> costs <strong>${fmt(amt)}</strong> every month.
        Is it worth it?
      </p>

      <div className="seg-row">
        <button
          className={worth === true ? 'seg sel' : 'seg'}
          onClick={() => setWorth(true)}
        >
          Yes — keep it
        </button>
        <button
          className={worth === false ? 'seg sel-bad' : 'seg'}
          onClick={() => setWorth(false)}
        >
          No — cut it
        </button>
      </div>

      {worth !== null && (
        <div className={worth ? 'verdict yes' : 'verdict no'}>
          {worth
            ? `KEEP IT. You decided $${fmt(amt)}/mo is worth it.`
            : `CUT IT. That's $${fmt(amt)}/mo you can get back.`}
        </div>
      )}

      <p className="muted">No math needed — just honest about whether you use it.</p>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn primary" disabled={!canSave} onClick={save}>Save this decision</button>
        {onCancel && <button className="btn" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  )
}
