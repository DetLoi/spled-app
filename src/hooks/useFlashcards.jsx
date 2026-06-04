// Filter-hooks: tager filter-tilstanden (FilterContext) og kort-dataen (kortData)
// og giver komponenterne det filtrerede/grupperede udvalg. Ingen rå datalogik her.
import { useMemo } from 'react'
import { ALLE_KORT } from '../lib/kortData.js'
import { useFilter } from '../context/FilterContext.jsx'

// Semesterfilter: "Alle" viser alt, ellers EKSAKT match. Da intet atom endnu har
// fået et semester ('ikke angivet'), vil et bestemt semester give 0 kort — det er
// meningen. Filteret virker i samme øjeblik atomer tildeles et semester.
function passerSemester(kort, semester) {
  if (semester === 'alle') return true
  return kort.semester === semester
}

function useFiltreredeKort() {
  const { semester, udvalgteIds } = useFilter()
  return useMemo(() => {
    const grundlag = udvalgteIds
      ? ALLE_KORT.filter((k) => udvalgteIds.has(k.id))
      : ALLE_KORT
    return grundlag.filter((kort) => passerSemester(kort, semester))
  }, [semester, udvalgteIds])
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
    for (const gruppe of gruppeListe) {
      gruppe.kort.sort((a, b) => a.pædagogisk_orden_i_emne - b.pædagogisk_orden_i_emne)
    }
    return gruppeListe
  }, [filtrerede])
}
