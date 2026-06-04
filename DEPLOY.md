> **Følg `SETUP.md` først** hvis repo-strukturen endnu ikke er migreret (spled-app som eget repo ved siden af spled-data). Denne fil er deploy-detaljerne.

# Deploy SplEd privat (Vercel) — telefon + 5 studerende

MVP'en er klar: 1027 atomer, PWA (kan installeres på hjemmeskærm), offline efter første besøg.

## 0. Engangs-forberedelse (på din Windows-maskine)
```bash
cd C:\Dev\spled\spled-app
npm install            # henter Windows-binaries (sandbox kan ikke)
npm run byg-data       # frisker src/data/database.json til 1027 (allerede gjort, men kør for en sikkerheds skyld)
git add -A && git commit -m "MVP: 1027 atomer + PWA (manifest/sw/ikoner) + vercel.json"
git push
```
> **Vigtigt:** `database.json` ER committet (ikke gitignored), så den følger med til Vercel. På Vercel køres KUN `vite build` (byg-data springes over, fordi `spled-data` ikke findes der). Det er sat i `vercel.json`.

## 1. Deploy til Vercel (privat link)
```bash
cd C:\Dev\spled\spled-app
npx vercel            # første gang: log ind i browser, vælg scope, "link to existing? N", behold defaults
npx vercel --prod     # giver det rigtige produktions-link, fx https://spled-xxxx.vercel.app
```
Åbn linket på telefonen → del det med de 5 studerende.

## 2. Føj til hjemmeskærm (så det føles som en app)
- **iPhone (Safari):** Del-knap → "Føj til hjemmeskærm". Ikon + fuldskærm + offline.
- **Android (Chrome):** menu (⋮) → "Installér app" / "Føj til startskærm".

## 3. Opdatér efter nye atomer
```bash
npm run byg-data
git add -A && git commit -m "data-opdatering" && git push
npx vercel --prod     # eller forbind GitHub-repo i Vercel-dashboardet → auto-deploy ved push
```

## Privatliv (MVP-niveau)
- Linket er "uguessbart" (tilfældigt vercel.app-subdomæne) — fint til 5 testbrugere.
- Vil du have rigtig adgangskontrol: Vercel → Project → Settings → **Deployment Protection** (password) — kræver Pro-plan. Alternativt kan jeg bygge en simpel kode-gate i appen senere.

## Til feedback fra de 5 studerende
Overvej en simpel feedback-knap i appen (fx "meld fejl på dette kort" → mailto eller et Google Form-link). Sig til, hvis jeg skal tilføje den — det gør jeres pilot til reel validering (jf. premortem-punkt: ingen studerende har testet endnu).

## Noter
- Bundtet er ~3,5 MB (695 KB gzip) fordi hele databasen er inlinet. Fint til MVP; kan kode-splittes/lazy-loades senere hvis det skal være hurtigere på mobil-data.
- Billedkort (skelet/muskel-occlusion) er IKKE bygget endnu — de 23 flaggede atomer vises som almindelige tekstkort indtil rendereren laves.
