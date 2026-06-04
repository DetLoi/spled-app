// SamlingPage — oversigt over en "samling" (tema eller linse) FØR man går i
// gang. Svarer på spørgsmålene "hvad er her, hvor mange, og hvad er de andre
// kort". URL'en er sandhedskilden: /samling/:type/:vaerdi
//   type = 'tema'  → vaerdi er et tværgående_tema-navn
//   type = 'linse' → vaerdi er en linse-id (kerne, kritisk, visuelle, …)
//
// Fejlfinding: forkert indhold → afledningen herunder (useMemo på type/vaerdi)
// eller browseData; forkert udseende → SamlingPage.module.css.
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hentAlleKort } from '../lib/kortData.js'
import { useFilter } from '../context/FilterContext.jsx'
import { gruppérEfterEmne, linsePredikat, linseLabel, sortérPædagogisk } from '../lib/browseData.js'
import styles from './SamlingPage.module.css'

export default function SamlingPage() {
  const { type, vaerdi } = useParams()
  const navigate = useNavigate()
  const { setUdvalgteIds } = useFilter()
  const alleKort = useMemo(() => hentAlleKort(), [])
  const dekodet = decodeURIComponent(vaerdi || '')

  // Udled titel + kort ud fra ruten — ren afledning via browseData.
  const { titel, kort } = useMemo(() => {
    if (type === 'linse') {
      const passer = linsePredikat(dekodet)
      return { titel: linseLabel(dekodet), kort: alleKort.filter(passer) }
    }
    // default: tema
    return {
      titel: dekodet,
      kort: alleKort.filter((k) => (k.tværgående_tema || []).includes(dekodet)),
    }
  }, [type, dekodet, alleKort])

  const grupper = useMemo(() => gruppérEfterEmne(kort), [kort])

  // Start hele samlingen i pædagogisk rækkefølge.
  function startAlle() {
    if (kort.length === 0) return
    setUdvalgteIds(sortérPædagogisk(kort).map((k) => k.id))
    navigate('/session')
  }
  // Tryk på ét kort: start HELE samlingen (så man kan scrolle op/ned), men land
  // på det valgte kort — FeedPage læser startId fra location.state.
  function startEt(id) {
    setUdvalgteIds(sortérPædagogisk(kort).map((k) => k.id))
    navigate('/session', { state: { startId: id } })
  }

  return (
    <div className={styles.side}>
      <header className={styles.hoved}>
        <button type="button" className={styles.tilbage} onClick={() => navigate(-1)} aria-label="Tilbage">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className={styles.hovedTekst}>
          <h1 className={styles.titel}>{titel}</h1>
          <span className={styles.antal}>
            {kort.length} kort · {grupper.length} emne{grupper.length === 1 ? '' : 'r'}
          </span>
        </div>
      </header>

      {kort.length === 0 ? (
        <p className={styles.tom}>Ingen kort i denne samling.</p>
      ) : (
        <div className={styles.indhold}>
          {grupper.map((g) => (
            <section key={g.emne} className={styles.gruppe}>
              <h2 className={styles.gruppeTitel}>
                {g.emne}
                <span className={styles.gruppeTal}>{g.kort.length}</span>
              </h2>
              <div className={styles.kortListe}>
                {g.kort.map((k) => (
                  <button type="button" key={k.id} className={styles.kortRække} onClick={() => startEt(k.id)}>
                    <span className={styles.kortBegreb}>{k.begreb || k.spørgsmål}</span>
                    {k.begreb && k.spørgsmål && <span className={styles.kortSp}>{k.spørgsmål}</span>}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {kort.length > 0 && (
        <div className={styles.bund}>
          <button type="button" className={styles.startKnap} onClick={startAlle}>
            Start gennemgang ({kort.length})
          </button>
        </div>
      )}
    </div>
  )
}
