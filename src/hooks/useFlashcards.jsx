// Al filter-logik samlet ét sted — ingen filterlogik i komponenter
import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import database from '../data/database.json'

// Mapper et atom fra spled-data til den komponent-kontrakt FeedPage/Flashcard
// allerede forventer. Resultatet ligner det gamle flashcards.json-format,
// men beriget med felter til niveau-knapper, forbindelser og pakke-filtre.
function mapAtomTilKort(atom) {
  // fag i nye atomer er et array (fx ["Anatomi og fysiologi"]).
  // Flashcard.FAG_KLASSER kender ikke "Anatomi og fysiologi", så vi sender
  // strengen videre uændret — komponenten falder så tilbage til hvid baggrund.
  const fagStreng = Array.isArray(atom.fag)
    ? atom.fag[0] || 'ukendt'
    : atom.fag || 'ukendt'

  // Byg en kilde-streng KildePanel kan vise (kilde.tekst).
  const k0 = Array.isArray(atom.kilder) ? atom.kilder[0] : null
  const kildeTekst = k0
    ? [k0.reference, k0.kapitel, k0.sidetal ? `s. ${k0.sidetal}` : null]
        .filter(Boolean)
        .join(' · ')
    : 'Kilde ikke angivet'

  // Kapitel-streng fra kilden, fx "Kapitel 2: Kredsløbet". Bruges af BrowsePage
  // til fag→kapitel→emne-drilldown. Falder tilbage hvis kilden mangler kapitel.
  const kapitelStreng = k0?.kapitel || 'Uden kapitel'

  return {
    id: atom.id,
    // Forside vises på kortet. FeedPage.kortForNiveau bruger
    // kort.spørgsmål || kort.forside, så vi sætter begge for sikkerheds skyld.
    spørgsmål: atom.spørgsmål,
    forside: atom.spørgsmål,
    // Bagside er default-svar; FeedPage skifter mellem niveauerne nedenfor.
    bagside: atom.svar_faglig,
    svar_faglig: atom.svar_faglig,
    svar_almindelig: atom.svar_almindelig,
    svar_hulemand: atom.svar_hulemand,
    fag: fagStreng,
    semester: atom.semester || 'ikke angivet',
    begreb: atom.begreb,
    emne: atom.emne,
    underkategori: atom.kategori,
    videnstype: atom.videnstype,
    kilde: {
      type: k0?.type || 'ukendt',
      tekst: kildeTekst,
      reference: k0?.reference,
      kapitel: k0?.kapitel,
      sidetal: k0?.sidetal,
    },
    // Felter brugt af opgave 3 (forbindelser) og opgave 4 (pakker, sortering).
    forudsætninger: atom.forudsætninger || [],
    relationer: atom.relationer || [],
    kerne_atom: atom.kerne_atom === true,
    klinisk_sikkerhed_kritisk: atom.klinisk_sikkerhed_kritisk === true,
    pædagogisk_orden_i_emne:
      typeof atom.pædagogisk_orden_i_emne === 'number'
        ? atom.pædagogisk_orden_i_emne
        : 9999,
    // --- Berigede dimensioner (#1) — bevares fra atomet så BrowsePage kan
    //     navigere/filtrere på dem. Tidligere blev disse droppet på kortet.
    kapitel: kapitelStreng,
    sværhedsgrad: typeof atom.sværhedsgrad === 'number' ? atom.sværhedsgrad : null,
    tværgående_tema: Array.isArray(atom.tværgående_tema) ? atom.tværgående_tema : [],
    visuel_anbefalet: atom?.visuel?.anbefalet === true,
    nøgleord: atom.nøgleord || [],
    dummy: false,
  }
}

// Bygges én gang ved modul-indlæsning — database.json er statisk import.
const ALLE_KORT = (database.vidensenheder || []).map(mapAtomTilKort)

// Eksporteres så andre dele (BrowsePage, ForbindelserPanel) kan slå op
// direkte uden at gå igennem filter-konteksten.
export function hentAlleKort() {
  return ALLE_KORT
}

export function hentKortById(id) {
  return ALLE_KORT.find((k) => k.id === id) || null
}

const FilterContext = createContext(null)

