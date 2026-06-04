# Forsiden (BrowsePage) — arkitektur & fejlfinding

Forsiden er bygget så fejl er hurtige at lokalisere. Princippet er en skarp
opdeling: **data-logik ét sted, visning ét sted, navigation ét sted.**

## Filoversigt
```
src/pages/BrowsePage.jsx            ← ORKESTRATOR (tynd): henter kort, kalder
                                       browseData, komponerer komponenterne,
                                       ejer startSession-navigationen.
src/lib/browseData.js               ← REN DATA-LOGIK (ingen React). Alle tal,
                                       grupperinger, søgning og sortering.
src/components/browse/
  SearchBar/        SearchBar.jsx        ← søgefelt (controlled)
  SearchResults/    SearchResults.jsx    ← liste af søgeresultater
  HurtigSession/    HurtigSession.jsx    ← "start en kort runde"-kortet
  TemaLinser/       TemaLinser.jsx       ← linser + tema-chips (tværgående)
  FagTrae/          FagTrae.jsx          ← fag → kapitel → emne drill-down
src/hooks/useFlashcards.jsx          ← mapAtomTilKort: hvilke felter et kort har
```

## Dataflow (én vej)
```
database.json
  → useFlashcards.mapAtomTilKort   (atom → kort-objekt; her tilføjes kapitel,
                                     sværhedsgrad, tværgående_tema, visuel_anbefalet)
  → hentAlleKort()                 (alle kort, bygget én gang)
  → browseData.*                   (byggFagTræ / byggTemaer / tælLinser / søg)
  → komponenterne                  (ren visning)
  → onVælg…-callback → BrowsePage.startSession(ids) → /session
```

## Hvor leder jeg når noget er galt?
| Symptom | Kig her |
|---|---|
| Forkert **antal** (fag/kapitel/emne/tema/linse) | `browseData.js` |
| Et emne ligger under **forkert kapitel/fag** | `browseData.byggFagTræ` + atomets `kilder[0].kapitel` i spled-data |
| Et **felt mangler** på kortet (fx sværhedsgrad) | `useFlashcards.mapAtomTilKort` |
| **Søgning** finder for få/mange | `browseData.søg` (matcher begreb/spørgsmål/emne/nøgleord) |
| En knap **starter forkert session** | `BrowsePage.startEmne/startKapitel/startTema/startLinse` |
| Et chip-**tal passer ikke** med sessionens indhold | linse-predikaterne i `browseData.LINSER` (samme funktion tæller OG filtrerer) |
| Kun **udseende** er galt | den enkelte komponents `.module.css` |

## Test data-logikken isoleret (uden at starte appen)
`browseData.js` er ren ES-module uden React. Den kan køres direkte i node mod
`database.json` — nyttigt til at bekræfte tal hurtigt. (Se eksempel-scriptet vi
brugte under udviklingen: byg kort-array fra `database.json`, kald funktionerne,
og tjek at summen af kapitel-antal = fag-antal.)

## Designregler der er fulgt
- Kun eksisterende CSS-variabler fra `src/styles/variables.css` (ingen nye farver/radii).
- Hver komponent: ét ansvar, egen mappe med `.jsx` + `.module.css`, props dokumenteret i toppen.
- Ingen data-logik i komponenter; ingen JSX i `browseData.js`.

## Hvad er ÆNDRET ift. den gamle forside
- **#1** `mapAtomTilKort` bevarer nu `kapitel`, `sværhedsgrad`, `tværgående_tema`, `visuel_anbefalet` (blev før droppet).
- **#2** Flad alfabetisk emne-liste → **fag → kapitel → emne** drill-down (`FagTrae`).
- **#3** Ny **global søgning** (`SearchBar` + `SearchResults`).
- **#4** 4 hardcodede pakker → **auto-genererede** tema-chips (38 temaer) + linser (kerne 555, klinisk-kritiske 60, visuelle 219, sværhedsgrad).

## Endnu ikke bygget (kræver mere)
- "Fortsæt / I dag"-båndet (fremdrift, repetition, streak) — afventer feedback-backend,
  så der er reelle data at vise. Kan tilføjes som en sjette komponent øverst uden at røre resten.

## Byg & deploy (på din Windows-maskine)
```bat
cd C:\Dev\spled-app
npm run dev            REM se forsiden lokalt
REM når du er tilfreds:
git add -A && git commit -m "Forside: sog, fag-kapitel-emne drill-down, auto temaer+linser" && git push
REM Vercel auto-deployer ved push (vite build; database.json er allerede committet)
```
