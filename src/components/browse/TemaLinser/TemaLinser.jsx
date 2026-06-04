// TemaLinser — to rækker af genveje på tværs af kapitler:
//   1) Linser: faste tværgående filtre (kerne, klinisk-kritiske, visuelle, sværhed)
//   2) Temaer: de 38 tværgående_tema, auto-genereret og sorteret efter antal
// Erstatter de gamle 4 hardcodede pakker. Ren visning; tal og lister kommer
// færdige fra browseData (tælLinser / byggTemaer).
//
// Props:
//   linser      : [{ id, label, tegn, antal }]
//   temaer      : [{ tema, antal }]
//   onVælgLinse : (id)   => void
//   onVælgTema  : (tema) => void
import { useState } from 'react'
import styles from './TemaLinser.module.css'

const TEMAER_VIST_DEFAULT = 8

export default function TemaLinser({ linser, temaer, onVælgLinse, onVælgTema }) {
  const [visAlle, setVisAlle] = useState(false)
  const synligeTemaer = visAlle ? temaer : temaer.slice(0, TEMAER_VIST_DEFAULT)

  return (
    <div className={styles.blok}>
      {/* Linser */}
      <div className={styles.chipsRække}>
        {linser.map((l) => (
          <button
            type="button"
            key={l.id}
            className={`${styles.chip} ${styles.linseChip}`}
            onClick={() => onVælgLinse(l.id)}
            disabled={l.antal === 0}
          >
            <span className={styles.tegn} aria-hidden="true">{l.tegn}</span>
            {l.label}
            <span className={styles.chipTal}>{l.antal}</span>
          </button>
        ))}
      </div>

      {/* Temaer */}
      <div className={styles.chipsRække}>
        {synligeTemaer.map((t) => (
          <button
            type="button"
            key={t.tema}
            className={styles.chip}
            onClick={() => onVælgTema(t.tema)}
          >
            {t.tema}
            <span className={styles.chipTal}>{t.antal}</span>
          </button>
        ))}
        {temaer.length > TEMAER_VIST_DEFAULT && (
          <button type="button" className={styles.visAlle} onClick={() => setVisAlle((v) => !v)}>
            {visAlle ? 'Vis færre' : `Vis alle ${temaer.length}`}
          </button>
        )}
      </div>
    </div>
  )
}
