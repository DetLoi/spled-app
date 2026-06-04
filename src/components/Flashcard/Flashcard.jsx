// Selve kortet: forside (spørgsmål) / bagside (svar) med flip-animation
import { useEffect, useRef, useState } from 'react'
import DummyBadge from '../DummyBadge/DummyBadge.jsx'
import styles from './Flashcard.module.css'
import { sendFeedback, getVote } from '../../lib/feedback.js'

// Lille markdown-renderer der dækker mønstrene vi faktisk har i svar_faglig:
// **bold**, *italic*, bulleted lister (- / *), nummererede lister (1.) og
// afsnit adskilt af tomme linjer. Bevidst minimal — vi vil ikke trække en
// hel parser ind for så lille et udsnit.
function rendererInline(tekst, nøglePræfiks) {
  const stykker = []
  const regex = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g
  let sidstePos = 0
  let m
  while ((m = regex.exec(tekst)) !== null) {
    if (m.index > sidstePos) {
      stykker.push(tekst.slice(sidstePos, m.index))
    }
    const t = m[0]
    if (t.startsWith('**')) {
      stykker.push(
        <strong key={`${nøglePræfiks}-b-${m.index}`}>{t.slice(2, -2)}</strong>,
      )
    } else {
      stykker.push(
        <em key={`${nøglePræfiks}-i-${m.index}`}>{t.slice(1, -1)}</em>,
      )
    }
    sidstePos = regex.lastIndex
  }
  if (sidstePos < tekst.length) {
    stykker.push(tekst.slice(sidstePos))
  }
  return stykker
}

function rendererMarkdown(tekst) {
  if (!tekst) return null
  const blokke = tekst.split(/\n{2,}/)
  return blokke.map((blok, bi) => {
    const linjer = blok.split('\n').map((l) => l.trimEnd())
    const ikkeTomme = linjer.filter((l) => l.trim() !== '')

    // Bullet-liste hvis alle ikke-tomme linjer starter med "- " eller "* "
    if (ikkeTomme.length > 0 && ikkeTomme.every((l) => /^\s*[-*]\s/.test(l))) {
      return (
        <ul key={`ul-${bi}`}>
          {ikkeTomme.map((l, li) => (
            <li key={li}>
              {rendererInline(l.replace(/^\s*[-*]\s+/, ''), `${bi}-${li}`)}
            </li>
          ))}
        </ul>
      )
    }

    // Nummereret liste hvis alle ikke-tomme linjer starter med "1. ", "2. " osv.
    if (ikkeTomme.length > 0 && ikkeTomme.every((l) => /^\s*\d+\.\s/.test(l))) {
      return (
        <ol key={`ol-${bi}`}>
          {ikkeTomme.map((l, li) => (
            <li key={li}>
              {rendererInline(l.replace(/^\s*\d+\.\s+/, ''), `${bi}-${li}`)}
            </li>
          ))}
        </ol>
      )
    }

    // Almindeligt afsnit — bevar single line breaks som <br/>.
    const børn = []
    linjer.forEach((linje, li) => {
      if (li > 0) børn.push(<br key={`br-${bi}-${li}`} />)
      børn.push(...rendererInline(linje, `${bi}-${li}`))
    })
    return <p key={`p-${bi}`}>{børn}</p>
  })
}

const FAG_KLASSER = {
  farmakologi: styles.farmakologi,
  sygepleje: styles.sygepleje,
  sygdomslære: styles.sygdomslaere,
  organisation: styles.organisation,
}

function FlipIkon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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
  const transitionTimeouts = useRef({ ud: null, ind: null })

  const fagKlasse = FAG_KLASSER[kort.fag] || ''

  useEffect(() => {
    return () => {
      if (transitionTimeouts.current.ud) clearTimeout(transitionTimeouts.current.ud)
      if (transitionTimeouts.current.ind) clearTimeout(transitionTimeouts.current.ind)
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

  function haandterStemme(e, vote) {
    e.stopPropagation()
    const ny = stemme === vote ? null : vote
    setStemme(ny)
    if (ny) sendFeedback({ atomId: kort.id, niveau: kort._niveau || 'faglig', vote: ny, begreb: kort.begreb || kort.emne || '', fag: kort.fag || '' })
  }

  function haandterFlip() {
    setVendt((v) => !v)
  }

  return (
    <div className={styles.wrapper}>
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
              {kort.dummy && <DummyBadge />}
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
              {kort.dummy && <DummyBadge />}
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
              <span className={styles.feedbackLabel}>Nyttigt?</span>
              <button type="button" aria-label="Nyttigt" aria-pressed={stemme === 'up'}
                className={`${styles.fbKnap} ${stemme === 'up' ? styles.fbOp : ''}`}
                onClick={(e) => haandterStemme(e, 'up')}>👍</button>
              <button type="button" aria-label="Ikke nyttigt" aria-pressed={stemme === 'down'}
                className={`${styles.fbKnap} ${stemme === 'down' ? styles.fbNed : ''}`}
                onClick={(e) => haandterStemme(e, 'down')}>👎</button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
