export default function Scorecard({ reclaimedYr, cutCount, adjustCount, reviewed, total, milestones }) {
  const pct = total > 0 ? Math.min(100, Math.round((reviewed / total) * 100)) : 0
  const tag = [cutCount > 0 ? `${cutCount} cut` : '', adjustCount > 0 ? `${adjustCount} adjusted` : ''].filter(Boolean).join(', ')
  return (
    <div className="card scorecard">
      <h3>Your Money Lens</h3>
      <div className="score-hero">
        <div className="score-num">${Math.round(reclaimedYr).toLocaleString()}</div>
        <div className="muted">
          reclaimed / year{tag ? ` · ${tag}` : ''}
        </div>
      </div>

      <div className="score-bar-label muted">Reviewed {reviewed} of {total} charges</div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${pct}%`, background: 'var(--teal)' }} />
      </div>

      <div className="milestones">
        {milestones.map((m) => (
          <span key={m.label} className={m.done ? 'ms done' : 'ms'}>
            <i className="dot" />{m.label}
          </span>
        ))}
      </div>
    </div>
  )
}
