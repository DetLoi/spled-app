// Bottom-sheet der viser et atoms forudsætninger og relationer — stort set
// samme drag/luk-mekanik som KildePanel, så de to føles ens at bruge.
import { useCallback, useEffect, useRef, useState } from 'react'
import { hentKortById } from '../../hooks/useFlashcards.jsx'
import styles from './ForbindelserPanel.module.css'

export default function ForbindelserPanel({ kort, onLuk, onVaelgKort }) {
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

  // Slå forudsætnings-IDer op i databasen, så vi kan vise begreb+emne på linket.
  const forudsætninger = (kort.forudsætninger || [])
    .map((id) => {
      const maal = hentKortById(id)
      return {
        id,
        begreb: maal ? maal.begreb || maal.spørgsmål?.split('?')[0] || id : id,
        emne: maal?.emne || null,
        findes: !!maal,
      }
    })

  // Relationer kan have mål_id (klikbar) eller blot mål_begreb (vis tekst).
  const relationer = (kort.relationer || []).map((r) => ({
    type: r.type || 'relation',
    målBegreb: r.mål_begreb || '—',
    målId: r.mål_id || null,
    mekanisme: r.mekanisme || null,
    findes: r.mål_id ? !!hentKortById(r.mål_id) : false,
  }))

  function klikLink(id) {
    if (!id || !onVaelgKort) return
    onVaelgKort(id)
  }

  return (
    <>
      <div
        className={`${styles.overlay} ${lukker ? styles.overlayLukker : ''}`}
        onClick={haandterLuk}
        onAnimationEnd={animationFaerdig}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className={`${styles.panel} ${lukker ? styles.panelLukker : ''}`}
        role="dialog"
        aria-label="Forbindelser"
      >
        <div
          className={styles.haandtag}
          onPointerDown={onHaandtagPointerDown}
          onPointerMove={onHaandtagPointerMove}
          onPointerUp={onHaandtagPointerUp}
          onPointerCancel={onHaandtagPointerCancel}
        />

        <div className={styles.indhold}>
          <section className={styles.gruppe}>
            <h3 className={styles.gruppeTitel}>Forudsætninger</h3>
            {forudsætninger.length === 0 ? (
              <p className={styles.tomTekst}>Ingen forudsætninger registreret.</p>
            ) : (
              <ul className={styles.linkListe}>
                {forudsætninger.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      className={`${styles.linkKnap} ${!f.findes ? styles.linkKnapInaktiv : ''}`}
                      onClick={() => f.findes && klikLink(f.id)}
                      disabled={!f.findes}
                    >
                      <span className={styles.linkTekst}>
                        <span className={styles.linkBegreb}>{f.begreb}</span>
                        {f.emne ? (
                          <span className={styles.linkMeta}>{f.emne}</span>
                        ) : (
                          <span className={styles.linkMeta}>(uden for nuværende vidensbase)</span>
                        )}
                      </span>
                      {f.findes && (
                        <span className={styles.linkPil} aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M9 6l6 6-6 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.gruppe}>
            <h3 className={styles.gruppeTitel}>Relationer</h3>
            {relationer.length === 0 ? (
              <p className={styles.tomTekst}>Ingen relationer registreret.</p>
            ) : (
              <ul className={styles.linkListe}>
                {relationer.map((r, i) => (
                  <li key={`${r.målId || r.målBegreb}-${i}`}>
                    <button
                      type="button"
                      className={`${styles.linkKnap} ${!r.findes ? styles.linkKnapInaktiv : ''}`}
                      onClick={() => r.findes && klikLink(r.målId)}
                      disabled={!r.findes}
                    >
                      <span className={styles.linkTekst}>
                        <span className={styles.linkBegreb}>
                          {r.type} → {r.målBegreb}
                        </span>
                        {r.mekanisme && (
                          <span className={styles.linkMeta}>{r.mekanisme}</span>
                        )}
                      </span>
                      {r.findes && (
                        <span className={styles.linkPil} aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M9 6l6 6-6 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <button type="button" className={styles.lukKnap} onClick={haandterLuk}>
          Luk
        </button>
      </div>
    </>
  )
}
