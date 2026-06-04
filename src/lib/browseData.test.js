// Enheds-tests for den rene data-logik (browseData). Kører i node (vitest run).
// Beskytter "data-hjertet" mod regressioner — kør med: npm test
import { describe, it, expect } from 'vitest'
import {
  kapitelInfo,
  kapitelLabel,
  byggFagTræ,
  byggTemaer,
  tælLinser,
  linseLabel,
  søg,
  gruppérEfterEmne,
} from './browseData.js'

// Lille fixture-helper der ligner et "Kort".
const k = (o) => ({
  id: o.id,
  begreb: o.begreb || o.id,
  spørgsmål: o.spørgsmål || '',
  emne: o.emne,
  fag: o.fag,
  kapitel: o.kapitel,
  nøgleord: o.nøgleord || [],
  kerne_atom: !!o.kerne,
  klinisk_sikkerhed_kritisk: !!o.kritisk,
  visuel_anbefalet: !!o.visuel,
  sværhedsgrad: o.sv ?? 2,
  tværgående_tema: o.tema || [],
  pædagogisk_orden_i_emne: o.orden ?? 1,
})

const KORT = [
  k({ id: 'a1', begreb: 'Cellen', emne: 'Cellen', fag: 'Anatomi og fysiologi', kapitel: 'Kapitel 1: Celler og væv', kerne: true, tema: ['Homøostase'], orden: 1, nøgleord: ['membran'] }),
  k({ id: 'a2', begreb: 'Mitokondrie', emne: 'Cellen', fag: 'Anatomi og fysiologi', kapitel: 'Kapitel 1: Celler og væv', orden: 2 }),
  k({ id: 'a3', begreb: 'Hjertet', emne: 'Hjertet', fag: 'Anatomi og fysiologi', kapitel: 'Kapitel 2: Kredsløbet', kritisk: true, tema: ['Kredsløb og blod', 'Homøostase'], orden: 1 }),
  k({ id: 'f1', begreb: 'Farmakokinetik', emne: 'ADME', fag: 'Farmakologi', kapitel: 'Kapitel 2 — Farmakokinetik', visuel: true, tema: ['Kredsløb og blod'], orden: 1 }),
]

describe('kapitelInfo', () => {
  it('parser nummer + titel (kolon)', () => {
    expect(kapitelInfo('Kapitel 11: Nervesystemet')).toEqual({ nr: 11, titel: 'Nervesystemet', rå: 'Kapitel 11: Nervesystemet' })
  })
  it('parser tankestreg-variant', () => {
    expect(kapitelInfo('Kapitel 2 — Kostråd').nr).toBe(2)
  })
  it('uden match → nr 999', () => {
    expect(kapitelInfo('Noget andet').nr).toBe(999)
  })
})

describe('kapitelLabel', () => {
  it('bruger override-navn', () => {
    expect(kapitelLabel('Kapitel 2: Kredsløbet')).toBe('Hjerte og kredsløb')
  })
})

describe('byggFagTræ', () => {
  const træ = byggFagTræ(KORT)
  it('Anatomi står først', () => {
    expect(træ[0].fag).toBe('Anatomi og fysiologi')
  })
  it('sum-integritet: Σ kapitel = fag, Σ emne = kapitel', () => {
    for (const f of træ) {
      expect(f.kapitler.reduce((n, kap) => n + kap.antal, 0)).toBe(f.antal)
      for (const kap of f.kapitler) {
        expect(kap.emner.reduce((n, e) => n + e.antal, 0)).toBe(kap.antal)
      }
    }
  })
})

describe('byggTemaer', () => {
  it('tæller forekomster og sorterer faldende', () => {
    const t = byggTemaer(KORT)
    expect(t.find((x) => x.tema === 'Homøostase').antal).toBe(2)
    expect(t[0].antal).toBeGreaterThanOrEqual(t[t.length - 1].antal)
  })
})

describe('tælLinser', () => {
  it('kerne + klinisk-kritiske tælles', () => {
    const m = Object.fromEntries(tælLinser(KORT).map((l) => [l.id, l.antal]))
    expect(m.kerne).toBe(1)
    expect(m.kritisk).toBe(1)
  })
})

describe('søg', () => {
  it('matcher begreb og nøgleord', () => {
    expect(søg(KORT, 'hjert').map((x) => x.id)).toContain('a3')
    expect(søg(KORT, 'membran').map((x) => x.id)).toContain('a1')
  })
  it('< 2 tegn → tomt', () => {
    expect(søg(KORT, 'a')).toEqual([])
  })
})

describe('gruppérEfterEmne', () => {
  it('grupperer og sorterer kort efter pædagogisk orden', () => {
    const g = gruppérEfterEmne(KORT)
    const cellen = g.find((x) => x.emne === 'Cellen')
    expect(cellen.kort.map((x) => x.id)).toEqual(['a1', 'a2'])
  })
})

describe('linseLabel', () => {
  it('giver label for id', () => {
    expect(linseLabel('kerne')).toBe('Kerne')
  })
})
