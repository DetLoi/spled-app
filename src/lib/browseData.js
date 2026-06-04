// browseData — REN data-logik til forsiden (BrowsePage).
// =========================================================================
//  INGEN React, INGEN JSX. Kun funktioner der tager kort-arrayet (fra
//  hentAlleKort()) og udleder de strukturer forsiden navigerer i.
//
//  Hvorfor samlet her: når noget ser forkert ud på forsiden (forkert antal,
//  manglende kapitel, et emne under det forkerte fag …) er fejlen næsten altid
//  i én af funktionerne herunder — ikke i en komponent. Så er det ét sted at
//  kigge. Hver funktion er ren (samme input → samme output) og kan testes
//  isoleret i node.
//
//  Kort-kontrakten der bruges (sat i useFlashcards.mapAtomTilKort):
//    id, begreb, spørgsmål, emne, fag (streng), kapitel (streng),
//    nøgleord[], kerne_atom, klinisk_sikkerhed_kritisk, visuel_anbefalet,
//    sværhedsgrad (1–4|null), tværgående_tema[], pædagogisk_orden_i_emne
// =========================================================================

// Fag der altid skal stå øverst (kerne-faget). Resten sorteres alfabetisk.
const FAG_VÆGT = { 'Anatomi og fysiologi': 0 }

// --- Kapitel-streng → struktureret info -------------------------------------
// Eksempler i basen: "Kapitel 2: Kredsløbet", "Kapitel 2 — Kostråd".
// Returnerer { nr, titel, rå }. Uden match: nr=999 (sorteres sidst), titel=rå.
export function kapitelInfo(streng) {
  const rå = streng || 'Uden kapitel'
  const m = rå.match(/Kapitel\s+(\d+)\s*[:—–-]\s*(.+)/i)
  if (m) return { nr: Number(m[1]), titel: m[2].trim(), rå }
  return { nr: 999, titel: rå, rå }
}

// --- Vis-navne for kapitler (KUN app-lag) -----------------------------------
// Bogens kapitler vises under neutrale, almindelige fagudtryk i stedet for
// bogens egne (til dels distinktive) titler. Det DÆMPER signalet om at menuen
// er en 1:1-kopi af bogens indholdsfortegnelse. NB: dette rører IKKE spled-data
// — kildehenvisningen (kilder[].kapitel) er stadig den korrekte, præcise titel,
// så admin/QA og citater er uændrede. Nøglen er den rå kapitel-streng.
export const KAPITEL_LABELS = {
  // Anatomi og fysiologi
  'Kapitel 1: Celler og væv': 'Celler og væv',
  'Kapitel 2: Kredsløbet': 'Hjerte og kredsløb',
  'Kapitel 3: Respirationssystemet': 'Luftveje og respiration',
  'Kapitel 4: Immunforsvaret': 'Immunforsvar',
  'Kapitel 5: Fordøjelsessystemet': 'Fordøjelse',
  'Kapitel 6: Stofskiftet': 'Stofskifte og energi',
  'Kapitel 7: Nyrer og urinveje': 'Nyrer og urinveje',
  'Kapitel 8: Hud og slimhinder': 'Hud og slimhinder',
  'Kapitel 9: Øjet': 'Synet og øjet',
  'Kapitel 10: Øret': 'Hørelse og øret',
  'Kapitel 11: Nervesystemet': 'Nervesystemet',
  'Kapitel 12: Hormonsystemet': 'Hormoner og endokrint system',
  'Kapitel 13: Bevægeapparatet': 'Knogler, led og muskler',
  'Kapitel 14: Kønsorganer og forplantning': 'Kønsorganer og forplantning',
  'Kapitel 15: Det aktive menneske': 'Fysisk aktivitet og bevægelse',
  'Kapitel 16: Normal aldring': 'Aldring og kroppen',
  // Ernæring
  'Kapitel 1 — Ernæring i sygeplejen': 'Ernæring i sygeplejen',
  'Kapitel 2 — Kostråd': 'Kostråd og anbefalinger',
  // Farmakologi
  'Kapitel 1 — Introduktion til farmakologi': 'Introduktion til farmakologi',
  'Kapitel 2 — Farmakokinetik': 'Farmakokinetik',
  // Mikrobiologi
  'Kapitel 1 — Mikrobiologi og sygepleje': 'Mikrobiologi og sygepleje',
  'Kapitel 2 — Mikroorganismer': 'Mikroorganismer',
  // Sygdomslære
  'Kapitel 1 — Basal sygdomslære': 'Basal sygdomslære',
  'Kapitel 1 — Basal sygdomslære (KLINIK-boks)': 'Basal sygdomslære – klinik',
  'Kapitel 2 — Immunforsvaret': 'Immunforsvar (sygdomslære)',
}

// Vis-navn for en kapitel-streng: brug override hvis den findes, ellers den
// parsede titel uden "Kapitel N:".
export function kapitelLabel(rå, fallbackTitel) {
  return KAPITEL_LABELS[rå] || fallbackTitel || kapitelInfo(rå).titel
}

function fagAf(kort) {
  return kort.fag || 'ukendt'
}

