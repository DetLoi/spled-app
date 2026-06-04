// Router setup — kun routes og context-provider. Ingen anden logik.
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { FilterProvider } from './hooks/useFlashcards.jsx'
import FeedPage from './pages/FeedPage.jsx'
import BrowsePage from './pages/BrowsePage.jsx'
import TopBar from './components/TopBar/TopBar.jsx'

// Trukket ud i en indre komponent så vi kan kalde useLocation, der kræver
// at vi er inde i BrowserRouter.
function AppInner() {
  const location = useLocation()
  const [filterAaben, setFilterAaben] = useState(false)
  const [aktivtFag, setAktivtFag] = useState(null)

  // BrowsePage har sin egen header — TopBar viser sig kun under sessionen.
  const visTopBar = location.pathname === '/session'

  return (
    <>
      {visTopBar && (
        <TopBar onFilterClick={() => setFilterAaben(true)} aktivtFag={aktivtFag} />
      )}
      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route
          path="/session"
          element={
            <FeedPage
              filterAaben={filterAaben}
              setFilterAaben={setFilterAaben}
              setAktivtFag={setAktivtFag}
            />
          }
        />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <FilterProvider>
        <AppInner />
      </FilterProvider>
    </BrowserRouter>
  )
}

export default App
