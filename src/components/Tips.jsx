import { TIPS } from '../lib/finance.js'

export default function Tips() {
  return (
    <section>
      <h2>The 7 tricks that move the number</h2>
      <p className="muted">Consistency beats intensity. Typical result: $50–$300/mo recovered for ~15 min of work.</p>
      <div className="tips">
        {TIPS.map((t) => (
          <div className="card tip" key={t.n}>
            <div className="tip-n">{t.n}</div>
            <div>
              <h3>{t.title}</h3>
              <p>{t.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
