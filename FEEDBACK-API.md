# Feedback-API — kontrakt til backend (Node + Express + TypeScript + MongoDB)

Appen indsamler 👍/👎 + kommentarer og sender dem til en backend. Frontend er
**allerede færdig** — den POST'er bare JSON til en URL. Byg en lille API der
matcher kontrakten herunder, så plugger den direkte ind uden ændringer i appen.

```
Telefon (app, vercel.app)  ──POST /feedback──▶  jeres API (Express+Mongo)
Duc's admin (localhost)    ──GET  /feedback──▶  jeres API
```

## To endpoints

### 1) `POST /feedback`  (appen skriver hér)
Body (præcis disse feltnavne — sådan sender appen det):
```json
{
  "atom_id": "anat-hjerte-kamre",
  "niveau": "faglig",
  "vote": "up",
  "kommentar": "",
  "begreb": "Hjertets kamre",
  "fag": "Anatomi og fysiologi",
  "session": "s-xxxx",
  "app_version": "mvp-1027",
  "ts": "2026-06-04T10:00:00.000Z"
}
```
- Gem som ét dokument i en `feedback`-collection. Tilføj gerne server-side `createdAt`.
- Svar `200`/`201` (body er ligegyldig — appen bruger ikke svaret).
- `vote` er altid `"up"` eller `"down"`. `kommentar` kan være tom.

### 2) `GET /feedback`  (admin læser hér)
- Returnér et **JSON-array** af dokumenterne, hver med mindst:
  `atom_id, niveau, vote, kommentar, begreb, fag, session, ts`.
- Admin'en tilføjer Supabase-agtige query-params (`?select=*&order=ts.desc&limit=5000`)
  — **ignorér dem bare**; returnér alle rækker (datasættet er lille). Vil du være
  pæn, kan du sortere nyeste-først og evt. respektere `limit`.

## Hvordan det kobles på (Duc gør dette bagefter)
- **Skrive (app):** sæt i Vercel → Project → Settings → Environment Variables:
  - `VITE_FEEDBACK_URL = https://<jeres-api>/feedback`
  - `VITE_FEEDBACK_KEY = <token>` (valgfrit — se Auth)
- **Læse (admin):** indsæt samme URL + token i admin'ens "Datakilde"-felt.

## Auth (valgfrit, men anbefalet)
Hvis I vil sikre endpointet, så brug en delt hemmelig token:
- Appen sender automatisk `Authorization: Bearer <VITE_FEEDBACK_KEY>` **og** en
  `apikey: <key>`-header, hvis `VITE_FEEDBACK_KEY` er sat. Validér én af dem i en
  Express-middleware.
- For en lukket 5-personers pilot er en enkelt delt token rigeligt.

## CORS — VIGTIGT (ellers blokerer browseren kaldene)
Appen og admin kører på **andre origins** end API'en, så API'en SKAL sende CORS:
```ts
import cors from 'cors'
app.use(cors({
  origin: ['https://<app>.vercel.app', 'http://localhost:5173', 'http://localhost:5174'],
  // tillad de headers appen sender:
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey'],
}))
```
(Uden korrekt CORS fejler både POST fra telefonen og GET fra admin.)

## Forslag til Mongo-skema (Mongoose)
```ts
const FeedbackSchema = new Schema({
  atom_id:     { type: String, index: true },
  niveau:      String,
  vote:        { type: String, enum: ['up', 'down'] },
  kommentar:   String,
  begreb:      String,
  fag:         String,
  session:     { type: String, index: true },
  app_version: String,
  ts:          Date,
  createdAt:   { type: Date, default: Date.now },
})
```

## Test af hele kæden (når API'en kører)
1. Stem på et kort i appen (telefon) → der bør oprettes ét dokument i Mongo.
2. Åbn Duc's admin → "Datakilde" → hent → stemmen vises under kortet.
Virker begge, spiller hele vejen rundt.
