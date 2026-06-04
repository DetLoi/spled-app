// Entry point — henter data FØR App mountes, så ALLE_KORT er fyldt med det samme.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'
import { indlæsKort } from './lib/kortData.js'

const root = createRoot(document.getElementById('root'))

function skaerm(tekst) {
  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#6B6B6B',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      {tekst}
    </div>
  )
}

root.render(skaerm('Indlæser…'))

indlæsKort()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch(() => {
    root.render(skaerm('Kunne ikke indlæse data. Tjek din forbindelse og prøv igen.'))
  })

// Registrér service worker (PWA / offline). Kun i produktion.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
