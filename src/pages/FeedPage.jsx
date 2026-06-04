// Swipe med drag-follow — emner lodret, kort vandret (Refs under bevægelse)
import { useEffect, useRef, useLayoutEffect, useCallback, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useFlashcardsByEmne, useFilter } from '../hooks/useFlashcards.jsx'
import Flashcard from '../components/Flashcard/Flashcard.jsx'
import KildePanel from '../components/KildePanel/KildePanel.jsx'
import ForbindelserPanel from '../components/ForbindelserPanel/ForbindelserPanel.jsx'
import FilterSheet from '../components/FilterSheet/FilterSheet.jsx'
import styles from './FeedPage.module.css'

const THRESHOLD_PCT = 0.4
const AXIS_LOCK_PX = 8
const SNAP_PROP = 'transform'
const NIVEAUER = [
  { id: 'faglig', label: 'Fagligt', felt: 'svar_faglig' },
  { id: 'almindelig', label: 'Almindeligt', felt: 'svar_almindelig' },
  { id: 'hulemand', label: 'Hulemand', felt: 'svar_hulemand' },
]

function KortProgressBar({ antal, aktiv, emneNoegle }) {
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
  const [emneIndex, setEmneIndex] = useState(0)
  const [kortIndex, setKortIndex] = useState(0)
  const [aktivNiveau, setAktivNiveau] = useState('faglig')
  const [menuAaben, setMenuAaben] = useState(false)

  const vertTrackRef = useRef(null)
  const horizRefs = useRef({})
  const beroringStart = useRef({ x: 0, y: 0 })
  const akselLas = useRef(null)
  const traekkerRef = useRef(false)
  const snapIgangRef = useRef(false)
  // Mål-kortindex der skal anvendes EFTER et emneskift (så layout-effekten
  // ikke nulstiller til 0). Og hvilket startId vi allerede har sprunget til.
  const afventerKortIndex = useRef(null)
  const startHaandteretRef = useRef(null)

  const aktivtKort = grupperetKort[emneIndex]?.kort?.[kortIndex] ?? null

  useEffect(() => {
    setAktivtFag?.(aktivtKort?.fag ?? null)
  }, [aktivtKort?.fag, setAktivtFag])

  const nEmner = grupperetKort.length
  const gruppe = grupperetKort[emneIndex]
  const nKortIUdvalg = gruppe?.kort?.length ?? 0

  useEffect(() => {
    setEmneIndex(0)
    setKortIndex(0)
  }, [filterSleutel])

  useEffect(() => {
    setEmneIndex((i) => (nEmner === 0 ? 0 : Math.min(i, nEmner - 1)))
  }, [grupperetKort, nEmner])

  // Når man kommer fra en samlings-oversigt og har trykket på ET bestemt kort,
  // starter vi HELE samlingen, men lander på det valgte kort. startId bæres med
  // i location.state. Hop kun én gang pr. startId.
  useEffect(() => {
    const startId = location.state?.startId
    if (!startId || startHaandteretRef.current === startId || grupperetKort.length === 0) return
    for (let ei = 0; ei < grupperetKort.length; ei++) {
      const ki = grupperetKort[ei].kort.findIndex((k) => k.id === startId)
      if (ki !== -1) {
        startHaandteretRef.current = startId
        if (ei === emneIndex) {
          setKortIndex(ki)
        } else {
          afventerKortIndex.current = ki
          setEmneIndex(ei)
        }
        break
      }
    }
  }, [grupperetKort, location.state, emneIndex])

  useLayoutEffect(() => {
    if (afventerKortIndex.current != null) {
      setKortIndex(afventerKortIndex.current)
      afventerKortIndex.current = null
    } else {
      setKortIndex(0)
    }
  }, [emneIndex])

  const saetVertTransform = useCallback((dyPx) => {
    const el = vertTrackRef.current
    if (!el) return
    el.style.transform = `translate3d(0, calc(-${emneIndex} * (100dvh - 160px) + ${dyPx}px), 0)`
  }, [emneIndex])

  const saetHorizTransform = useCallback(
    (ei, dxPx) => {
      const el = horizRefs.current[ei]
      if (!el) return
      const ki = ei === emneIndex ? kortIndex : 0
      el.style.transform = `translate3d(calc(-${ki} * 100vw + ${dxPx}px), 0, 0)`
    },
    [emneIndex, kortIndex],
  )

  useLayoutEffect(() => {
    if (traekkerRef.current || snapIgangRef.current || nEmner === 0) return
    if (!vertTrackRef.current) return
    saetVertTransform(0)
    grupperetKort.forEach((_, ei) => saetHorizTransform(ei, 0))
  }, [emneIndex, kortIndex, grupperetKort, nEmner, saetVertTransform, saetHorizTransform])

  function startSnapVert(nyEmneIndex) {
    const el = vertTrackRef.current
    if (!el) return
    snapIgangRef.current = true
    el.classList.add(styles.animating)
    requestAnimationFrame(() => {
      el.style.transform = `translate3d(0, calc(-${nyEmneIndex} * (100dvh - 160px)), 0)`
    })
    function done(e) {
      if (e.propertyName !== SNAP_PROP || e.target !== el) return
      el.removeEventListener('transitionend', done)
      snapIgangRef.current = false
      el.classList.remove(styles.animating)
      el.style.transform = `translate3d(0, calc(-${nyEmneIndex} * (100dvh - 160px)), 0)`
      setEmneIndex(nyEmneIndex)
    }
    el.addEventListener('transitionend', done)
  }

  function startSnapHoriz(eiFixed, nyKortIndex) {
    const el = horizRefs.current[eiFixed]
    if (!el) return
    snapIgangRef.current = true
    el.classList.add(styles.animating)
    requestAnimationFrame(() => {
      el.style.transform = `translate3d(calc(-${nyKortIndex} * 100vw), 0, 0)`
    })
    function done(e) {
      if (e.propertyName !== SNAP_PROP || e.target !== el) return
      el.removeEventListener('transitionend', done)
      snapIgangRef.current = false
      el.classList.remove(styles.animating)
      el.style.transform = `translate3d(calc(-${nyKortIndex} * 100vw), 0, 0)`
      setKortIndex(nyKortIndex)
    }
    el.addEventListener('transitionend', done)
  }

  function paTouchFoerFinger() {
    traekkerRef.current = true
    akselLas.current = null
    const v = vertTrackRef.current
    if (v) v.classList.remove(styles.animating)
    Object.values(horizRefs.current).forEach((h) => {
      if (h) h.classList.remove(styles.animating)
    })
    saetVertTransform(0)
    grupperetKort.forEach((_, ei) => saetHorizTransform(ei, 0))
  }

  function paTouchMove(e) {
    if (!traekkerRef.current || nEmner === 0) return
    const t = e.touches[0]
    const dx = t.clientX - beroringStart.current.x
    const dy = t.clientY - beroringStart.current.y
    const ax = Math.abs(dx)
    const ay = Math.abs(dy)

    if (akselLas.current === null && (ax > AXIS_LOCK_PX || ay > AXIS_LOCK_PX)) {
      akselLas.current = ax > ay ? 'h' : 'v'
    }

    if (akselLas.current === 'h' && gruppe) {
      // Rubber band ved kant: dæmp bevægelsen hvis vi er på første/sidste kort
      let dxDaempet = dx
      const erFoersteKort = kortIndex === 0
      const erSidsteKort = kortIndex === gruppe.kort.length - 1
      if ((dx > 0 && erFoersteKort) || (dx < 0 && erSidsteKort)) {
        dxDaempet = dx * 0.2
      }
      saetHorizTransform(emneIndex, dxDaempet)
    } else if (akselLas.current === 'v') {
      // Rubber band ved kant: dæmp bevægelsen hvis vi er på første/sidste emne
      let dyDaempet = dy
      const erFoersteEmne = emneIndex === 0
      const erSidsteEmne = emneIndex === nEmner - 1
      if ((dy > 0 && erFoersteEmne) || (dy < 0 && erSidsteEmne)) {
        dyDaempet = dy * 0.2
      }
      saetVertTransform(dyDaempet)
    }
  }

  function afslutVertikal(dy) {
    const h = typeof window !== 'undefined' ? window.innerHeight : 800
    const slotHoejde = h - 160
    const th = slotHoejde * THRESHOLD_PCT
    let ny = emneIndex
    if (dy < -th && emneIndex < nEmner - 1) ny = emneIndex + 1
    else if (dy > th && emneIndex > 0) ny = emneIndex - 1
    startSnapVert(ny)
  }

  function afslutHorisontal(dx) {
    if (!gruppe) return
    const w = typeof window !== 'undefined' ? window.innerWidth : 400
    const th = w * THRESHOLD_PCT
    const max = gruppe.kort.length - 1
    let ny = kortIndex
    if (dx < -th && kortIndex < max) ny = kortIndex + 1
    else if (dx > th && kortIndex > 0) ny = kortIndex - 1
    startSnapHoriz(emneIndex, ny)
  }

  function paTouchSlutRaw(e) {
    if (!traekkerRef.current || nEmner === 0) {
      traekkerRef.current = false
      akselLas.current = null
      return
    }
    const t = e.changedTouches?.[0]
    traekkerRef.current = false
    const dx = t ? t.clientX - beroringStart.current.x : 0
    const dy = t ? t.clientY - beroringStart.current.y : 0

    if (akselLas.current === 'h') {
      afslutHorisontal(dx)
    } else if (akselLas.current === 'v') {
      afslutVertikal(dy)
    } else {
      saetVertTransform(0)
      grupperetKort.forEach((_, ei) => saetHorizTransform(ei, 0))
    }
    akselLas.current = null
  }

  function paTouchStartGem(e) {
    const tt = e.touches[0]
    beroringStart.current = { x: tt.clientX, y: tt.clientY }
    paTouchFoerFinger()
  }

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

  // Springer FeedPage til det atom-ID hvis det findes i den aktuelle visning.
  // Bruges af ForbindelserPanel når brugeren klikker på en forudsætning/relation.
  function gaaTilAtomId(id) {
    for (let ei = 0; ei < grupperetKort.length; ei++) {
      const gr = grupperetKort[ei]
      const ki = gr.kort.findIndex((k) => k.id === id)
      if (ki !== -1) {
        setForbindelserAaben(false)
        if (ei === emneIndex) {
          setKortIndex(ki)
        } else {
          afventerKortIndex.current = ki
          setEmneIndex(ei)
        }
        return
      }
    }
    // Atomet er filtreret væk — lad panelet være åbent og lad brugeren se
    // at linket peger uden for det aktuelle udvalg.
  }

  return (
    <div className={styles.side}>
      <KortProgressBar antal={nKortIUdvalg} aktiv={kortIndex} emneNoegle={emneIndex} />
      <div
        className={styles.swipeArena}
        onTouchStart={paTouchStartGem}
        onTouchMove={paTouchMove}
        onTouchEnd={paTouchSlutRaw}
        onTouchCancel={paTouchSlutRaw}
      >
        {nEmner === 0 ? (
          <div className={styles.ingenKort}>
            <p>Ingen kort matcher det valgte filter.</p>
          </div>
        ) : (
          <>
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
                      <div
                        key={k.id}
                        className={styles.kortCelle}
                        style={{ background: 'var(--baggrund)' }}
                      >
                        <Flashcard key={k.id} kort={kortForNiveau(k)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
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
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
      {aktivKilde && (
        <KildePanel kilde={aktivKilde} onLuk={() => setAktivKilde(null)} />
      )}
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
