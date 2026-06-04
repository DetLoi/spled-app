// Feed-side: ren visning + niveau/paneler. Selve swipe-mekanikken bor i
// hooks/useSwipeFeed.js.
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useFlashcardsByEmne } from '../hooks/useFlashcards.jsx'
import { useFilter } from '../context/FilterContext.jsx'
import { useSwipeFeed } from '../hooks/useSwipeFeed.js'
import Flashcard from '../components/Flashcard/Flashcard.jsx'
import KildePanel from '../components/KildePanel/KildePanel.jsx'
import ForbindelserPanel from '../components/ForbindelserPanel/ForbindelserPanel.jsx'
import FilterSheet from '../components/FilterSheet/FilterSheet.jsx'
import styles from './FeedPage.module.css'

const NIVEAUER = [
  { id: 'faglig', label: 'Fagligt', felt: 'svar_faglig' },
  { id: 'almindelig', label: 'Almindeligt', felt: 'svar_almindelig' },
  { id: 'hulemand', label: 'Hulemand', felt: 'svar_hulemand' },
]

function KortProgressBar({ antal, aktiv }) {
  if (antal < 1) return null
  return (
    <div className={styles.kortProgressBar}>
      {Array.from({ length: antal }, (_, i) => {
        let segmentKlasse = styles.progressSegment
        if (i < aktiv) segmentKlasse += ` ${styles.progressFortid}`
        else if (i === aktiv) segmentKlasse += ` ${styles.progressAktiv}`
        else segmentKlasse += ` ${styles.progressFremtid}`
        return <span key={`${antal}-${i}`} className={segmentKlasse} />
      })}
    </div>
  )
}

export default function FeedPage({ filterAaben, setFilterAaben, setAktivtFag }) {
  const grupperetKort = useFlashcardsByEmne()
  const { filterSleutel } = useFilter()
  const location = useLocation()
  const [aktivKilde, setAktivKilde] = useState(null)
  const [forbindelserAaben, setForbindelserAaben] = useState(false)
  const [aktivNiveau, setAktivNiveau] = useState('faglig')
  const [menuAaben, setMenuAaben] = useState(false)

  const {
    kortIndex,
    nEmner,
    nKortIUdvalg,
    aktivtKort,
    vertTrackRef,
    horizRefs,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    springTilId,
  } = useSwipeFeed({
    grupperetKort,
    filterSleutel,
    startId: location.state?.startId,
    animatingKlasse: styles.animating,
  })

  useEffect(() => {
    setAktivtFag?.(aktivtKort?.fag ?? null)
  }, [aktivtKort?.fag, setAktivtFag])

  function kortForNiveau(kort) {
    const valgt = NIVEAUER.find((n) => n.id === aktivNiveau)
    const niveauSvar = valgt ? kort[valgt.felt] : null
    const fallbackSvar =
      aktivNiveau === 'faglig'
        ? kort.bagside
        : `${valgt?.label ?? 'Valgt'} niveau er ikke udfyldt for dette kort endnu.\n\n${kort.bagside}`
    return {
      ...kort,
      _niveau: aktivNiveau,
      forside: kort.spørgsmål || kort.forside,
      bagside: niveauSvar || fallbackSvar,
    }
  }

  const aktivtKortNiveau = aktivtKort ? kortForNiveau(aktivtKort) : null

  // Naviger til et atom (fra forbindelser/navigator). Luk forbindelses-panelet
  // hvis atomet findes i den aktuelle visning.
  function gaaTilAtomId(id) {
    if (springTilId(id)) setForbindelserAaben(false)
  }

  return (
    <div className={styles.side}>
      <KortProgressBar antal={nKortIUdvalg} aktiv={kortIndex} />
      <div
        className={styles.swipeArena}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {nEmner === 0 ? (
          <div className={styles.ingenKort}>
            <p>Ingen kort matcher det valgte filter.</p>
          </div>
        ) : (
          <div ref={vertTrackRef} className={styles.vertSpor}>
            {grupperetKort.map((gr, ei) => (
              <div key={`${ei}-${gr.emne}`} className={styles.emneSlot}>
                <div
                  ref={(el) => {
                    if (el) horizRefs.current[ei] = el
                    else delete horizRefs.current[ei]
                  }}
                  className={styles.horizSpor}
                >
                  {gr.kort.map((k) => (
                    <div key={k.id} className={styles.kortCelle} style={{ background: 'var(--baggrund)' }}>
                      <Flashcard key={k.id} kort={kortForNiveau(k)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={styles.menuContainer}>
        <div
          className={`${styles.handlingsStack} ${menuAaben ? styles.handlingsStackAaben : styles.handlingsStackLukket}`}
        >
          <button
            type="button"
            className={styles.handlingsKnap}
            onClick={() => aktivtKortNiveau && setAktivKilde(aktivtKortNiveau.kilde)}
            aria-label="Vis kilder"
            disabled={!aktivtKortNiveau}
          >
            📚
          </button>

          <button type="button" className={styles.handlingsKnap} aria-label="Start quiz">
            🧠
          </button>

          <button type="button" className={styles.handlingsKnap} aria-label="Åbn klinisk scenarie">
            🩺
          </button>

          <button
            type="button"
            className={styles.handlingsKnap}
            onClick={() => aktivtKortNiveau && setForbindelserAaben(true)}
            aria-label="Vis forbindelser"
            disabled={!aktivtKortNiveau}
          >
            🕸️
          </button>
        </div>
      </div>
      <div className={styles.niveauOgToggleRaekke}>
        <div className={styles.niveauCard}>
          <div className={styles.niveauSlider}>
            {NIVEAUER.map((niveau) => (
              <button
                key={niveau.id}
                type="button"
                className={`${styles.niveauKnap} ${aktivNiveau === niveau.id ? styles.niveauKnapAktiv : ''}`}
                onClick={() => setAktivNiveau(niveau.id)}
              >
                {niveau.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={styles.menuToggleKnap}
          onClick={() => setMenuAaben((v) => !v)}
          aria-label={menuAaben ? 'Luk menu' : 'Åbn menu'}
        >
          {menuAaben ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
      {aktivKilde && <KildePanel kilde={aktivKilde} onLuk={() => setAktivKilde(null)} />}
      {forbindelserAaben && aktivtKortNiveau && (
        <ForbindelserPanel
          kort={aktivtKortNiveau}
          onLuk={() => setForbindelserAaben(false)}
          onVaelgKort={gaaTilAtomId}
        />
      )}
      {filterAaben && (
        <FilterSheet
          onLuk={() => setFilterAaben(false)}
          onGaaTil={gaaTilAtomId}
          aktivId={aktivtKort?.id ?? null}
        />
      )}
    </div>
  )
}
