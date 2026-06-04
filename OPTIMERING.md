# SplEd-app — code review & optimeringsplan

*Kontekst: React 19 + Vite (rolldown) + react-router 7, ren JavaScript/JSX, CSS Modules
oven på ét fælles token-sæt (`styles/variables.css`), PWA, data bagt ind som committet
`database.json`. Repo'et overdrages til en med-udvikler (storebror) + lukket 5-personers pilot.
Projekt-regler: kun eksisterende CSS-variabler, dansk navngivning, bevar funktionalitet,
bundtet skal være citatfrit.*

Her er mit review af den nuværende kodebase:

**1. Kodeorganisering & struktur**

Stærkt fundament: tydelig opdeling i `pages/`, `components/` (med `browse/`-undermappe til
forside-komponenterne), `hooks/`, `lib/` (ren logik: `browseData.js`, `feedback.js`) og
`styles/`. Hver komponent har egen mappe med `.jsx` + `.module.css`, og props er dokumenteret
i toppen. Al afledning er centraliseret i `browseData.js` — ét sted at fejlfinde.

Svagheder: `hooks/useFlashcards.jsx` er en "god-fil" der blander fire ansvar — data-mapping
(`mapAtomTilKort` + den globale `ALLE_KORT`), filter-konteksten (`FilterProvider`/`useFilter`),
selve filter-hooks (`useFlashcards`, `useFlashcardsByEmne`) og opslag (`hentAlleKort`,
`hentKortById`). At eksportere ikke-komponenter sammen med en provider udløser også
`react-refresh/only-export-components`-fejl i lint. `FeedPage.jsx` (~430 linjer) blander
swipe-gestus-motoren med selve siden; gestus-effekterne står for de fleste
`react-hooks/set-state-in-effect`-fejl. Efter de seneste ændringer er der desuden vestigial
filter-state (`soegning`/`fravalgte`/`toggelEmne`/`toggelFag`) som intet UI længere sætter.

**2. Kodekvalitet & best practices**

Konsistent dansk navngivning, klare props, og kun eksisterende design-tokens — projektreglerne
er overholdt. `feedback.js` håndterer fejl pænt (try/catch + localStorage-buffer + flush).
`browseData.js` er rene funktioner. `byg-data` skriver nu atomisk + selv-validerende.

Mangler: ingen typer (ren JS) — for en data-tung app der overdrages, ville mindst en JSDoc-typedef
for "Kort"-kontrakten fange formfejl og give autocompletion. Ingen tests — `browseData` er
hjertet og er trivielt at unit-teste. Hele `database.json` (~2,8 MB) er inlinet i JS-bundtet
(~520 KB gzip), hvilket gør første paint tungere på mobildata end nødvendigt.

**3. UI/UX**

God tilgængelighed mange steder: `aria-label`, `aria-pressed` på feedback, `aria-expanded` på
accordions, `aria-current` på aktivt kort, tomtilstande ("Ingen kort…"). Mobil-først, token-drevet
og visuelt konsistent. PWA + offline.

Forbedringer: kommentar-popup'en ved 👎 lukkes ikke med Escape og har ingen fokus-fælde;
der er ingen synlig "Sendt"-bekræftelse når man stemmer; flip-kortet (`role="button"`) kunne
eksponere sin tilstand bedre for skærmlæsere. Mini-markdown-rendereren (~70 linjer ren logik)
bor inde i `Flashcard.jsx` og kunne testes hvis den lå i `lib/`.

**Allerede gjort i denne omgang** (ikke en del af planen nedenfor): fjernet scaffolding
(`DummyBadge`, `src/assets/*`, `src/App.css`), fjernet den ubrugte `useAlleEmnerPerFag`,
gjort `byg-data` atomisk + tolerant, og beskyttet `.env` i `.gitignore`.

---

# Optimeringsplan

## Kodestruktur & organisering

- [ ] **Step 1: Trim vestigial filter-state fra FilterContext**
  - **Task**: Fjern `soegning`/`setSoegning`, `fravalgte`/`setFravalgte`, `toggelEmne`,
    `toggelFag` fra `FilterProvider` og fra `useFiltreredeKort` (filtrér kun på `semester` +
    `udvalgteIds`). Forenkl `nulstil` til kun at nulstille `semester`. Søgning på forsiden bruger
    allerede sin egen `søgeord`-state, og emne-afvælg blev fjernet sammen med søgefeltet i sheetet.
  - **Files**:
    - `src/hooks/useFlashcards.jsx`: fjern de fire felter + forenkl `useFiltreredeKort`/`nulstil`/`filterSleutel`.
  - **Step Dependencies**: Ingen.
  - **Success**: `npm run build` grøn; semesterfilter + session-udvalg virker uændret; ingen
    referencer til de fjernede navne (`grep` tomt).

- [ ] **Step 2: Split god-filen `useFlashcards.jsx` i tre**
  - **Task**: Flyt ren data ud i `src/lib/kortData.js` (`mapAtomTilKort`, `ALLE_KORT`,
    `hentAlleKort`, `hentKortById`), konteksten i `src/context/FilterContext.jsx`
    (`FilterProvider` + `useFilter`), og lad `src/hooks/useFlashcards.jsx` kun rumme
    `useFlashcards` + `useFlashcardsByEmne`. Opdatér imports i forbrugere.
  - **Files**:
    - `src/lib/kortData.js` (ny), `src/context/FilterContext.jsx` (ny),
      `src/hooks/useFlashcards.jsx` (trimmet), `src/App.jsx`, `src/pages/BrowsePage.jsx`,
      `src/pages/SamlingPage.jsx`, `src/pages/FeedPage.jsx`,
      `src/components/FilterSheet/FilterSheet.jsx`, `src/components/ForbindelserPanel/ForbindelserPanel.jsx`.
  - **Step Dependencies**: Step 1.
  - **Success**: `npm run lint` viser ingen `react-refresh/only-export-components`-fejl;
    `npm run build` grøn; appen uændret.

