// Tilbage-knap + filter-ikon øverst i appen
import { useNavigate } from 'react-router-dom'
import styles from './TopBar.module.css'

const FAG_CSS = {
  farmakologi: 'farmakologi',
  sygepleje: 'sygepleje',
  'sygdomslære': 'sygdomslaere',
  organisation: 'organisation',
}

export default function TopBar({ onFilterClick, aktivtFag }) {
  const navigate = useNavigate()
  const fagCss = aktivtFag ? FAG_CSS[aktivtFag] : null

  function haandterTilbage() {
    // BrowsePage er rod-ruten — tilbage betyder altid "ud af sessionen".
    navigate('/')
  }

  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={styles.tilbageKnap}
        onClick={haandterTilbage}
        aria-label="Gå tilbage"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className={styles.hoejreSide}>
        {aktivtFag && fagCss && (
          <span
            key={aktivtFag}
            className={`${styles.fagChip} ${styles[FAG_CSS[aktivtFag]] ?? ''}`}
          >
            {aktivtFag}
          </span>
        )}
        <button
          className={styles.filterKnap}
          onClick={onFilterClick}
          aria-label="Åbn filter"
        >
          {/* Filter-ikon: tre vandrette linjer med forskellig bredde */}
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
            <rect x="0" y="0"  width="22" height="2" rx="1" fill="currentColor"/>
            <rect x="3" y="7"  width="16" height="2" rx="1" fill="currentColor"/>
            <rect x="6" y="14" width="10" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
