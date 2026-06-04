// Rød markering på ikke-verificerede kort
import styles from './DummyBadge.module.css'

export default function DummyBadge() {
  return (
    <span className={styles.badge} aria-label="Ikke kildeverificeret">
      Demo
    </span>
  )
}