- [ ] **Step 3: Træk swipe-motoren ud i `hooks/useSwipeFeed.js`**
  - **Task**: Flyt gestus-state, refs, transform-helpers og snap-logik fra `FeedPage.jsx` til en
    dedikeret hook der returnerer det siden skal bruge (`emneIndex`, `kortIndex`, handlers, refs).
    `FeedPage` bliver ren visning + navigation.
  - **Files**: `src/hooks/useSwipeFeed.js` (ny), `src/pages/FeedPage.jsx`.
  - **Step Dependencies**: Step 2.
  - **Success**: swipe (lodret emne / vandret kort), snap og "land på kort"-hop opfører sig
    1:1 som før; `FeedPage.jsx` markant kortere.

## Kodekvalitet & best practices

- [ ] **Step 4: JSDoc-typedef for "Kort"-kontrakten**
  - **Task**: Tilføj en `@typedef {Object} Kort` i `lib/kortData.js` der beskriver alle felter
    `mapAtomTilKort` returnerer, og annotér returtypen. Giver autocompletion og fanger formfejl
    uden at migrere til TypeScript.
  - **Files**: `src/lib/kortData.js`.
  - **Step Dependencies**: Step 2.
  - **Success**: IDE viser felt-forslag på `kort.`; ingen build-ændring.

- [ ] **Step 5: Unit-tests for `browseData` (vitest)**
  - **Task**: Tilføj `vitest` som dev-afhængighed + `"test": "vitest run"`-script, og skriv
    `src/lib/browseData.test.js` der dækker: `kapitelInfo`, `byggFagTræ` (sum-integritet:
    Σ kapitel-antal = fag-antal), `byggTemaer`, `tælLinser`, `søg`, `gruppérEfterEmne`.
  - **Files**: `package.json`, `src/lib/browseData.test.js` (ny).
  - **Step Dependencies**: Ingen (kan køres når som helst).
  - **Success**: `npm test` grøn; data-hjertet er nu beskyttet mod regressioner.

- [ ] **Step 6: Ryd resterende eslint-gæld i swipe-effekterne**
  - **Task**: Efter Step 3, omskriv de tilbageværende `set-state-in-effect`-mønstre til
    guardede/handlings-drevne opdateringer, så `npm run lint` er helt ren.
  - **Files**: `src/hooks/useSwipeFeed.js` (og evt. `FeedPage.jsx`).
  - **Step Dependencies**: Step 3.
  - **Success**: `npm run lint` = 0 fejl, 0 advarsler.

## Performance

- [ ] **Step 7: Kode-split `database.json` (hentes i stedet for inlinet)**
  - **Task**: Få `byg-data` til at skrive `database.json` til `public/` (så Vite serverer den som
    statisk asset), og lad `kortData.js` `fetch('/database.json')` ved opstart med en let
    loading-tilstand i stedet for `import database from …`. Service-workeren cacher den, så offline
    bevares.
  - **Files**: `scripts/byg-data.js` (output-sti), `src/lib/kortData.js` (async load),
    `src/main.jsx` eller en lille `<DataIndlæser>`-wrapper, evt. `public/sw.js` (cache-regel).
  - **Step Dependencies**: Step 2.
  - **Success**: initial JS-bundt markant under nuværende ~520 KB gzip; appen virker fortsat
    offline; første paint hurtigere på mobil.

## UI/UX

- [ ] **Step 8: Tilgængelighed + feedback-bekræftelse**
  - **Task**: Luk 👎-kommentar-popup'en med Escape og giv den en simpel fokus-fælde; vis en kort,
    diskret "Sendt ✓"-bekræftelse når en stemme registreres; lad flip-kortet annoncere for/bagside
    til skærmlæsere.
  - **Files**: `src/components/Flashcard/Flashcard.jsx`, `src/components/Flashcard/Flashcard.module.css`.
  - **Step Dependencies**: Ingen.
  - **Success**: tastatur kan lukke popup'en; SR-brugere får bekræftelse; ingen visuel regression.

- [ ] **Step 9 (valgfri): Træk mini-markdown ud i `lib/miniMarkdown.js`**
  - **Task**: Flyt `rendererInline`/`rendererMarkdown` fra `Flashcard.jsx` til `lib/miniMarkdown.js`
    og importér dem. Gør rendereren testbar og kortet renere.
  - **Files**: `src/lib/miniMarkdown.js` (ny), `src/components/Flashcard/Flashcard.jsx`,
    evt. `src/lib/miniMarkdown.test.js`.
  - **Step Dependencies**: Ingen.
  - **Success**: kort render uændret; rendereren kan unit-testes.

---

## Anbefalet rækkefølge & næste skridt

Tag stegene i rækkefølge **1 → 2 → 3 → 6** (struktur + lint-renhed) som første blok, da de andre
bygger ovenpå den oprydning. **Step 5** (tests) kan tages når som helst og bør tages tidligt, så
de øvrige refaktoreringer er beskyttede. **Step 7** (perf) og **Step 8** (UX) er uafhængige og kan
tages sidst. Ingen af stegene ændrer brugeroplevelsen — de gør koden lettere at vedligeholde,
teste og overdrage.

Logisk næste skridt efter planen: når feedback-backenden (Supabase) er koblet på, tilføj det
"Fortsæt / I dag"-bånd på forsiden som premortem'en pegede på — nu er der reelle fremdriftsdata
at vise.
