// FagTrae — drill-down: fag → kapitel → emne. Erstatter den gamle flade
// alfabetiske emne-liste. Ren visning + lokal udfold-tilstand; al data kommer
// færdigberegnet fra browseData.byggFagTræ().
//
// Props:
//   fagTræ        : output fra byggFagTræ(kort)
//   onVælgEmne    : (emneNavn)   => void  — start session med hele emnet
//   onVælgKapitel : (kapitelRå)  => void  — start session med hele kapitlet
//
// Udfold-tilstand holdes lokalt (Set af fag-navne og af kapitel-strenge).
// Default: første fag (Anatomi) er foldet ud, kapitler foldet sammen.
import { useState } from 'react'
import styles from './FagTrae.module.css'

function Pil({ åben }) {
  return (
    <svg
      className={`${styles.pil} ${åben ? styles.pilÅben : ''}`}
      width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function FagTrae({ fagTræ, onVælgEmne, onVælgKapitel }) {
  const [åbneFag, setÅbneFag] = useState(() => new Set(fagTræ.length ? [fagTræ[0].fag] : []))
  const [åbneKap, setÅbneKap] = useState(() => new Set())

  function toggle(sæt, setter, nøgle) {
    setter((prev) => {
      const ny = new Set(prev)
      if (ny.has(nøgle)) ny.delete(nøgle)
      else ny.add(nøgle)
      return ny
    })
  }

  return (
    <div className={styles.træ}>
      {fagTræ.map((f) => {
        const fagÅben = åbneFag.has(f.fag)
        return (
          <div key={f.fag} className={styles.fagBlok}>
            <button
              type="button"
              className={styles.fagHoved}
              onClick={() => toggle(åbneFag, setÅbneFag, f.fag)}
              aria-expanded={fagÅben}
            >
              <Pil åben={fagÅben} />
              <span className={styles.fagNavn}>{f.fag}</span>
              <span className={styles.tæller}>{f.antal}</span>
            </button>

            {fagÅben && (
              <div className={styles.kapListe}>
                {f.kapitler.map((kap) => {
                  const kapÅben = åbneKap.has(kap.rå)
                  return (
                    <div key={kap.rå} className={styles.kapBlok}>
                      <button
                        type="button"
                        className={styles.kapHoved}
                        onClick={() => toggle(åbneKap, setÅbneKap, kap.rå)}
                        aria-expanded={kapÅben}
                      >
                        <Pil åben={kapÅben} />
                        <span className={styles.kapNavn}>{kap.titel}</span>
                        <span className={styles.tæller}>{kap.antal}</span>
                      </button>

                      {kapÅben && (
                        <div className={styles.emneListe}>
                          <button
                            type="button"
                            className={styles.heleKapitlet}
                            onClick={() => onVælgKapitel(kap.rå)}
                          >
                            Træn hele kapitlet ({kap.antal})
                          </button>
                          {kap.emner.map((e) => (
                            <button
                              type="button"
                              key={e.emne}
                              className={styles.emneRække}
                              onClick={() => onVælgEmne(e.emne)}
                            >
                              <span className={styles.emneNavn}>{e.emne}</span>
                              <span className={styles.tæller}>{e.antal}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
