// Forside i appen: vælg hvor du vil starte. Tre sektioner — hurtig session,
// foreslåede pakker, bladr emne. Alle veje ender i navigate('/session') med
// et udvalg af atom-IDer sat i FilterContext.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hentAlleKort, useFilter } from '../hooks/useFlashcards.jsx'
import styles from './BrowsePage.module.css'

const TID_MULIGHEDER = [
  { id: '5min', label: '5 min', antal: 8 },
  { id: '10min', label: '10 min', antal: 15 },
  { id: '15min', label: '15 min', antal: 25 },
]

const PAKKER = [
  {
    id: 'hjerte',
    navn: 'Hjerte-pakken',
    beskrivelse: 'Hjertet, kredsløbet og blodets transport',
    filter: (k) =>
      ['Hjertet', 'Kredsløbet', 'Karsystemet', 'Plasma', 'Blod', 'Lymfesystemet'].includes(
        k.emne,
      ),
  },
  {
    id: 'blod',
    navn: 'Blod-pakken',
    beskrivelse: 'Plasma og blodets bestanddele',
    filter: (k) => ['Blod', 'Plasma'].includes(k.emne),
  },
  {
    id: 'akut',
    navn: 'Akut-pakken',
    beskrivelse: 'Klinisk-kritiske atomer',
    filter: (k) => k.klinisk_sikkerhed_kritisk === true,
  },
  {
    id: 'celler-vaev',
    navn: 'Celler & væv',
    beskrivelse: 'Cellebiologi og vævstyper',
    filter: (k) =>
      [
        'Cellen og dens væsker',
        'Cellemembranen',
        'Transport gennem cellemembranen',
        'Organeller',
        'Cellekernen og arvematerialet',
        'Celledeling',
        'Væv',
        'Signalering',
        'Homøostase',
        'Proteinsyntese',
      ].includes(k.emne),
  },
]

// Sortér efter emne-rækkefølge i basen, og inden i hvert emne efter
// pædagogisk_orden_i_emne. Bruges som default-rækkefølge i alle sessioner.
function sortérPædagogisk(kort) {
  const emneRækkefølge = new Map()
  let n = 0
  for (const k of kort) {
    if (!emneRækkefølge.has(k.emne)) emneRækkefølge.set(k.emne, n++)
  }
  return [...kort].sort((a, b) => {
    const ea = emneRækkefølge.get(a.emne)
    const eb = emneRækkefølge.get(b.emne)
    if (ea !== eb) return ea - eb
    return a.pædagogisk_orden_i_emne - b.pædagogisk_orden_i_emne
  })
}

