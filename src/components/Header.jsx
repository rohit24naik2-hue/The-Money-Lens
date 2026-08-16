import Logo from './Logo.jsx'

export default function Header() {
  return (
    <header className="hdr">
      <div className="brand">
        <Logo />
        <div>
          <h1>The Money Lens</h1>
          <p className="tag">Run the numbers. Stop the leaks.</p>
        </div>
      </div>
    </header>
  )
}
