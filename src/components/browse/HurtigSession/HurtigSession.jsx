// HurtigSession — "start en kort runde": vælg længde, evt. emner og linser, og
// vi udvælger kortene. Selvstændig: holder sin egen picker-tilstand og udleder
// emne-optælling fra alleKort. Rapporterer kun det endelige id-udvalg op.
//
// Props:
//   alleKort : alle kort (fra hentAlleKort)
//   onStart  : (ids[]) => void  — start session med disse kort i denne rækkefølge
import { useMemo, useState } from 'react'
import { sortérPædagogisk } from '../../../lib/browseData.js'
import styles from './HurtigSession.module.css'

const TID_MULIGHEDER = [
  { id: '5min', label: '5 min', antal: 8 },
  { id: '10min', label: '10 min', antal: 15 },
  { id: '15min', label: '15 min', antal: 25 },
]

export default function HurtigSession({ alleKort, onStart }) {
  const [pickerÅben, setPickerÅben] = useState(false)
  const [valgtTid, setValgtTid] = useState('10min')
  const [valgteEmner, setValgteEmner] = useState(() => new Set())
  const [kunKerne, setKunKerne] = useState(false)
  const [kunKritisk, setKunKritisk] = useState(false)

  const emneOptælling = useMemo(() => {
    const map = new Map()
    for (const k of alleKort) map.set(k.emne, (map.get(k.emne) || 0) + 1)
    return [...map.entries()]
      .map(([emne, antal]) => ({ emne, antal }))
      .sort((a, b) => a.emne.localeCompare(b.emne, 'da'))
  }, [alleKort])

  // Det aktuelle udvalg ud fra picker-valgene (bruges til både estimat og start).
  const udvalg = useMemo(() => {
    let u = alleKort
    if (valgteEmner.size > 0) u = u.filter((k) => valgteEmner.has(k.emne))
    if (kunKerne) u = u.filter((k) => k.kerne_atom === true)
    if (kunKritisk) u = u.filter((k) => k.klinisk_sikkerhed_kritisk === true)
    return u
  }, [alleKort, valgteEmner, kunKerne, kunKritisk])

  const tid = TID_MULIGHEDER.find((t) => t.id === valgtTid)
  const estimat = Math.min(udvalg.length, tid?.antal ?? udvalg.length)

  function toggelEmne(emne) {
    setValgteEmner((prev) => {
      const ny = new Set(prev)
      if (ny.has(emne)) ny.delete(emne)
      else ny.add(emne)
      return ny
    })
  }

  function start() {
    const sorteret = sortérPædagogisk(udvalg)
    const begrænset = tid ? sorteret.slice(0, tid.antal) : sorteret
    onStart(begrænset.map((k) => k.id))
  }

  return (
    <div className={styles.kort}>
      <div className={styles.topRække}>
        <div className={styles.tekst}>
          <p className={styles.overskrift}>Start en kort runde</p>
          <p className={styles.beskrivelse}>Vælg længde og hvad du vil træne — vi vælger kortene.</p>
        </div>
        <button type="button" className={styles.toggleKnap} onClick={() => setPickerÅben((v) => !v)}>
          {pickerÅben ? 'Skjul' : 'Tilpas'}
        </button>
      </div>

      {pickerÅben && (
        <>
          <div className={styles.felt}>
            <span className={styles.label}>Tid</span>
            <div className={styles.chips}>
              {TID_MULIGHEDER.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className={`${styles.chip} ${valgtTid === t.id ? styles.chipAktiv : ''}`}
                  onClick={() => setValgtTid(t.id)}
                >
                  {t.label} · ~{t.antal} kort
                </button>
              ))}
            </div>
          </div>

          <div className={styles.felt}>
            <span className={styles.label}>
              Emner {valgteEmner.size > 0 ? `(${valgteEmner.size} valgt)` : '(alle)'}
            </span>
            <div className={styles.emneListe}>
              {emneOptælling.map(({ emne, antal }) => (
                <label key={emne} className={styles.emneRække}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={valgteEmner.has(emne)}
                    onChange={() => toggelEmne(emne)}
                  />
                  <span className={styles.emneNavn}>{emne}</span>
                  <span className={styles.tæller}>{antal}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.toggleListe}>
            <label className={styles.toggle}>
              <input type="checkbox" className={styles.checkbox} checked={kunKerne} onChange={(e) => setKunKerne(e.target.checked)} />
              Kun kerne-atomer
            </label>
            <label className={styles.toggle}>
              <input type="checkbox" className={styles.checkbox} checked={kunKritisk} onChange={(e) => setKunKritisk(e.target.checked)} />
              Kun klinisk-kritiske atomer
            </label>
          </div>
        </>
      )}

      <button type="button" className={styles.startKnap} onClick={start} disabled={estimat === 0}>
        Start session ({estimat} kort)
      </button>
    </div>
  )
}