// --- Fag → kapitel → emne (med antal på hvert niveau) -----------------------
// Returnerer:
//   [{ fag, antal, kapitler: [{ rå, nr, titel, antal,
//                               emner: [{ emne, antal }] }] }]
export function byggFagTræ(kort) {
  const fagMap = new Map()

  for (const k of kort) {
    const fag = fagAf(k)
    if (!fagMap.has(fag)) fagMap.set(fag, { fag, antal: 0, kapitler: new Map() })
    const fagPost = fagMap.get(fag)
    fagPost.antal++

    const info = kapitelInfo(k.kapitel)
    if (!fagPost.kapitler.has(info.rå)) {
      fagPost.kapitler.set(info.rå, { ...info, antal: 0, emner: new Map() })
    }
    const kapPost = fagPost.kapitler.get(info.rå)
    kapPost.antal++

    const emne = k.emne || 'Uden emne'
    if (!kapPost.emner.has(emne)) kapPost.emner.set(emne, { emne, antal: 0, _orden: k.pædagogisk_orden_i_emne ?? 9999 })
    const emnePost = kapPost.emner.get(emne)
    emnePost.antal++
    // Behold mindste pædagogiske orden som emnets placering i kapitlet.
    if ((k.pædagogisk_orden_i_emne ?? 9999) < emnePost._orden) emnePost._orden = k.pædagogisk_orden_i_emne ?? 9999
  }

  // Map → sorterede arrays.
  const fagListe = [...fagMap.values()].map((f) => ({
    fag: f.fag,
    antal: f.antal,
    kapitler: [...f.kapitler.values()]
      .map((kap) => ({
        rå: kap.rå,
        nr: kap.nr,
        titel: kapitelLabel(kap.rå, kap.titel),
        antal: kap.antal,
        emner: [...kap.emner.values()]
          .sort((a, b) => a._orden - b._orden || a.emne.localeCompare(b.emne, 'da'))
          .map(({ emne, antal }) => ({ emne, antal })),
      }))
      .sort((a, b) => a.nr - b.nr || a.titel.localeCompare(b.titel, 'da')),
  }))

  fagListe.sort((a, b) => {
    const va = FAG_VÆGT[a.fag] ?? 1
    const vb = FAG_VÆGT[b.fag] ?? 1
    if (va !== vb) return va - vb
    return a.fag.localeCompare(b.fag, 'da')
  })
  return fagListe
}

// --- Tværgående temaer → antal (faldende) -----------------------------------
export function byggTemaer(kort) {
  const map = new Map()
  for (const k of kort) {
    for (const t of k.tværgående_tema || []) {
      if (!t) continue
      map.set(t, (map.get(t) || 0) + 1)
    }
  }
  return [...map.entries()]
    .map(([tema, antal]) => ({ tema, antal }))
    .sort((a, b) => b.antal - a.antal || a.tema.localeCompare(b.tema, 'da'))
}

// --- Linser (faste tværgående filtre) ---------------------------------------
// Predikaterne er ENESTE sandhedskilde: samme funktion bruges til både at TÆLLE
// og at FILTRERE, så et chip-tal aldrig kan komme i utakt med sessionens indhold.
export const LINSER = [
  { id: 'kerne', label: 'Kerne', tegn: '★', predikat: (k) => k.kerne_atom === true },
  { id: 'kritisk', label: 'Klinisk-kritiske', tegn: '⚠', predikat: (k) => k.klinisk_sikkerhed_kritisk === true },
  { id: 'visuelle', label: 'Visuelle', tegn: '▦', predikat: (k) => k.visuel_anbefalet === true },
  { id: 'svaer', label: 'Svære (grad 3–4)', tegn: '▲', predikat: (k) => (k.sværhedsgrad ?? 0) >= 3 },
  { id: 'let', label: 'Lette (grad 1)', tegn: '○', predikat: (k) => k.sværhedsgrad === 1 },
]

export function tælLinser(kort) {
  return LINSER.map((l) => ({ id: l.id, label: l.label, tegn: l.tegn, antal: kort.filter(l.predikat).length }))
}

export function linsePredikat(id) {
  return (LINSER.find((l) => l.id === id) || {}).predikat || (() => false)
}

// --- Fri-tekst søgning ------------------------------------------------------
// Matcher mod begreb, spørgsmål, emne og nøgleord. Returnerer ALLE match
// (komponenten begrænser visningen). Tomt/kort query → tomt resultat.
export function søg(kort, query) {
  const q = (query || '').trim().toLowerCase()
  if (q.length < 2) return []
  return kort.filter((k) => {
    if ((k.begreb || '').toLowerCase().includes(q)) return true
    if ((k.spørgsmål || '').toLowerCase().includes(q)) return true
    if ((k.emne || '').toLowerCase().includes(q)) return true
    return (k.nøgleord || []).some((n) => String(n).toLowerCase().includes(q))
  })
}

// --- Pædagogisk sortering (default-rækkefølge i sessioner) -------------------
// Først efter emnets første optræden i basen, derefter pædagogisk_orden_i_emne.
export function sortérPædagogisk(kort) {
  const emneRækkefølge = new Map()
  let n = 0
  for (const k of kort) {
    if (!emneRækkefølge.has(k.emne)) emneRækkefølge.set(k.emne, n++)
  }
  return [...kort].sort((a, b) => {
    const ea = emneRækkefølge.get(a.emne)
    const eb = emneRækkefølge.get(b.emne)
    if (ea !== eb) return ea - eb
    return (a.pædagogisk_orden_i_emne ?? 9999) - (b.pædagogisk_orden_i_emne ?? 9999)
  })
}
