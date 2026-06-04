// useSwipeFeed — swipe-motoren til feedet (lodret = emner, vandret = kort).
// Drag-follow via direkte transform på refs under bevægelse, snap ved slip.
// Trukket ud af FeedPage så siden kun er visning + navigation. Ingen JSX her.
//
// Parametre:
//   grupperetKort   : [{ emne, kort[] }] (fra useFlashcardsByEmne)
//   filterSleutel   : nøgle der nulstiller positionen når udvalget ændrer sig
//   startId         : valgfrit atom-ID at lande på ved indlæsning (fra SamlingPage)
//   animatingKlasse : CSS-klassen der slår snap-transitionen til (styles.animating)
//
// Returnerer indices, refs, touch-handlers, og springTilId(id) → boolean.
import { useEffect, useRef, useLayoutEffect, useCallback, useState } from 'react'

const THRESHOLD_PCT = 0.4
const AXIS_LOCK_PX = 8
const SNAP_PROP = 'transform'

export function useSwipeFeed({ grupperetKort, filterSleutel, startId, animatingKlasse }) {
  const [emneIndex, setEmneIndex] = useState(0)
  const [kortIndex, setKortIndex] = useState(0)

  const vertTrackRef = useRef(null)
  const horizRefs = useRef({})
  const beroringStart = useRef({ x: 0, y: 0 })
  const akselLas = useRef(null)
  const traekkerRef = useRef(false)
  const snapIgangRef = useRef(false)
  // Mål-kortindex der skal anvendes EFTER et emneskift (så layout-effekten ikke
  // nulstiller til 0). Og hvilket startId vi allerede har sprunget til.
  const afventerKortIndex = useRef(null)
  const startHaandteretRef = useRef(null)

  const nEmner = grupperetKort.length
  const gruppe = grupperetKort[emneIndex]
  const nKortIUdvalg = gruppe?.kort?.length ?? 0
  const aktivtKort = grupperetKort[emneIndex]?.kort?.[kortIndex] ?? null

  // Nulstil/klamp position i RENDER-fasen (React anbefaler dette frem for at
  // sætte state i en effekt — undgår cascading renders).
  const [prevSleutel, setPrevSleutel] = useState(filterSleutel)
  if (prevSleutel !== filterSleutel) {
    setPrevSleutel(filterSleutel)
    setEmneIndex(0)
    setKortIndex(0)
  } else {
    const klampetEmne = nEmner === 0 ? 0 : Math.min(emneIndex, nEmner - 1)
    if (klampetEmne !== emneIndex) setEmneIndex(klampetEmne)
  }

  // Land på et bestemt kort når man kommer fra en samlings-oversigt (startId).
  useEffect(() => {
    if (!startId || startHaandteretRef.current === startId || grupperetKort.length === 0) return
    for (let ei = 0; ei < grupperetKort.length; ei++) {
      const ki = grupperetKort[ei].kort.findIndex((k) => k.id === startId)
      if (ki !== -1) {
        startHaandteretRef.current = startId
        if (ei === emneIndex) {
          setKortIndex(ki)
        } else {
          afventerKortIndex.current = ki
          setEmneIndex(ei)
        }
        break
      }
    }
  }, [grupperetKort, startId, emneIndex])

  useLayoutEffect(() => {
    if (afventerKortIndex.current != null) {
      setKortIndex(afventerKortIndex.current)
      afventerKortIndex.current = null
    } else {
      setKortIndex(0)
    }
  }, [emneIndex])

  const saetVertTransform = useCallback((dyPx) => {
    const el = vertTrackRef.current
    if (!el) return
    el.style.transform = `translate3d(0, calc(-${emneIndex} * (100dvh - 160px) + ${dyPx}px), 0)`
  }, [emneIndex])

  const saetHorizTransform = useCallback(
    (ei, dxPx) => {
      const el = horizRefs.current[ei]
      if (!el) return
      const ki = ei === emneIndex ? kortIndex : 0
      el.style.transform = `translate3d(calc(-${ki} * 100vw + ${dxPx}px), 0, 0)`
    },
    [emneIndex, kortIndex],
  )

  useLayoutEffect(() => {
    if (traekkerRef.current || snapIgangRef.current || nEmner === 0) return
    if (!vertTrackRef.current) return
    saetVertTransform(0)
    grupperetKort.forEach((_, ei) => saetHorizTransform(ei, 0))
  }, [emneIndex, kortIndex, grupperetKort, nEmner, saetVertTransform, saetHorizTransform])

  function startSnapVert(nyEmneIndex) {
    const el = vertTrackRef.current
    if (!el) return
    snapIgangRef.current = true
    el.classList.add(animatingKlasse)
    requestAnimationFrame(() => {
      el.style.transform = `translate3d(0, calc(-${nyEmneIndex} * (100dvh - 160px)), 0)`
    })
    function done(e) {
      if (e.propertyName !== SNAP_PROP || e.target !== el) return
      el.removeEventListener('transitionend', done)
      snapIgangRef.current = false
      el.classList.remove(animatingKlasse)
      el.style.transform = `translate3d(0, calc(-${nyEmneIndex} * (100dvh - 160px)), 0)`
      setEmneIndex(nyEmneIndex)
    }
    el.addEventListener('transitionend', done)
  }

  function startSnapHoriz(eiFixed, nyKortIndex) {
    const el = horizRefs.current[eiFixed]
    if (!el) return
    snapIgangRef.current = true
    el.classList.add(animatingKlasse)
    requestAnimationFrame(() => {
      el.style.transform = `translate3d(calc(-${nyKortIndex} * 100vw), 0, 0)`
    })
    function done(e) {
      if (e.propertyName !== SNAP_PROP || e.target !== el) return
      el.removeEventListener('transitionend', done)
      snapIgangRef.current = false
      el.classList.remove(animatingKlasse)
      el.style.transform = `translate3d(calc(-${nyKortIndex} * 100vw), 0, 0)`
      setKortIndex(nyKortIndex)
    }
    el.addEventListener('transitionend', done)
  }

  function paTouchFoerFinger() {
    traekkerRef.current = true
    akselLas.current = null
    const v = vertTrackRef.current
    if (v) v.classList.remove(animatingKlasse)
    Object.values(horizRefs.current).forEach((h) => {
      if (h) h.classList.remove(animatingKlasse)
    })
    saetVertTransform(0)
    grupperetKort.forEach((_, ei) => saetHorizTransform(ei, 0))
  }

  function paTouchMove(e) {
    if (!traekkerRef.current || nEmner === 0) return
    const t = e.touches[0]
    const dx = t.clientX - beroringStart.current.x
    const dy = t.clientY - beroringStart.current.y
    const ax = Math.abs(dx)
    const ay = Math.abs(dy)

    if (akselLas.current === null && (ax > AXIS_LOCK_PX || ay > AXIS_LOCK_PX)) {
      akselLas.current = ax > ay ? 'h' : 'v'
    }

    if (akselLas.current === 'h' && gruppe) {
      let dxDaempet = dx
      const erFoersteKort = kortIndex === 0
      const erSidsteKort = kortIndex === gruppe.kort.length - 1
      if ((dx > 0 && erFoersteKort) || (dx < 0 && erSidsteKort)) {
        dxDaempet = dx * 0.2
      }
      saetHorizTransform(emneIndex, dxDaempet)
    } else if (akselLas.current === 'v') {
      let dyDaempet = dy
      const erFoersteEmne = emneIndex === 0
      const erSidsteEmne = emneIndex === nEmner - 1
      if ((dy > 0 && erFoersteEmne) || (dy < 0 && erSidsteEmne)) {
        dyDaempet = dy * 0.2
      }
      saetVertTransform(dyDaempet)
    }
  }

  function afslutVertikal(dy) {
    const h = typeof window !== 'undefined' ? window.innerHeight : 800
    const slotHoejde = h - 160
    const th = slotHoejde * THRESHOLD_PCT
    let ny = emneIndex
    if (dy < -th && emneIndex < nEmner - 1) ny = emneIndex + 1
    else if (dy > th && emneIndex > 0) ny = emneIndex - 1
    startSnapVert(ny)
  }

  function afslutHorisontal(dx) {
    if (!gruppe) return
    const w = typeof window !== 'undefined' ? window.innerWidth : 400
    const th = w * THRESHOLD_PCT
    const max = gruppe.kort.length - 1
    let ny = kortIndex
    if (dx < -th && kortIndex < max) ny = kortIndex + 1
    else if (dx > th && kortIndex > 0) ny = kortIndex - 1
    startSnapHoriz(emneIndex, ny)
  }

  function paTouchSlutRaw(e) {
    if (!traekkerRef.current || nEmner === 0) {
      traekkerRef.current = false
      akselLas.current = null
      return
    }
    const t = e.changedTouches?.[0]
    traekkerRef.current = false
    const dx = t ? t.clientX - beroringStart.current.x : 0
    const dy = t ? t.clientY - beroringStart.current.y : 0

    if (akselLas.current === 'h') {
      afslutHorisontal(dx)
    } else if (akselLas.current === 'v') {
      afslutVertikal(dy)
    } else {
      saetVertTransform(0)
      grupperetKort.forEach((_, ei) => saetHorizTransform(ei, 0))
    }
    akselLas.current = null
  }

  function paTouchStartGem(e) {
    const tt = e.touches[0]
    beroringStart.current = { x: tt.clientX, y: tt.clientY }
    paTouchFoerFinger()
  }

  // Spring til et bestemt atom hvis det findes i den aktuelle visning.
  // Returnerer true hvis fundet (så kalderen kan lukke et panel).
  function springTilId(id) {
    for (let ei = 0; ei < grupperetKort.length; ei++) {
      const ki = grupperetKort[ei].kort.findIndex((k) => k.id === id)
      if (ki !== -1) {
        if (ei === emneIndex) {
          setKortIndex(ki)
        } else {
          afventerKortIndex.current = ki
          setEmneIndex(ei)
        }
        return true
      }
    }
    return false
  }

  return {
    emneIndex,
    kortIndex,
    nEmner,
    nKortIUdvalg,
    aktivtKort,
    vertTrackRef,
    horizRefs,
    onTouchStart: paTouchStartGem,
    onTouchMove: paTouchMove,
    onTouchEnd: paTouchSlutRaw,
    springTilId,
  }
}
