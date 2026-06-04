// FilterContext — app-bred filter-/sessions-tilstand. Holdt minimal:
//   semester     : 'alle' | et bestemt semester (eksakt match)
//   udvalgteIds  : null (alle kort) | Set af atom-IDer (en session fra BrowsePage)
// Søgning på forsiden har sin egen lokale state; in-session navigation re-bruger
// disse værdier. Ingen datalogik her — kun tilstand.
import { createContext, useContext, useState, useMemo, useCallback } from 'react'

const FilterContext = createContext(null)

export function FilterProvider({ children }) {
  const [semester, setSemester] = useState('alle')
  // null = ingen aktiv session (vis alle). Set af IDer = kun disse kort i feedet.
  const [udvalgteIds, setUdvalgteIdsRaw] = useState(null)

  const nulstil = useCallback(() => setSemester('alle'), [])

  // Wrapper så BrowsePage kan kalde med array, Set eller null (ryd).
  const setUdvalgteIds = useCallback((ids) => {
    if (ids === null || ids === undefined) {
      setUdvalgteIdsRaw(null)
      return
    }
    setUdvalgteIdsRaw(ids instanceof Set ? ids : new Set(ids))
  }, [])

  // Nøgle der ændrer sig når det aktive udvalg ændrer sig (FeedPage nulstiller på den).
  const filterSleutel = useMemo(
    () => `${semester}|${udvalgteIds ? udvalgteIds.size : 'alle'}`,
    [semester, udvalgteIds],
  )

  const value = useMemo(
    () => ({ semester, setSemester, nulstil, filterSleutel, udvalgteIds, setUdvalgteIds }),
    [semester, nulstil, filterSleutel, udvalgteIds, setUdvalgteIds],
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- context-hook hører naturligt sammen med dens provider
export function useFilter() {
  return useContext(FilterContext)
}
