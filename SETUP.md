# SplEd-app — opsætning & repo-struktur

## Hvorfor denne ændring
`spled-app` lå før som en undermappe inde i det store `spled`-repo (sammen med hele transformations-pipelinen, teknisk/, råbøger osv.). Din storebror skal IKKE have alt det — kun **appen** og **dataen**. Derfor gør vi `spled-app` til sit eget repo, ved siden af `spled-data`.

### Ny struktur (mål)
```
<en-mappe>/
  spled-app/      ← eget git-repo (appen + den byggede database.json)   ← storebror + Vercel
  spled-data/     ← eget git-repo (atomerne, allerede selvstændigt)     ← storebror (til regenerering)
```
Dit gamle `spled`-repo beholder du som dit private "værksted" (governance, gates, råpipeline). Storebror rører det ikke.

> `byg-data.js` er gjort robust: den finder `spled-data` BÅDE som `../spled-data` (ny struktur) og `../../spled-data` (gammel), så intet går i stykker undervejs. Kan også overstyres med miljøvariablen `SPLED_DATA`.

---

## DEL 1 — Duc: engangs-migrering (på din Windows-maskine)

**0. Sikkerhedsnet først — push alt det nuværende, så intet tabes:**
```bat
cd C:\Dev\spled        && git add -A && git commit -m "seneste arbejde" && git push
cd C:\Dev\spled-data   && git add -A && git commit -m "seneste atomer" && git push
```

**1. Kopiér spled-app ud som ny topmappe (uden node_modules):**
```bat
robocopy C:\Dev\spled\spled-app C:\Dev\spled-app /E /XD node_modules dist .git
```
(`robocopy` springer `node_modules`, `dist` og evt. `.git` over — vi installerer rent bagefter.)

**2. Lav nyt git-repo og frisk database.json:**
```bat
cd C:\Dev\spled-app
npm install
npm run byg-data          REM henter spled-data automatisk fra ../spled-data → 1027 atomer
git init
git add -A
git commit -m "SplEd-app — standalone repo (MVP: 1027 atomer, PWA)"
```

**3. Opret tomt GitHub-repo `spled-app`** (på storebrors konto, eller en delt organisation I begge er med i — bedst på sigt). IKKE med README/gitignore (vi har dem). Derefter:
```bat
git remote add origin https://github.com/<ejer>/spled-app.git
git branch -M main
git push -u origin main
```

**4. Gør `spled-data` tilgængelig for storebror** (det er allerede sit eget repo, `DetLoi/spleddata`). Vælg én:
- gør det **public**, eller
- tilføj ham som **collaborator** (GitHub → repo → Settings → Collaborators), eller
- **overdrag/flyt** det til den delte ejer/organisation (så I begge committer samme sted).

**5. (Valgfri oprydning) Fjern den gamle kopi fra `spled`-repoet**, så der ikke er to app-kopier der driver fra hinanden:
```bat
cd C:\Dev\spled
git rm -r spled-app
git commit -m "Flyttet spled-app til eget repo" && git push
```
> Vent med dette til den nye opsætning er bekræftet at virke.

---

## DEL 2 — Storebror: kom i gang

**1. Klon begge repos SOM NABOER** (vigtigt: data-repoet hedder `spleddata` på GitHub, men mappen SKAL hedde `spled-data`):
```bash
git clone https://github.com/<ejer>/spled-app.git
git clone https://github.com/<ejer>/spleddata.git spled-data
```
Resultat: `spled-app/` og `spled-data/` ligger ved siden af hinanden.

**2. Kør lokalt:**
```bash
cd spled-app
npm install
npm run dev          # åbn den viste localhost-adresse
```

**3. Deploy til Vercel (han bruger det allerede):**
- Vercel-dashboard → **Add New → Project → Import** `spled-app`-repoet.
- **Root Directory = `.`** (standard — appen ligger i repo-roden nu, IKKE i en undermappe).
- Framework: Vite (autodetekteres). Build/output styres af `vercel.json` (`vite build` → `dist`).
- Deploy. Herefter **auto-deployer den ved hvert push til `main`** — telefon-linket opdaterer sig selv.

---

## Daglig arbejdsgang fremover
- **Du (Duc)** retter/tilføjer atomer i `spled-data` (med din pipeline i `spled`), kører gates, og pusher `spled-data`.
- For at opdatere appen: `cd spled-app && npm run byg-data` → commit+push `spled-app` → Vercel deployer automatisk.
- **Storebror** arbejder kun i `spled-app` (UI/funktioner) og pusher dertil.
- Hold de tre adskilt: `spled` (dit værksted, privat) · `spled-data` (indhold) · `spled-app` (appen, delt).

## Tjekliste før du sender til ham
- [ ] `spled-app` pusher op og `npm run dev` virker hos dig efter migreringen.
- [ ] `database.json` er committet i `spled-app/src/data/` (den ER tracked, så den følger med — appen kan deploye uden `spled-data`).
- [ ] Vercel-deploy virker fra det nye repo (root = `.`).
- [ ] `spled-data` er tilgængeligt for ham (public/collaborator/delt).
