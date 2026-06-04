// kortData — REN datalag. Atom → "Kort"-kontrakt + den globale kort-liste.
// Dataen HENTES (ikke inlinet i bundtet) fra /database.json ved opstart, så
// app-bundtet er lille. indlæsKort() kaldes ÉN gang i main.jsx FØR App mountes,
// så ALLE_KORT er fyldt inden nogen komponent læser den.

/**
 * App'ens interne kort-kontrakt.
 * @typedef {Object} Kort
 * @property {string}   id
 * @property {string}   spørgsmål
 * @property {string}   forside
 * @property {string}   bagside
 * @property {string}   svar_faglig
 * @property {string}   svar_almindelig
 * @property {string}   svar_hulemand
 * @property {string}   fag
 * @property {string}   semester
 * @property {string}   begreb
 * @property {string}   emne
 * @property {string}   kapitel
 * @property {string=}  underkategori
 * @property {string=}  videnstype
 * @property {{type:string,tekst:string,reference?:string,kapitel?:string,sidetal?:string}} kilde
 * @property {string[]} forudsætninger
 * @property {Object[]} relationer
 * @property {boolean}  kerne_atom
 * @property {boolean}  klinisk_sikkerhed_kritisk
 * @property {number}   pædagogisk_orden_i_emne
 * @property {number|null} sværhedsgrad
 * @property {string[]} tværgående_tema
 * @property {boolean}  visuel_anbefalet
 * @property {string[]} nøgleord
 */

/**
 * Mapper et rå atom fra spled-data til app'ens Kort-kontrakt.
 * @param {Object} atom
 * @returns {Kort}
 */
export function mapAtomTilKort(atom) {
  const fagStreng = Array.isArray(atom.fag) ? atom.fag[0] || 'ukendt' : atom.fag || 'ukendt'

  const k0 = Array.isArray(atom.kilder) ? atom.kilder[0] : null
  const kildeTekst = k0
    ? [k0.reference, k0.kapitel, k0.sidetal ? `s. ${k0.sidetal}` : null].filter(Boolean).join(' · ')
    : 'Kilde ikke angivet'

  const kapitelStreng = k0?.kapitel || 'Uden kapitel'

  return {
    id: atom.id,
    spørgsmål: atom.spørgsmål,
    forside: atom.spørgsmål,
    bagside: atom.svar_faglig,
    svar_faglig: atom.svar_faglig,
    svar_almindelig: atom.svar_almindelig,
    svar_hulemand: atom.svar_hulemand,
    fag: fagStreng,
    semester: atom.semester || 'ikke angivet',
    begreb: atom.begreb,
    emne: atom.emne,
    underkategori: atom.kategori,
    videnstype: atom.videnstype,
    kilde: {
      type: k0?.type || 'ukendt',
      tekst: kildeTekst,
      reference: k0?.reference,
      kapitel: k0?.kapitel,
      sidetal: k0?.sidetal,
    },
    forudsætninger: atom.forudsætninger || [],
    relationer: atom.relationer || [],
    kerne_atom: atom.kerne_atom === true,
    klinisk_sikkerhed_kritisk: atom.klinisk_sikkerhed_kritisk === true,
    pædagogisk_orden_i_emne:
      typeof atom.pædagogisk_orden_i_emne === 'number' ? atom.pædagogisk_orden_i_emne : 9999,
    kapitel: kapitelStreng,
    sværhedsgrad: typeof atom.sværhedsgrad === 'number' ? atom.sværhedsgrad : null,
    tværgående_tema: Array.isArray(atom.tværgående_tema) ? atom.tværgående_tema : [],
    visuel_anbefalet: atom?.visuel?.anbefalet === true,
    nøgleord: atom.nøgleord || [],
  }
}

// Live ES-binding: fyldes af indlæsKort(). Komponenter læser den (via
// hentAlleKort) FØRST efter App er mountet — dvs. efter load — så den er aldrig
// tom på det tidspunkt.
export let ALLE_KORT = []
let _kortById = new Map()
let _indlaest = false

/**
 * Henter /database.json én gang og bygger kort-listen. Kald i main.jsx før mount.
 * @returns {Promise<Kort[]>}
 */
export async function indlæsKort() {
  if (_indlaest) return ALLE_KORT
  const url = (import.meta.env.BASE_URL || '/') + 'database.json'
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Kunne ikke hente database.json (HTTP ${r.status})`)
  const db = await r.json()
  ALLE_KORT = (db.vidensenheder || []).map(mapAtomTilKort)
  _kortById = new Map(ALLE_KORT.map((kort) => [kort.id, kort]))
  _indlaest = true
  return ALLE_KORT
}

/** @returns {Kort[]} alle kort (tom indtil indlæsKort() er kørt). */
export function hentAlleKort() {
  return ALLE_KORT
}

/** @param {string} id @returns {Kort|null} */
export function hentKortById(id) {
  return _kortById.get(id) || null
}