export function FilterProvider({ children }) {
  const [semester, setSemester] = useState(3)
  const [soegning, setSoegning] = useState('')
  const [fravalgte, setFravalgte] = useState(() => new Set())
  // Session-udvalg fra BrowsePage. null = ingen aktiv session, vis alle kort.
  // Set af atom-IDer = kun disse atomer indgår i feedet.
  const [udvalgteIds, setUdvalgteIdsRaw] = useState(null)

  const toggelEmne = useCallback((emne) => {
    setFravalgte((prev) => {
      const ny = new Set(prev)
      if (ny.has(emne)) ny.delete(emne)
      else ny.add(emne)
      return ny
    })
  }, [])

  const toggelFag = useCallback((_fag, alleEmnerIFag) => {
    setFravalgte((prev) => {
      const ny = new Set(prev)
      const alleFravalgt = alleEmnerIFag.every((e) => ny.has(e))
      if (alleFravalgt) {
        alleEmnerIFag.forEach((e) => ny.delete(e))
      } else {
        alleEmnerIFag.forEach((e) => ny.add(e))
      }
      return ny
    })
  }, [])

  const nulstil = useCallback(() => {
    setSemester(3)
    setSoegning('')
    setFravalgte(new Set())
  }, [])

  // Wrapper så BrowsePage kan kalde med array eller Set (eller null for at rydde).
  const setUdvalgteIds = useCallback((ids) => {
    if (ids === null || ids === undefined) {
      setUdvalgteIdsRaw(null)
      return
    }
    setUdvalgteIdsRaw(ids instanceof Set ? ids : new Set(ids))
  }, [])

  const filterSleutel = useMemo(
    () =>
      `${semester}|${soegning}|${[...fravalgte].sort().join(',')}|${udvalgteIds ? udvalgteIds.size : 'alle'}`,
    [semester, soegning, fravalgte, udvalgteIds],
  )

  const value = useMemo(
    () => ({
      semester,
      setSemester,
      soegning,
      setSoegning,
      fravalgte,
      toggelEmne,
      toggelFag,
      nulstil,
      filterSleutel,
      udvalgteIds,
      setUdvalgteIds,
    }),
    [
      semester,
      soegning,
      fravalgte,
      toggelEmne,
      toggelFag,
      nulstil,
      filterSleutel,
      udvalgteIds,
      setUdvalgteIds,
    ],
  )

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  )
}

export function useFilter() {
  return useContext(FilterContext)
}

// Atomer uden registreret semester (fx alle anatomi-atomer) lader vi passere
// uanset semester-filter, så indholdet ikke pludselig forsvinder.
function passerSemester(kort, semester) {
  if (semester === 'alle') return true
  if (kort.semester === 'ikke angivet') return true
  return kort.semester === semester
}

function useFiltreredeKort() {
  const { semester, soegning, fravalgte, udvalgteIds } = useFilter()

  return useMemo(() => {
    // Session-udvalg respekterer rækkefølgen fra BrowsePage (fx hurtig session
    // med kun N kort). Når intet er valgt, falder vi tilbage til hele basen
    // i original rækkefølge.
    const grundlag = udvalgteIds
      ? ALLE_KORT.filter((k) => udvalgteIds.has(k.id))
      : ALLE_KORT

    return grundlag.filter((kort) => {
      if (!passerSemester(kort, semester)) return false
      if (soegning.trim() !== '') {
        const s = soegning.toLowerCase()
        return (
          (kort.forside || '').toLowerCase().includes(s) ||
          (kort.bagside || '').toLowerCase().includes(s) ||
          (kort.emne || '').toLowerCase().includes(s)
        )
      }
      return !fravalgte.has(kort.emne)
    })
  }, [semester, soegning, fravalgte, udvalgteIds])
}

export function useFlashcards() {
  return useFiltreredeKort()
}

export function useFlashcardsByEmne() {
  const filtrerede = useFiltreredeKort()

  return useMemo(() => {
    const gruppeListe = []
    const emneindeks = new Map()

    for (const kort of filtrerede) {
      let ix = emneindeks.get(kort.emne)
      if (ix === undefined) {
        ix = gruppeListe.length
        emneindeks.set(kort.emne, ix)
        gruppeListe.push({ emne: kort.emne, kort: [kort] })
      } else {
        gruppeListe[ix].kort.push(kort)
      }
    }

    // Sortér kort inden i hvert emne efter pædagogisk_orden_i_emne.
    for (const gruppe of gruppeListe) {
      gruppe.kort.sort(
        (a, b) => a.pædagogisk_orden_i_emne - b.pædagogisk_orden_i_emne,
      )
    }

    return gruppeListe
  }, [filtrerede])
}

export function useAlleEmnerPerFag() {
  const { semester } = useFilter()

  return useMemo(() => {
    const kortISemester = ALLE_KORT.filter((k) => passerSemester(k, semester))
    const map = {}
    for (const k of kortISemester) {
      if (!map[k.fag]) map[k.fag] = new Set()
      map[k.fag].add(k.emne)
    }
    return Object.entries(map)
      .map(([fag, emnerSet]) => ({
        fag,
        emner: [...emnerSet].sort(),
      }))
      .sort((a, b) => a.fag.localeCompare(b.fag, 'da'))
  }, [semester])
}
