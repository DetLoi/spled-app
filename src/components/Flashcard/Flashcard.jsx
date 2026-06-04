// Selve kortet: forside (spørgsmål) / bagside (svar) med flip-animation.
import { useEffect, useRef, useState } from 'react'
import styles from './Flashcard.module.css'
import { sendFeedback, getVote } from '../../lib/feedback.js'
import { rendererMarkdown } from '../../lib/miniMarkdown.jsx'

const FAG_KLASSER = {
  farmakologi: styles.farmakologi,
  sygepleje: styles.sygepleje,
  sygdomslære: styles.sygdomslaere,
  organisation: styles.organisation,
}

function FlipIkon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7h13a4 4 0 0 1 4 4M3 7l4-4M3 7l4 4M21 17H8a4 4 0 0 1-4-4M21 17l-4 4M21 17l-4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Flashcard({ kort }) {
  const [vendt, setVendt] = useState(false)
  const [vistBagside, setVistBagside] = useState(kort.bagside)
  const [svarTransition, setSvarTransition] = useState('')
  const [stemme, setStemme] = useState(() => getVote(kort.id))
  const [kommentarAaben, setKommentarAaben] = useState(false)
  const [kommentar, setKommentar] = useState('')
  const [bekraeftet, setBekraeftet] = useState(false) // viser kort "Sendt ✓" efter en stemme
  const afventerNedRef = useRef(false) // en 👎 der venter på at blive sendt (m/u kommentar)
  const kommentarRef = useRef('')      // seneste kommentar-tekst (til unmount-sikkerhed)
  const bekraeftTimer = useRef(null)
  const kortRef = useRef(kort)
  useEffect(() => { kortRef.current = kort })
  const transitionTimeouts = useRef({ ud: null, ind: null })

  const fagKlasse = FAG_KLASSER[kort.fag] || ''

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- bevidste flip-animations- og sync-til-prop-effekter */
  useEffect(() => {
    return () => {
      if (transitionTimeouts.current.ud) clearTimeout(transitionTimeouts.current.ud)
      if (transitionTimeouts.current.ind) clearTimeout(transitionTimeouts.current.ind)
      if (bekraeftTimer.current) clearTimeout(bekraeftTimer.current)
    }
  }, [])

  useEffect(() => {
    if (kort.bagside === vistBagside) return
    if (transitionTimeouts.current.ud) clearTimeout(transitionTimeouts.current.ud)
    if (transitionTimeouts.current.ind) clearTimeout(transitionTimeouts.current.ind)

    setSvarTransition('ud')
    transitionTimeouts.current.ud = setTimeout(() => {
      setVistBagside(kort.bagside)
      setSvarTransition('ind')
      transitionTimeouts.current.ind = setTimeout(() => {
        setSvarTransition('')
      }, 180)
    }, 150)
  }, [kort.bagside, vistBagside])

  useEffect(() => {
    if (transitionTimeouts.current.ud) clearTimeout(transitionTimeouts.current.ud)
    if (transitionTimeouts.current.ind) clearTimeout(transitionTimeouts.current.ind)
    setVistBagside(kort.bagside)
    setSvarTransition('')
  }, [kort.id])

  useEffect(() => { setStemme(getVote(kort.id)) }, [kort.id])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // Hvis kortet forlades mens en 👎 venter (popup åben, ikke afsluttet), så send
  // stemmen alligevel — så et nedadtryk aldrig går tabt.
  useEffect(() => {
    return () => {
      if (afventerNedRef.current) {
        const k = kortRef.current
        sendFeedback({ atomId: k.id, niveau: k._niveau || 'faglig', vote: 'down', kommentar: kommentarRef.current.trim(), begreb: k.begreb || k.emne || '', fag: k.fag || '' })
        afventerNedRef.current = false
      }
    }
  }, [])

  // Vis en kort, diskret "Sendt ✓"-bekræftelse.
  function visBekraeftet() {
    setBekraeftet(true)
    if (bekraeftTimer.current) clearTimeout(bekraeftTimer.current)
    bekraeftTimer.current = setTimeout(() => setBekraeftet(false), 1600)
  }

  function sendStemme(vote, komm = '') {
    sendFeedback({ atomId: kort.id, niveau: kort._niveau || 'faglig', vote, kommentar: komm, begreb: kort.begreb || kort.emne || '', fag: kort.fag || '' })
    visBekraeftet()
  }

  function haandterStemme(e, vote) {
    e.stopPropagation()
    const ny = stemme === vote ? null : vote
    setStemme(ny)
    if (ny === 'up') {
      afventerNedRef.current = false
      setKommentarAaben(false)
      sendStemme('up')
    } else if (ny === 'down') {
      // Åbn kommentar-popup. Selve 👎 sendes når popup'en lukkes (eller ved unmount).
      afventerNedRef.current = true
      setKommentar('')
      kommentarRef.current = ''
      setKommentarAaben(true)
    } else {
      // Togglet fra igen før afsendelse.
      afventerNedRef.current = false
      setKommentarAaben(false)
    }
  }

  // Luk popup og afslut den ventende 👎 (med eller uden kommentar).
  function afslutKommentar(medTekst) {
    if (afventerNedRef.current) {
      sendStemme('down', medTekst ? kommentarRef.current.trim() : '')
      afventerNedRef.current = false
    }
    setKommentarAaben(false)
  }

  function haandterFlip() {
    setVendt((v) => !v)
  }

  return (
    <div className={styles.wrapper}>
      {/* Diskret skærmlæser-besked om hvilken side der vises. */}
      <span className={styles.srOnly} aria-live="polite">{vendt ? 'Viser svar' : 'Viser spørgsmål'}</span>
      <div
        className={`${styles.flipContainer} ${fagKlasse} ${vendt ? styles.vendt : ''}`}
        onClick={haandterFlip}
        role="button"
        aria-label={vendt ? 'Tap for at se spørgsmål' : 'Tap for at se svar'}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && haandterFlip()}
      >
        {/* === FORSIDE: spørgsmål === */}
        <div className={`${styles.side} ${styles.forside}`}>
          <header className={styles.kortHoved}>
            <div className={styles.metaHoejre}>
              <span className={styles.labelOutline}>Spørgsmål</span>
            </div>
            <div className={styles.metaVenstre}>
              <span className={styles.emne}>{kort.begreb || kort.emne}</span>
            </div>
          </header>

          <div className={styles.indhold}>
            <span className={styles.accentStreg} aria-hidden="true" />
            <p className={styles.spoergsmaalTekst}>{kort.forside}</p>
          </div>

          <footer className={styles.kortFod}>
            <span className={styles.hint}>
              <FlipIkon />
              Tap for svar
            </span>
          </footer>
        </div>

        {/* === BAGSIDE: svar (med spørgsmålet vist øverst) === */}
        <div className={`${styles.side} ${styles.bagside}`}>
          <header className={styles.kortHoved}>
            <div className={styles.metaHoejre}>
              <span className={styles.labelFyldt}>Svar</span>
            </div>
            <div className={styles.metaVenstre}>
              <span className={styles.emne}>{kort.begreb || kort.emne}</span>
            </div>
          </header>

          <div className={styles.citat}>
            <span className={styles.citatLabel}>Spørgsmål</span>
            <p className={styles.citatTekst}>{kort.forside}</p>
          </div>

          <div className={styles.indhold}>
            <span className={styles.accentStreg} aria-hidden="true" />
            <div
              className={`${styles.svarTekst} ${svarTransition === 'ud' ? styles.svarTekstUd : ''} ${svarTransition === 'ind' ? styles.svarTekstInd : ''}`}
            >
              {rendererMarkdown(vistBagside)}
            </div>
          </div>

          <footer className={styles.kortFod}>
            <span className={styles.hint}>
              <FlipIkon />
              Tap for spørgsmål
            </span>
            <div className={styles.feedback} onClick={(e) => e.stopPropagation()}>
              {bekraeftet ? (
                <span className={styles.fbSendt} role="status">Sendt ✓</span>
              ) : (
                <span className={styles.feedbackLabel}>Nyttigt?</span>
              )}
              <button type="button" aria-label="Nyttigt" aria-pressed={stemme === 'up'}
                className={`${styles.fbKnap} ${stemme === 'up' ? styles.fbOp : ''}`}
                onClick={(e) => haandterStemme(e, 'up')}>👍</button>
              <button type="button" aria-label="Ikke nyttigt" aria-pressed={stemme === 'down'}
                className={`${styles.fbKnap} ${stemme === 'down' ? styles.fbNed : ''}`}
                onClick={(e) => haandterStemme(e, 'down')}>👎</button>
            </div>
          </footer>

          {kommentarAaben && (
            <div className={styles.kommentarOverlay} onClick={(e) => { e.stopPropagation(); afslutKommentar(false) }}>
              <div className={styles.kommentarPanel} onClick={(e) => e.stopPropagation()}>
                <p className={styles.kommentarTitel}>Hvad var galt? <span className={styles.kommentarValgfri}>(valgfrit)</span></p>
                <textarea
                  className={styles.kommentarFelt}
                  value={kommentar}
                  onChange={(e) => { setKommentar(e.target.value); kommentarRef.current = e.target.value }}
                  placeholder="Fx forkert, uklart, eller mangler noget…"
                  rows={3}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <div className={styles.kommentarKnapper}>
                  <button type="button" className={styles.kommentarSpring} onClick={(e) => { e.stopPropagation(); afslutKommentar(false) }}>Spring over</button>
                  <button type="button" className={styles.kommentarSend} onClick={(e) => { e.stopPropagation(); afslutKommentar(true) }}>Send</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
