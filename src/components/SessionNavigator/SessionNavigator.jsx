// SessionNavigator — indholdsfortegnelse for den AKTUELLE session. Viser ALLE
// kort i sessionen grupperet efter emne (samme flade layout som SamlingPage-
// indholdet) — ingen fag/kapitel-lag, ingen fold-ud. Bare en liste man scroller.
// Tryk på et kort springer feedet derhen (onGaaTil); det aktive kort markeres.
//
// Props:
//   kort     : sessionens kort (flad liste fra useFlashcards)
//   aktivId  : id på kortet feedet står på lige nu (markeres)
//   onGaaTil : (id) => void
import { useMemo } from 'react'
import { gruppérEfterEmne } from '../../lib/browseData.js'
import styles from './SessionNavigator.module.css'

export default function SessionNavigator({ kort, aktivId, onGaaTil }) {
  const grupper = useMemo(() => gruppérEfterEmne(kort), [kort])

  if (grupper.length === 0) {
    return <p className={styles.tom}>Ingen kort i denne session.</p>
  }

  return (
    <div className={styles.nav}>
      {grupper.map((g) => (
        <section key={g.emne} className={styles.gruppe}>
          <h3 className={styles.emneHoved}>
            <span className={styles.emneNavn}>{g.emne}</span>
            <span className={styles.tæller}>{g.kort.length}</span>
          </h3>
          <div className={styles.kortListe}>
            {g.kort.map((k) => {
              const aktiv = k.id === aktivId
              return (
                <button
                  type="button"
                  key={k.id}
                  className={`${styles.kortRække} ${aktiv ? styles.kortAktiv : ''}`}
                  onClick={() => onGaaTil(k.id)}
                  aria-current={aktiv ? 'true' : undefined}
                >
                  <span className={styles.begreb}>{k.begreb || k.spørgsmål}</span>
                  {k.begreb && k.spørgsmål && <span className={styles.sp}>{k.spørgsmål}</span>}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
