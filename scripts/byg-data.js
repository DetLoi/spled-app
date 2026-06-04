// Samler alle kapitelfiler i spled-data/**/*.json til én database.json,
// som spled-app læser. Samme mønster som spled-admin/scripts/byg-database.js.
//
// Kør: npm run byg-data  (kører automatisk før dev og build)
//
// Mappestruktur (Windows): Dokumenter/spled/spled-app/  +  Dokumenter/spled-data/
// → spled-data ligger som ../../spled-data set fra spled-app-roden.

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROD = join(__dirname, '..')

// spled-data findes som søskende til spled (../../spled-data fra app-roden).
// Tillad override via miljøvariabel SPLED_DATA for andre opsætninger.
// spled-data findes enten som direkte søskende (nyt standalone-layout: <rod>/spled-app + <rod>/spled-data)
// eller som ../../spled-data (gammelt monorepo-layout: spled/spled-app + spled-data). Prøv begge.
function findSpledData() {
  if (process.env.SPLED_DATA) return process.env.SPLED_DATA
  const kandidater = [join(APP_ROD, '..', 'spled-data'), join(APP_ROD, '..', '..', 'spled-data')]
  for (const k of kandidater) if (existsSync(k)) return k
  return kandidater[0]
}
const SPLED_DATA = findSpledData()
const OUTPUT = join(APP_ROD, 'src', 'data', 'database.json')

function findJsonFiler(mappe) {
  const fundet = []
  let poster
  try {
    poster = readdirSync(mappe)
  } catch {
    return fundet
  }
  for (const navn of poster) {
    if (navn === 'node_modules' || navn === '.git') continue
    const fuld = join(mappe, navn)
    const s = statSync(fuld)
    if (s.isDirectory()) {
      fundet.push(...findJsonFiler(fuld))
    } else if (navn.endsWith('.json')) {
      fundet.push(fuld)
    }
  }
  return fundet
}

if (!existsSync(SPLED_DATA)) {
  console.error(`Fejl: kunne ikke finde spled-data på: ${SPLED_DATA}`)
  console.error('Tip: sæt SPLED_DATA-miljøvariablen til den korrekte sti.')
  process.exit(1)
}

const filer = findJsonFiler(SPLED_DATA)

const kilder = []
const alleVidensenheder = []
const alleSkills = []
let afviste = 0

for (const fil of filer) {
  let data
  try {
    data = JSON.parse(readFileSync(fil, 'utf-8'))
  } catch (e) {
    console.warn(`Advarsel: kunne ikke parse ${fil} — springes over (${e.message})`)
    continue
  }

  // Kun filer med vidensbase-struktur regnes med
  const harStruktur = data && (Array.isArray(data.vidensenheder) || Array.isArray(data.skills) || data.kilde_gating)
  if (!harStruktur) continue

  const relSti = relative(SPLED_DATA, fil).replace(/\\/g, '/')
  const meta = data.meta || {}

  if (data.kilde_gating === 'AFVIST') {
    afviste++
    kilder.push({ fil: relSti, meta, status: 'AFVIST', årsag: data.årsag || null, antal_vidensenheder: 0, antal_skills: 0 })
    continue
  }

  const ve = Array.isArray(data.vidensenheder) ? data.vidensenheder : []
  const sk = Array.isArray(data.skills) ? data.skills : []

  for (const a of ve) {
    alleVidensenheder.push({ ...a, _kilde_fil: relSti, _meta_status: meta.status || 'ukendt' })
  }
  for (const s of sk) {
    alleSkills.push({ ...s, _kilde_fil: relSti, _meta_status: meta.status || 'ukendt' })
  }

  kilder.push({
    fil: relSti,
    meta,
    status: meta.status || 'ukendt',
    antal_vidensenheder: ve.length,
    antal_skills: sk.length,
  })
}

const database = {
  genereret: new Date().toISOString(),
  spled_data_sti: SPLED_DATA,
  antal_filer: kilder.length,
  antal_vidensenheder: alleVidensenheder.length,
  antal_skills: alleSkills.length,
  antal_afviste_filer: afviste,
  kilder,
  vidensenheder: alleVidensenheder,
  skills: alleSkills,
}

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, JSON.stringify(database, null, 2), 'utf-8')

console.log('✓ database.json genereret')
console.log(`  Kilder (filer):   ${kilder.length}`)
console.log(`  Vidensenheder:    ${alleVidensenheder.length}`)
console.log(`  Skills:           ${alleSkills.length}`)
if (afviste) console.log(`  Afviste filer:    ${afviste} (kilde-gating)`)
