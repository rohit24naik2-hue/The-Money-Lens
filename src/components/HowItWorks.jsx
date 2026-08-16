export default function HowItWorks({ onStart }) {
  return (
    <section className="how">
      <h2>Step 1 · How this app works</h2>
      <p className="how-lead">
        This app helps you answer one simple question about your money:{' '}
        <strong>“Is this worth more than it costs?”</strong>
      </p>
      <p className="muted">We do it in three tiny steps. No math, no jargon — like deciding what to keep in your toy box.</p>

      <ol className="how-steps">
        <li><strong>Your data</strong> — paste your bank list (date, what you bought, price). We show it back as a clean report.</li>
        <li><strong>The Lens Test</strong> — for each thing you pay for, tap it and say “keep it” or “cut it.” That’s the whole test.</li>
        <li><strong>Your Dashboard</strong> — see your score: how much money you’d get back, and whether you hit your savings goal.</li>
      </ol>

      <p className="how-note">Everything stays on your computer. We never see your numbers.</p>
      <div className="row">
        <button className="btn primary" onClick={onStart}>Start · add my data</button>
      </div>
    </section>
  )
}
