// SearchBar — controlled søgefelt til forsiden. Ingen data-logik her; den
// rapporterer blot tekst op til BrowsePage, som kører browseData.søg().
//
// Props:
//   værdi    : nuværende søgetekst (string)
//   onÆndring: (tekst) => void  — kaldes ved hvert tastetryk
//   onRyd    : () => void       — kaldes når brugeren rydder feltet
import styles from './SearchBar.module.css'

export default function SearchBar({ værdi, onÆndring, onRyd }) {
  return (
    <div className={styles.felt}>
      <svg className={styles.ikon} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        className={styles.input}
        value={værdi}
        onChange={(e) => onÆndring(e.target.value)}
        placeholder="Søg begreb, organ, emne …"
        aria-label="Søg i alle kort"
        autoComplete="off"
        spellCheck={false}
      />
      {værdi !== '' && (
        <button type="button" className={styles.ryd} onClick={onRyd} aria-label="Ryd søgning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