export default function BrowsePage() {
  const navigate = useNavigate()
  const { setUdvalgteIds } = useFilter()
  const alleKort = useMemo(() => hentAlleKort(), [])

  // Når brugeren lander på (eller vender tilbage til) forsiden ryddes session-
  // udvalget, så næste klik på en pakke/emne starter en frisk session.
  useEffect(() => {
    setUdvalgteIds(null)
  }, [setUdvalgteIds])

  // Hurtig session-state — picker er foldet ud når brugeren har klikket
  // på det øverste kort.
  const [pickerAaben, setPickerAaben] = useState(false)
  const [valgtTid, setValgtTid] = useState('10min')
  const [valgteEmner, setValgteEmner] = useState(() => new Set())
  const [kunKerne, setKunKerne] = useState(false)
  const [kunKritisk, setKunKritisk] = useState(false)

  // Optælling pr. emne — bruges både i picker-listen og i "Bladr emne".
  const emneOptælling = useMemo(() => {
    const map = new Map()
    for (const k of alleKort) {
      map.set(k.emne, (map.get(k.emne) || 0) + 1)
    }
    return [...map.entries()]
      .map(([emne, antal]) => ({ emne, antal }))
      .sort((a, b) => a.emne.localeCompare(b.emne, 'da'))
  }, [alleKort])

  // Antal kort pr. pakke — vises på pakke-kortet og bruges til at disable
  // tomme pakker.
  const pakkeAntal = useMemo(() => {
    const ud = {}
    for (const p of PAKKER) {
      ud[p.id] = alleKort.filter(p.filter).length
    }
    return ud
  }, [alleKort])

  function toggelEmne(emne) {
    setValgteEmner((prev) => {
      const ny = new Set(prev)
      if (ny.has(emne)) ny.delete(emne)
      else ny.add(emne)
      return ny
    })
  }

  function startSession(ids) {
    if (ids.length === 0) return
    setUdvalgteIds(ids)
    navigate('/session')
  }

  function startHurtigSession() {
    let udvalg = alleKort
    if (valgteEmner.size > 0) {
      udvalg = udvalg.filter((k) => valgteEmner.has(k.emne))
    }
    if (kunKerne) udvalg = udvalg.filter((k) => k.kerne_atom === true)
    if (kunKritisk) udvalg = udvalg.filter((k) => k.klinisk_sikkerhed_kritisk === true)

    const sorteret = sortérPædagogisk(udvalg)
    const tid = TID_MULIGHEDER.find((t) => t.id === valgtTid)
    const begrænset = tid ? sorteret.slice(0, tid.antal) : sorteret
    startSession(begrænset.map((k) => k.id))
  }

  function startPakke(pakke) {
    const udvalg = sortérPædagogisk(alleKort.filter(pakke.filter))
    startSession(udvalg.map((k) => k.id))
  }

  function startEmne(emneNavn) {
    const udvalg = sortérPædagogisk(alleKort.filter((k) => k.emne === emneNavn))
    startSession(udvalg.map((k) => k.id))
  }

  const hurtigAntalEstimeret = (() => {
    let udvalg = alleKort
    if (valgteEmner.size > 0) udvalg = udvalg.filter((k) => valgteEmner.has(k.emne))
    if (kunKerne) udvalg = udvalg.filter((k) => k.kerne_atom === true)
    if (kunKritisk) udvalg = udvalg.filter((k) => k.klinisk_sikkerhed_kritisk === true)
    const tid = TID_MULIGHEDER.find((t) => t.id === valgtTid)
    return Math.min(udvalg.length, tid?.antal ?? udvalg.length)
  })()

  return (
    <div className={styles.side}>
      <div className={styles.indhold}>
        <header className={styles.appHoved}>
          <h1 className={styles.appTitel}>SplEd</h1>
          <span className={styles.appUndertitel}>{alleKort.length} kort i basen</span>
        </header>

        {/* === Hurtig session === */}
        <section className={styles.sektion}>
          <h2 className={styles.sektionTitel}>Hurtig session</h2>
          <div className={styles.hurtigKort}>
            <div className={styles.hurtigTopRække}>
              <div className={styles.hurtigTekst}>
                <p className={styles.hurtigOverskrift}>Start en kort runde</p>
                <p className={styles.hurtigBeskrivelse}>
                  Vælg længde og hvad du vil træne — vi vælger kortene.
                </p>
              </div>
              <button
                type="button"
                className={styles.hurtigToggleKnap}
                onClick={() => setPickerAaben((v) => !v)}
              >
                {pickerAaben ? 'Skjul' : 'Tilpas'}
              </button>
            </div>

            {pickerAaben && (
              <>
                <div className={styles.pickerFelt}>
                  <span className={styles.pickerLabel}>Tid</span>
                  <div className={styles.chipsRække}>
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

                <div className={styles.pickerFelt}>
                  <span className={styles.pickerLabel}>
                    Emner {valgteEmner.size > 0 ? `(${valgteEmner.size} valgt)` : '(alle)'}
                  </span>
                  <div className={styles.emneListe}>
                    {emneOptælling.map(({ emne, antal }) => (
                      <label key={emne} className={styles.emneRække}>
                        <input
                          type="checkbox"
                          className={styles.emneCheckbox}
                          checked={valgteEmner.has(emne)}
                          onChange={() => toggelEmne(emne)}
                        />
                        <span className={styles.emneNavn}>{emne}</span>
                        <span className={styles.emneTæller}>{antal}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.toggleRække}>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      className={styles.emneCheckbox}
                      checked={kunKerne}
                      onChange={(e) => setKunKerne(e.target.checked)}
                    />
                    Kun kerne-atomer
                  </label>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      className={styles.emneCheckbox}
                      checked={kunKritisk}
                      onChange={(e) => setKunKritisk(e.target.checked)}
                    />
                    Kun klinisk-kritiske atomer
                  </label>
                </div>
              </>
            )}

            <button
              type="button"
              className={styles.startKnap}
              onClick={startHurtigSession}
              disabled={hurtigAntalEstimeret === 0}
            >
              Start session ({hurtigAntalEstimeret} kort)
            </button>
          </div>
        </section>

        {/* === Foreslåede pakker === */}
        <section className={styles.sektion}>
          <h2 className={styles.sektionTitel}>Foreslåede pakker</h2>
          <div className={styles.pakkerGrid}>
            {PAKKER.map((p) => {
              const antal = pakkeAntal[p.id]
              const tom = antal === 0
              return (
                <button
                  type="button"
                  key={p.id}
                  className={`${styles.pakkeKort} ${tom ? styles.pakkeKortInaktiv : ''}`}
                  onClick={() => !tom && startPakke(p)}
                  disabled={tom}
                >
                  <span className={styles.pakkeNavn}>{p.navn}</span>
                  <span className={styles.pakkeBeskrivelse}>{p.beskrivelse}</span>
                  <span className={styles.pakkeAntal}>{antal} kort</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* === Bladr emne === */}
        <section className={styles.sektion}>
          <h2 className={styles.sektionTitel}>Bladr emne</h2>
          <div className={styles.emneBladrListe}>
            {emneOptælling.map(({ emne, antal }) => (
              <button
                type="button"
                key={emne}
                className={styles.emneBladrRække}
                onClick={() => startEmne(emne)}
              >
                <span className={styles.emneBladrNavn}>{emne}</span>
                <span className={styles.emneBladrTæller}>{antal}</span>
                <span className={styles.emneBladrPil} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
