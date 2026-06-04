// Kilde-sheet der glider op fra bunden — lukkes ved tap udenfor
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './KildePanel.module.css'

export default function KildePanel({ kilde, onLuk }) {
  const [lukker, setLukker] = useState(false)
  const afslutterRef = useRef(false)
  const panelRef = useRef(null)
  const dragStartY = useRef(null)
  const currentDy = useRef(0)
  const activePointerId = useRef(null)

  const haandterLuk = useCallback(() => {
    const el = panelRef.current
    if (el) {
      el.style.animation = ''
      el.style.transition = ''
      el.style.transform = ''
      el.style.willChange = ''
    }
    afslutterRef.current = true
    setLukker(true)
  }, [])

  function animationFaerdig(e) {
    if (e.target !== e.currentTarget) return
    if (!afslutterRef.current) return
    if (!String(e.animationName).includes('fadeUd')) return
    afslutterRef.current = false
    onLuk()
  }

  function stopTransition() {
    const el = panelRef.current
    if (!el) return
    el.style.animation = 'none'
    el.style.transition = 'none'
    el.style.willChange = 'transform'
  }

  function springTilbage() {
    const el = panelRef.current
    if (!el) return
    el.style.transition = 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)'
    el.style.transform = 'translateY(0)'
    el.style.willChange = 'auto'
  }

  function slideUd(onDone) {
    const el = panelRef.current
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
    const el = panelRef.current
    if (!el) return
    el.style.transform = dy <= 0
      ? `translateY(${dy * 0.12}px)`
      : `translateY(${dy}px)`
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

  useEffect(() => {
    function haandterTast(e) {
      if (e.key === 'Escape') haandterLuk()
    }
    document.addEventListener('keydown', haandterTast)
    return () => document.removeEventListener('keydown', haandterTast)
  }, [haandterLuk])

  return (
    <>
      {/* Baggrundsdimmer */}
      <div
        className={`${styles.overlay} ${lukker ? styles.overlayLukker : ''}`}
        onClick={haandterLuk}
        onAnimationEnd={animationFaerdig}
        aria-hidden="true"
      />

      {/* Selve panelet */}
      <div
        ref={panelRef}
        className={`${styles.panel} ${lukker ? styles.panelLukker : ''}`}
        role="dialog"
        aria-label="Kildeoplysninger"
      >
        <div
          className={styles.haandtag}
          onPointerDown={onHaandtagPointerDown}
          onPointerMove={onHaandtagPointerMove}
          onPointerUp={onHaandtagPointerUp}
          onPointerCancel={onHaandtagPointerCancel}
        />

        <p className={styles.label}>Kilde</p>
        <p className={styles.kildetekst}>
          <span className={styles.kildeIkon} aria-hidden="true">📖</span>
          <span className={styles.kildeIndhold}>{kilde.tekst}</span>
        </p>

        <button type="button" className={styles.lukKnap} onClick={haandterLuk}>
          Luk
        </button>
      </div>
    </>
  )
}
