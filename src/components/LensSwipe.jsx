import { useState, useRef, useEffect } from 'react'
import { gotoTab } from '../lib/finance.js'

export default function LensSwipe({ state, update }) {
  const txns = state.txns
  const firstUnreviewed = txns.findIndex((t) => !t.lens)
  const [idx, setIdx] = useState(firstUnreviewed < 0 ? 0 : firstUnreviewed)
  const [exit, setExit] = useState(null)
  const [dx, setDx] = useState(0)
  const [dy, setDy] = useState(0)
  const [adjusting, setAdjusting] = useState(null)
  const [limit, setLimit] = useState(0)
  const start = useRef(null)

  const lensed = txns.filter((t) => t.lens)
  const kept = lensed.filter((t) => t.lens.mode === 'keep').length
  const cutN = lensed.filter((t) => t.lens.mode === 'cut').length
  const adjustN = lensed.filter((t) => t.lens.mode === 'adjust').length
  const reclaimed = lensed.reduce((s, t) => {
    const a = Math.abs(t.amount) || 0
    if (t.lens.mode === 'cut') return s + a
    if (t.lens.mode === 'adjust') return s + Math.max(0, a - (Number(t.lens.adjusted) || 0))
    return s
  }, 0)

  const done = idx >= txns.length
  const t = done ? null : txns[idx]

  const finish = (i, lens) => {
    const next = state.txns.map((x, idx2) => (idx2 === i ? { ...x, lens } : x))
    update({ txns: next })
    setExit(null); setDx(0); setDy(0)
    setIdx(i + 1)
  }

  const decide = (mode) => {
    if (exit || done || adjusting !== null) return
    if (mode === 'adjust') {
      setAdjusting(idx)
      setLimit(Math.round(Number(t.amount) || 0))
      return
    }
    setExit(mode === 'keep' ? 'right' : 'left')
    const lens = { mode, worth: mode === 'keep', verdict: mode === 'keep', cost: Number(t.amount) || 0 }
    setTimeout(() => finish(idx, lens), 220)
  }

  const confirmAdjust = () => {
    const i = adjusting
    const lens = { mode: 'adjust', worth: false, verdict: false, adjusted: Number(limit) || 0, cost: Number(txns[i].amount) || 0 }
    setAdjusting(null)
    finish(i, lens)
  }

  const onDown = (e) => {
    start.current = { x: e.clientX, y: e.clientY }
    if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e) => {
    if (start.current) { setDx(e.clientX - start.current.x); setDy(e.clientY - start.current.y) }
  }
  const onUp = () => {
    if (!start.current) return
    const ax = Math.abs(dx), ay = Math.abs(dy)
    if (ay > 90 && ay >= ax) decide('adjust')
    else if (dx > 90) decide('keep')
    else if (dx < -90) decide('cut')
    else { setDx(0); setDy(0) }
    start.current = null
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') decide('keep')
      else if (e.key === 'ArrowLeft') decide('cut')
      else if (e.key === 'ArrowUp') decide('adjust')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (txns.length === 0) {
    return (
      <div className="empty">
        <h3>No data yet</h3>
        <p className="muted">Add your transactions first on the “Your data” step.</p>
        <div className="row"><button className="btn primary" onClick={() => gotoTab('data')}>Go to Your data</button></div>
      </div>
    )
  }

  if (adjusting !== null) {
    const at = txns[adjusting]
    const orig = Number(at.amount) || 0
    const save = Math.max(0, orig - (Number(limit) || 0))
    return (
      <section>
        <h2>Step 3 · Adjust</h2>
        <div className="card adjust-editor">
          <div className="swipe-cat">{at.category}</div>
          <div className="swipe-name">{at.desc || 'This charge'}</div>
          <p className="muted">Keep it, but lower the cost. Set the limit you’ll actually stick to.</p>
          <label className="field">New limit $/mo
            <input type="number" value={limit} onChange={(e) => setLimit(parseFloat(e.target.value) || 0)} />
          </label>
          <p className="muted">Saves ${save.toFixed(0)}/mo vs now.</p>
          <div className="row">
            <button className="btn primary" onClick={confirmAdjust}>Save adjustment</button>
            <button className="btn" onClick={() => { setAdjusting(null); setLimit(0) }}>Cancel</button>
          </div>
        </div>
      </section>
    )
  }

  if (done) {
    return (
      <section>
        <h2>Step 3 · The Lens Test — done!</h2>
        <div className="card swipe-done">
          <div className="score-num" style={{ color: 'var(--green)' }}>${Math.round(reclaimed).toLocaleString()}</div>
          <p className="muted">you can get back / year</p>
          <div className="milestones" style={{ justifyContent: 'center' }}>
            <span className="ms done"><i className="dot" />{kept} kept</span>
            <span className="ms done"><i className="dot" />{cutN} cut</span>
            <span className="ms done"><i className="dot" />{adjustN} adjusted</span>
          </div>
          <div className="row" style={{ marginTop: 14, justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => gotoTab('dashboard')}>See my result</button>
            <button className="btn" onClick={() => setIdx(0)}>Review again</button>
          </div>
        </div>
      </section>
    )
  }

  const tf = Number(t.amount) || 0
  const amtStr = Number.isInteger(tf) ? String(tf) : tf.toFixed(2)
  const stamp = dy < -20 && Math.abs(dy) >= Math.abs(dx) ? 'adjust' : dx > 20 ? 'keep' : dx < -20 ? 'cut' : ''

  return (
    <section>
      <h2>Step 3 · The Lens Test</h2>
      <p className="muted">
        Swipe <strong style={{ color: 'var(--green)' }}>right = KEEP</strong>,{' '}
        <strong style={{ color: 'var(--red)' }}>left = CUT</strong>,{' '}
        <strong style={{ color: 'var(--orange)' }}>up = ADJUST</strong> (set a limit). Buttons / arrow keys work too.
      </p>

      <div className="swipe-progress muted">Card {idx + 1} of {txns.length} · {lensed.length} reviewed</div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${(lensed.length / txns.length) * 100}%`, background: 'var(--teal)' }} />
      </div>

      <div className="swipe-stage">
        <div
          className="swipe-card"
          style={{
            transform: exit
              ? (exit === 'right' ? 'translateX(130%) rotate(14deg)' : 'translateX(-130%) rotate(-14deg)')
              : `translate(${dx}px, ${dy}px) rotate(${dx * 0.04}deg)`,
            transition: exit ? 'transform .22s ease, opacity .22s ease' : 'none',
            opacity: exit ? 0 : 1,
          }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        >
          <span className={'swipe-stamp ' + stamp}>{stamp ? stamp.toUpperCase() : ''}</span>
          <div className="swipe-cat">{t.category}</div>
          <div className="swipe-name">{t.desc || 'This charge'}</div>
          <div className="swipe-amt">${amtStr}<span>/mo</span></div>
          <div className="swipe-q">Worth more than it costs?</div>
        </div>
      </div>

      <div className="swipe-btns">
        <button className="swipe-cut" onClick={() => decide('cut')} disabled={!!exit}>CUT</button>
        <button className="swipe-adj" onClick={() => decide('adjust')} disabled={!!exit}>ADJUST</button>
        <button className="swipe-keep" onClick={() => decide('keep')} disabled={!!exit}>KEEP</button>
      </div>
    </section>
  )
}
