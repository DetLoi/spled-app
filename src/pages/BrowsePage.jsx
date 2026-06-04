// Forside (orkestrator). Bevidst TYND: henter kort, udleder navigerbare
// strukturer via browseData, og komponerer fem børne-komponenter.
//
//   AL data-logik bor i  src/lib/browseData.js
//   AL visning bor i     src/components/browse/*
//
// Så når noget er galt: forkerte tal/grupperinger → browseData; forkert udseende
// → den enkelte komponent; forkert navigation → startSession-helperne herunder.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hentAlleKort } from '../lib/kortData.js'
import { useFilter } from '../context/FilterContext.jsx'
import {
  byggFagTræ, byggTemaer, tælLinser, søg, sortérPædagogisk,
} from '../lib/browseData.js'
import SearchBar from '../components/browse/SearchBar/SearchBar.jsx'
import SearchResults from '../components/browse/SearchResults/SearchResults.jsx'
import HurtigSession from '../components/browse/HurtigSession/HurtigSession.jsx'
import TemaLinser from '../components/browse/TemaLinser/TemaLinser.jsx'
import FagTrae from '../components/browse/FagTrae/FagTrae.jsx'
import styles from './BrowsePage.module.css'

// Synligt build-/versionsnummer (bump ved hver ny deploy, så man kan se på
// telefonen at den opdaterede version faktisk er landet — slår PWA-cache-tvivl).
const APP_VERSION = 'v0.1.1'

export default function BrowsePage() {
  const navigate = useNavigate()
  const { setUdvalgteIds } = useFilter()
  const alleKort = useMemo(() => hentAlleKort(), [])
  const [søgeord, setSøgeord] = useState('')

  // Ryd evt. tidligere session-udvalg når man lander på (eller vender tilbage
  // til) forsiden, så næste klik starter en frisk session.
  useEffect(() => {
    setUdvalgteIds(null)
  }, [setUdvalgteIds])

  // Afledte strukturer — rene og memoiserede. alleKort er konstant (statisk
  // import), så disse beregnes reelt kun én gang.
  const fagTræ = useMemo(() => byggFagTræ(alleKort), [alleKort])
  const temaer = useMemo(() => byggTemaer(alleKort), [alleKort])
  const linser = useMemo(() => tælLinser(alleKort), [alleKort])
  const søgeresultater = useMemo(() => søg(alleKort, søgeord), [alleKort, søgeord])

  const søger = søgeord.trim().length >= 2

  // Eneste navigations-helper: sæt id-udvalget i FilterContext og gå til feedet.
  function startSession(ids) {
    if (!ids || ids.length === 0) return
    setUdvalgteIds(ids)
    navigate('/session')
  }

  // Indgange — hver bygger sit udvalg og delegerer til startSession.
  const startKort = (kort) => startSession([kort.id])
  const startEmne = (emne) =>
    startSession(sortérPædagogisk(alleKort.filter((k) => k.emne === emne)).map((k) => k.id))
  const startKapitel = (kapitelRå) =>
    startSession(sortérPædagogisk(alleKort.filter((k) => k.kapitel === kapitelRå)).map((k) => k.id))
  // "Udforsk på tværs": tema/linse går til en OVERSIGT først (SamlingPage),
  // ikke direkte i gennemgangen — så man ser hvad samlingen indeholder.
  const startTema = (tema) => navigate(`/samling/tema/${encodeURIComponent(tema)}`)
  const startLinse = (id) => navigate(`/samling/linse/${encodeURIComponent(id)}`)

  return (
    <div className={styles.side}>
      <div className={styles.indhold}>
        <header className={styles.appHoved}>
          <h1 className={styles.appTitel}>SplEd</h1>
          <span className={styles.appUndertitel}>{APP_VERSION} · {alleKort.length} kort</span>
        </header>

        <SearchBar værdi={søgeord} onÆndring={setSøgeord} onRyd={() => setSøgeord('')} />

        {søger ? (
          <SearchResults resultater={søgeresultater} onVælg={startKort} />
        ) : (
          <>
            <section className={styles.sektion}>
              <h2 className={styles.sektionTitel}>Hurtig session</h2>
              <HurtigSession alleKort={alleKort} onStart={startSession} />
            </section>

            <section className={styles.sektion}>
              <h2 className={styles.sektionTitel}>Udforsk på tværs</h2>
              <TemaLinser
                linser={linser}
                temaer={temaer}
                onVælgLinse={startLinse}
                onVælgTema={startTema}
              />
            </section>

            <section className={styles.sektion}>
              <h2 className={styles.sektionTitel}>Fag · kapitel · emne</h2>
              <FagTrae fagTræ={fagTræ} onVælgEmne={startEmne} onVælgKapitel={startKapitel} />
            </section>
          </>
        )}
      </div>
    </div>
  )
}
