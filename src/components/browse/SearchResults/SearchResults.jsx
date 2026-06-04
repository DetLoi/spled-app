// SearchResults — viser søgeresultater som en liste af rækker. Ren visning;
// BrowsePage leverer de allerede-fundne kort og håndterer klik.
//
// Props:
//   resultater : kort[] (alle match fra browseData.søg)
//   onVælg     : (kort) => void  — start en session med dette ene kort
//   maks       : maks antal rækker der vises (default 40)
import styles from './SearchResults.module.css'

export default function SearchResults({ resultater, onVælg, maks = 40 }) {
  if (resultater.length === 0) {
    return <p className={styles.tom}>Ingen kort matcher. Prøv et andet ord.</p>
  }

  const vist = resultater.slice(0, maks)
  const resten = resultater.length - vist.length

  return (
    <div className={styles.liste}>
      <p className={styles.antal}>{resultater.length} resultat{resultater.length === 1 ? '' : 'er'}</p>
      {vist.map((k) => (
        <button type="button" key={k.id} className={styles.række} onClick={() => onVælg(k)}>
          <span className={styles.begreb}>{k.begreb || k.spørgsmål}</span>
          <span className={styles.sti}>{k.emne} · {k.fag}</span>
        </button>
      ))}
      {resten > 0 && (
        <p className={styles.flere}>+{resten} flere — forfin søgningen for at se dem.</p>
      )}
    </div>
  )
}
