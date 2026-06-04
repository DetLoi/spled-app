// Session-sheet: semesterfilter + navigator (fag→kapitel→emne→kort) for den
// AKTUELLE session. Et tryk på et kort springer feedet derhen (ingen genstart).
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFilter, useFlashcards } from '../../hooks/useFlashcards.jsx'
import SessionNavigator from '../SessionNavigator/SessionNavigator.jsx'
import styles from './FilterSheet.module.css'

const SEMESTRE = ['alle', 1, 2, 3, 4, 5, 6, 7]

function semesterLabel(s) {
  return s === 'alle' ? 'Alle' : `Sem. ${s}`
}

export default function FilterSheet({ onLuk, onGaaTil, aktivId }) {
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

  function animationFaerdig(e) {
    if (e.target !== e.currentTarget) return
    if (!afslutterRef.current) return
    if (!String(e.animationName).includes('fadeUd')) return
    afslutterRef.current = false
    onLuk()
  }

  const { semester, setSemester, nulstil } = useFilter()
  // Den AKTUELLE sessions kort (samme filtrerede sæt som feedet viser). Tryk på
  // et kort i navigatoren jumper via onGaaTil + lukker arket.
  const sessionKort = useFlashcards()

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
          <h2 className={styles.titel}>Gå til</h2>
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

        <div className={styles.navWrap}>
          <SessionNavigator
            kort={sessionKort}
            aktivId={aktivId}
            onGaaTil={(id) => {
              onGaaTil?.(id)
              haandterLuk()
            }}
          />
        </div>

        <button type="button" className={styles.visKortKnap} onClick={haandterLuk}>
          Vis kort
        </button>
      </div>
    </>
  )
}
