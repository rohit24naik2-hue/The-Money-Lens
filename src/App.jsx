import { useEffect, useRef, useState } from 'react'
import Header from './components/Header.jsx'
import Welcome from './components/Welcome.jsx'
import HowItWorks from './components/HowItWorks.jsx'
import DataEntry from './components/DataEntry.jsx'
import LensTest from './components/LensTest.jsx'
import Dashboard from './components/Dashboard.jsx'
import Calculators from './components/Calculators.jsx'
import Tips from './components/Tips.jsx'
import Insurance from './components/Insurance.jsx'
import Rules from './components/Rules.jsx'

const TABS = [
  { id: 'howitworks', label: '1 · How it works' },
  { id: 'data', label: '2 · Your data' },
  { id: 'lenstest', label: '3 · Lens Test' },
  { id: 'dashboard', label: '4 · Dashboard' },
  { id: 'settings', label: 'Settings' },
]

const SETTINGS = [
  { id: 'rules', label: 'Rules' },
  { id: 'crossovers', label: 'Crossovers' },
  { id: 'tips', label: 'Tips' },
]

const SEED = {
  txns: [],
  income: 4000,
  budgets: { Rent: 1500, Food: 600, Subscriptions: 100, Transport: 250, Fun: 300, Other: 300 },
  rules: [],
  decisions: [],
}

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('money-lens') || 'null')
      if (saved) {
        // merge over SEED so older saved states gain any new fields (rules, decisions, etc.)
        return {
          ...SEED,
          ...saved,
          budgets: { ...SEED.budgets, ...(saved.budgets || {}) },
          rules: saved.rules || [],
          decisions: saved.decisions || [],
        }
      }
    } catch (e) {}
    return SEED
  })
  const [tab, setTab] = useState('howitworks')
  const [sub, setSub] = useState('rules')
  const [toast, setToast] = useState('')
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('ml_intro_seen'))
  const toastTimer = useRef()

  const closeIntro = () => {
    localStorage.setItem('ml_intro_seen', '1')
    setShowIntro(false)
  }
  const startIntro = (txns) => {
    update({ txns })
    localStorage.setItem('ml_intro_seen', '1')
    setShowIntro(false)
    setTab('data')
    notify('Sample loaded — add or edit your data, then run the Lens Test')
  }

  useEffect(() => {
    localStorage.setItem('money-lens', JSON.stringify(state))
  }, [state])

  useEffect(() => {
    const onToast = (e) => {
      setToast(e.detail)
      clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setToast(''), 2600)
    }
    const onGoto = (e) => {
      const id = e.detail
      const settingsIds = SETTINGS.map((s) => s.id)
      if (settingsIds.includes(id)) {
        setTab('settings')
        setSub(id)
      } else {
        setTab(id)
      }
    }
    window.addEventListener('toast', onToast)
    window.addEventListener('goto', onGoto)
    return () => {
      window.removeEventListener('toast', onToast)
      window.removeEventListener('goto', onGoto)
    }
  }, [])

  const update = (patch) => setState((s) => ({ ...s, ...patch }))

  return (
    <div className="app">
      <div className="topbar">
        <Header />
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'tab active' : 'tab'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <main className="content">
        {tab === 'howitworks' && <HowItWorks onStart={() => setTab('data')} />}
        {tab === 'data' && <DataEntry state={state} update={update} />}
        {tab === 'lenstest' && <LensTest state={state} update={update} />}
        {tab === 'dashboard' && <Dashboard state={state} update={update} />}
        {tab === 'settings' && (
          <>
            <nav className="tabs subtabs">
              {SETTINGS.map((t) => (
                <button
                  key={t.id}
                  className={sub === t.id ? 'tab active' : 'tab'}
                  onClick={() => setSub(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            {sub === 'rules' && <Rules state={state} update={update} />}
            {sub === 'crossovers' && (
              <div className="calc-grid">
                <Calculators />
                <Insurance />
              </div>
            )}
            {sub === 'tips' && <Tips />}
          </>
        )}
      </main>
      <footer className="foot">
        The Money Lens — does this save or earn me more than it costs? · client-side only, your data never leaves the browser.
      </footer>
      <Welcome open={showIntro} onClose={closeIntro} onStart={startIntro} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
