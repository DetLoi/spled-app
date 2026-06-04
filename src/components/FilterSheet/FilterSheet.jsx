// Filter-sheet: semester chips + søgefelt + fag-accordion med emne-toggles
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFilter, useAlleEmnerPerFag } from '../../hooks/useFlashcards.jsx'
import styles from './FilterSheet.module.css'

const SEMESTRE = ['alle', 1, 2, 3, 4, 5, 6, 7]

const FAG_CSS_MAP = {
  'sygdomslære': 'sygdomslaere',
  farmakologi: 'farmakologi',
  sygepleje: 'sygepleje',
  organisation: 'organisation',
}

function semesterLabel(s) {
  return s === 'alle' ? 'Alle' : `Sem. ${s}`
}

function fagLabel(fag) {
  return fag.charAt(0).toUpperCase() + fag.slice(1)
}

function FagSektion({ fag, emner, fravalgte, toggelEmne, toggelFag }) {
  const [aaben, setAaben] = useState(true)
  const alleFravalgt = emner.every((e) => fravalgte.has(e))
  const alleValgt = emner.every((e) => !fravalgte.has(e))

  return (
    <div className={styles.fagSektion}>
      {/* Fag-header */}
      <button
        type="button"
        className={styles.fagHeader}
        onClick={() => setAaben((a) => !a)}
      >
        <div className={styles.fagHeaderVenstre}>
          <span
            className={styles.fagDot}
            style={{
              background: `var(--accent-${FAG_CSS_MAP[fag] ?? fag})`,
            }}
          />
          <span className={`${styles.fagNavn} ${alleFravalgt ? styles.fagInaktiv : ''}`}>
            {fagLabel(fag)}
          </span>
        </div>
        <svg
          className={`${styles.chevronIkon} ${aaben ? styles.chevronAaben : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Emne-liste */}
      {aaben && (
        <div className={styles.emneliste}>
          <button
            type="button"
            className={styles.alleToggle}
            onClick={() => toggelFag(fag, emner)}
          >
            <span className={`${styles.checkboks} ${alleValgt ? styles.checkAktiv : ''}`} />
            <span className={styles.emneNavn}>Alle {fagLabel(fag)}</span>
          </button>

          {emner.map((emne) => {
            const aktiv = !fravalgte.has(emne)
            return (
              <button
                key={emne}
                type="button"
                className={styles.emneRaekke}
                onClick={() => toggelEmne(emne)}
              >
                <span className={`${styles.checkboks} ${aktiv ? styles.checkAktiv : ''}`} />
                <span className={`${styles.emneNavn} ${aktiv ? '' : styles.emneInaktiv}`}>
                  {emne}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function FilterSheet({ onLuk }) {
  const [lukker, setLukker] = useState(false)
  const afslutterRef = useRef(false)
  const sheetRef = useRef(null)
  const dragStartY = useRef(null)
  const currentDy = useRef(0)
  const activePointerId = useRef(null)

  const haandterLuk = useCallback(() => {
    const el = sheetRef.current
    if (el) {
      el.style.animation = ''
      el.style.transition = ''
      el.style.transform = ''
      el.style.willChange = ''
    }
    afslutterRef.current = true
    setLukker(true)
  }, [])

  function stopTransition() {
    const el = sheetRef.current
    if (!el) return
    el.style.animation = 'none'
    el.style.transition = 'none'
    el.style.willChange = 'transform'
  }

  function springTilbage() {
    const el = sheetRef.current
    if (!el) return
    el.style.transition = 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)'
    el.style.transform = 'translateY(0)'
    el.style.willChange = 'auto'
  }

  function slideUd(onDone) {
    const el = sheetRef.current
    if (!el) return
    el.style.animation = 'none'
    el.style.transition = 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)'
    el.style.transform = 'translateY(110%)'
    el.addEventListener('transitionend', () => onDone(), { once: true })
  }

  function opdaterDrag(clientY) {
    if (dragStartY.current === null) return
    const dy = clientY - dragStartY.current
    currentDy.current = dy
    const el = sheetRef.current
    if (!el) return
    if (dy <= 0) {
      el.style.transform = `translateY(${dy * 0.12}px)`
    } else {
      el.style.transform = `translateY(${dy}px)`
    }
  }

  function afslutDrag() {
    dragStartY.current = null
    if (currentDy.current > 100) {
      slideUd(() => onLuk())
    } else {
      springTilbage()
    }
    currentDy.current = 0
    activePointerId.current = null
  }

  function onHaandtagPointerDown(e) {
    if (lukker) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    activePointerId.current = e.pointerId
    dragStartY.current = e.clientY
    currentDy.current = 0
    stopTransition()
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function onHaandtagPointerMove(e) {
    if (lukker) return
    if (activePointerId.current !== e.pointerId) return
    e.stopPropagation()
    e.preventDefault()
    opdaterDrag(e.clientY)
  }

  function onHaandtagPointerUp(e) {
    if (lukker) return
    if (activePointerId.current !== e.pointerId) return
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    afslutDrag()
  }

  function onHaandtagPointerCancel(e) {
    if (activePointerId.current !== e.pointerId) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    dragStartY.current = null
    currentDy.current = 0
    activePointerId.current = null
    springTilbage()
  }

  function onHaandtagMouseDown(e) {
    if (lukker) return
    e.preventDefault()
    e.stopPropagation()
    dragStartY.current = e.clientY
    currentDy.current = 0
    stopTransition()

    function onMouseMove(ev) {
      ev.preventDefault()
      if (dragStartY.current === null) return
      const dy = ev.clientY - dragStartY.current
      currentDy.current = dy
      const el = sheetRef.current
      if (!el) return
      if (dy <= 0) {
        el.style.transform = `translateY(${dy * 0.12}px)`
      } else {
        el.style.transform = `translateY(${dy}px)`
      }
    }

    function onMouseUp(ev) {
      ev.preventDefault()
      dragStartY.current = null
      if (currentDy.current > 100) {
        slideUd(() => onLuk())
      } else {
        springTilbage()
      }
      currentDy.current = 0
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function animationFaerdig(e) {
    if (e.target !== e.currentTarget) return
    if (!afslutterRef.current) return
    if (!String(e.animationName).includes('fadeUd')) return
    afslutterRef.current = false
    onLuk()
  }

  const {
    semester,
    setSemester,
    soegning,
    setSoegning,
    fravalgte,
    toggelEmne,
    toggelFag,
    nulstil,
  } = useFilter()
  const faggrupper = useAlleEmnerPerFag()

  useEffect(() => {
    function haandterTast(e) {
      if (e.key === 'Escape') haandterLuk()
    }
    document.addEventListener('keydown', haandterTast)
    return () => document.removeEventListener('keydown', haandterTast)
  }, [haandterLuk])

  return (
    <>
      <div
        className={`${styles.overlay} ${lukker ? styles.overlayLukker : ''}`}
        onClick={haandterLuk}
        onAnimationEnd={animationFaerdig}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`${styles.sheet} ${lukker ? styles.sheetLukker : ''}`}
        role="dialog"
        aria-label="Filter"
      >
        <div
          className={styles.haandtag}
          onPointerDown={onHaandtagPointerDown}
          onPointerMove={onHaandtagPointerMove}
          onPointerUp={onHaandtagPointerUp}
          onPointerCancel={onHaandtagPointerCancel}
        />

        <div className={styles.sheetHeader}>
          <h2 className={styles.titel}>Filter</h2>
          <button type="button" className={styles.nulstilKnap} onClick={nulstil}>
            Nulstil
          </button>
        </div>

        <p className={styles.gruppeLabel}>Semester</p>
        <div className={styles.chips}>
          {SEMESTRE.map((s) => (
            <button
              key={String(s)}
              type="button"
              className={`${styles.chip} ${semester === s ? styles.chipAktiv : ''}`}
              onClick={() => setSemester(s)}
            >
              {semesterLabel(s)}
            </button>
          ))}
        </div>

        <div className={styles.soegWrapper}>
          <span className={styles.soegIkon} aria-hidden>
            ⌕
          </span>
          <input
            className={styles.soegFelt}
            type="search"
            placeholder="Søg i spørgsmål og emner…"
            value={soegning}
            onChange={(e) => setSoegning(e.target.value)}
            autoComplete="off"
          />
          {soegning ? (
            <button
              type="button"
              className={styles.soegRyd}
              onClick={() => setSoegning('')}
              aria-label="Ryd søgning"
            >
              ✕
            </button>
          ) : null}
        </div>

        {soegning.trim() === '' && (
          <div className={styles.accordionListe}>
            {faggrupper.map(({ fag, emner }) => (
              <FagSektion
                key={fag}
                fag={fag}
                emner={emner}
                fravalgte={fravalgte}
                toggelEmne={toggelEmne}
                toggelFag={toggelFag}
              />
            ))}
          </div>
        )}

        {soegning.trim() !== '' && (
          <>
            <p className={styles.soegInfo}>Viser kort der matcher søgningen</p>
            <div className={styles.soegFylder} aria-hidden />
          </>
        )}

        <button type="button" className={styles.visKortKnap} onClick={haandterLuk}>
          Vis kort
        </button>
      </div>
    </>
  )
}
