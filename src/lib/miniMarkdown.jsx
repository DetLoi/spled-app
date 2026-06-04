// Lille markdown-renderer der dækker de mønstre vi faktisk har i svarene:
// **fed**, *kursiv*, bullet-lister (- / *), nummererede lister (1.) og afsnit
// adskilt af tomme linjer. Bevidst minimal — ingen fuld parser. Ren (kan testes).

export function rendererInline(tekst, nøglePræfiks) {
  const stykker = []
  const regex = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g
  let sidstePos = 0
  let m
  while ((m = regex.exec(tekst)) !== null) {
    if (m.index > sidstePos) {
      stykker.push(tekst.slice(sidstePos, m.index))
    }
    const t = m[0]
    if (t.startsWith('**')) {
      stykker.push(<strong key={`${nøglePræfiks}-b-${m.index}`}>{t.slice(2, -2)}</strong>)
    } else {
      stykker.push(<em key={`${nøglePræfiks}-i-${m.index}`}>{t.slice(1, -1)}</em>)
    }
    sidstePos = regex.lastIndex
  }
  if (sidstePos < tekst.length) {
    stykker.push(tekst.slice(sidstePos))
  }
  return stykker
}

export function rendererMarkdown(tekst) {
  if (!tekst) return null
  const blokke = tekst.split(/\n{2,}/)
  return blokke.map((blok, bi) => {
    const linjer = blok.split('\n').map((l) => l.trimEnd())
    const ikkeTomme = linjer.filter((l) => l.trim() !== '')

    // Bullet-liste hvis alle ikke-tomme linjer starter med "- " eller "* "
    if (ikkeTomme.length > 0 && ikkeTomme.every((l) => /^\s*[-*]\s/.test(l))) {
      return (
        <ul key={`ul-${bi}`}>
          {ikkeTomme.map((l, li) => (
            <li key={li}>{rendererInline(l.replace(/^\s*[-*]\s+/, ''), `${bi}-${li}`)}</li>
          ))}
        </ul>
      )
    }

    // Nummereret liste hvis alle ikke-tomme linjer starter med "1. ", "2. " osv.
    if (ikkeTomme.length > 0 && ikkeTomme.every((l) => /^\s*\d+\.\s/.test(l))) {
      return (
        <ol key={`ol-${bi}`}>
          {ikkeTomme.map((l, li) => (
            <li key={li}>{rendererInline(l.replace(/^\s*\d+\.\s+/, ''), `${bi}-${li}`)}</li>
          ))}
        </ol>
      )
    }

    // Almindeligt afsnit — bevar single line breaks som <br/>.
    const børn = []
    linjer.forEach((linje, li) => {
      if (li > 0) børn.push(<br key={`br-${bi}-${li}`} />)
      børn.push(...rendererInline(linje, `${bi}-${li}`))
    })
    return <p key={`p-${bi}`}>{børn}</p>
  })
}
