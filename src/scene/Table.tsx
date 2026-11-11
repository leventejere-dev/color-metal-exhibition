import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Builder, V, loft, polyRing } from '../lib/geo'
import { brushedTexture, logoTexture, noiseTexture, patinaTexture } from '../lib/textures'
import { tableState, useStore } from '../store'
import { TABLE } from './layout'

const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** Panel cladding around the faceted body (index 0 = front, then alternating ±). */
type Clad = 'brass' | 'copper' | 'patina' | 'alu' | 'zinc'
const CLADDING: Clad[] = ['brass', 'copper', 'patina', 'alu', 'zinc', 'copper', 'brass', 'copper', 'zinc', 'alu', 'patina', 'copper']
/** Facet indices that are compartment doors (left & right sides). */
const DOORS = new Set([3, 9])

function createTableMaterials() {
  const brushedV = brushedTexture(4, false)
  brushedV.repeat.set(2, 1)
  const brushedH = brushedTexture(5, true)
  brushedH.repeat.set(1, 6)
  const mottled = noiseTexture(61, 190, 60, 128)
  mottled.repeat.set(3, 3)
  const patinaMap = patinaTexture()
  patinaMap.repeat.set(1, 1.4)
  // brushed sheet metal: anisotropic highlights stretched along the brushing
  const metal = (color: string, roughness: number, metalness = 1, map: THREE.Texture = brushedV, anisotropy = 0.55) =>
    new THREE.MeshPhysicalMaterial({ color, roughness, metalness, roughnessMap: map, envMapIntensity: 1.15, anisotropy, anisotropyRotation: Math.PI / 2 })
  const mats = {
    brass: metal('#cdb06a', 0.3),
    copper: metal('#bf7a55', 0.32),
    patina: new THREE.MeshStandardMaterial({ color: '#ffffff', map: patinaMap, roughness: 0.68, metalness: 0.25, roughnessMap: mottled }),
    alu: metal('#43474c', 0.36, 0.7),
    zinc: metal('#a4a8aa', 0.4, 0.85),
    strip: metal('#c9aa60', 0.26),
    led: new THREE.MeshStandardMaterial({ color: '#fff1d6', emissive: '#ffd79a', emissiveIntensity: 1.4, roughness: 0.4 }),
    core: new THREE.MeshStandardMaterial({ color: '#2c2b29', roughness: 0.9 }),
    plinth: new THREE.MeshStandardMaterial({ color: '#3a3936', roughness: 0.75, metalness: 0.2 }),
    top: new THREE.MeshStandardMaterial({ color: '#dbd7d0', roughness: 0.6, metalness: 0.02 }),
    edge: metal('#c0a062', 0.3, 1, brushedH, 0),
    under: new THREE.MeshStandardMaterial({ color: '#6f6c67', roughness: 0.7 }),
    reveal: new THREE.MeshStandardMaterial({ color: '#2e2d2b', roughness: 0.9 }),
    ticks: new THREE.MeshStandardMaterial({ color: '#7d7e81', metalness: 0.6, roughness: 0.4 }),
    hub: metal('#c0a062', 0.24, 1, brushedV, 0),
    rim: metal('#3a3b3d', 0.35, 0.8, brushedH, 0),
  }
  return {
    mats,
    dispose() {
      Object.values(mats).forEach((m) => m.dispose())
      ;[brushedV, brushedH, mottled, patinaMap].forEach((t) => t.dispose())
    },
  }
}

/** Engraved bezel ticks around the rim of the rotating top (every 5°, major every 30°). */
function useTickGeometry() {
  return useMemo(() => {
    const b = new Builder()
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2
      const major = i % 6 === 0
      const len = major ? 0.045 : 0.022
      const r = TABLE.radius - 0.018 - len / 2
      b.box('t', major ? 0.004 : 0.0022, 0.0012, len, Math.sin(a) * r, TABLE.height + 0.0006, Math.cos(a) * r, a)
    }
    const g = b.build({ t: new THREE.MeshBasicMaterial() }).children[0] as THREE.Mesh
    return g.geometry
  }, [])
}

/** Planar quad with 0..1 UVs (u across, v up). Points: bl, br, tr, tl. */
function quad(bl: THREE.Vector3, br: THREE.Vector3, tr: THREE.Vector3, tl: THREE.Vector3) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute([bl, br, tr, bl, tr, tl].flatMap((p) => [p.x, p.y, p.z]), 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2))
  g.computeVertexNormals()
  return g
}

/**
 * Faceted, slightly tapered body (wider at the top) clad in architectural
 * metal sheets — a sample wall of the COLOR METAL portfolio — separated by
 * brass strips with soft LED reveal light. Two side panels are compartment doors.
 */
function useBodyGroup(mats: ReturnType<typeof createTableMaterials>['mats']) {
  return useMemo(() => {
    const { facets, rTop, rBottom, y0, y1 } = TABLE.body
    const half = Math.PI / facets
    const b = new Builder()
    const at = (theta: number, r: number, y: number) => V(Math.sin(theta) * r, y, Math.cos(theta) * r)
    // dark core (slightly inside the cladding)
    b.add('core', loft([polyRing(facets, rBottom - 0.02, y0, Math.PI / 2 - half), polyRing(facets, rTop - 0.02, y1, Math.PI / 2 - half)], { capTop: true, flat: true }))
    const strip = 0.034
    for (let i = 0; i < facets; i++) {
      const th = i * 2 * half
      const clad = CLADDING[i]
      const door = DOORS.has(i)
      // panel corners, pulled in by half a strip at each vertical joint
      const inset = (strip / 2 + 0.003) / rTop
      const insetB = (strip / 2 + 0.003) / rBottom
      const vy0 = y0 + 0.006
      const vy1 = y1 - 0.006
      const bl = at(th - half + insetB, rBottom, vy0)
      const br = at(th + half - insetB, rBottom, vy0)
      const tr = at(th + half - inset, rTop, vy1)
      const tl = at(th - half + inset, rTop, vy1)
      if (!door) {
        b.add(clad, quad(bl, br, tr, tl))
      } else {
        // compartment door: inset leaf with a dark shadow gap, vertical brass pull and LED sill
        const k = 0.018
        const lerp = (a: THREE.Vector3, c: THREE.Vector3, t: number) => a.clone().lerp(c, t)
        const dbl = lerp(lerp(bl, tl, 0.06), lerp(br, tr, 0.06), k * 2)
        const dbr = lerp(lerp(bl, tl, 0.06), lerp(br, tr, 0.06), 1 - k * 2)
        const dtl = lerp(lerp(bl, tl, 0.97), lerp(br, tr, 0.97), k * 2)
        const dtr = lerp(lerp(bl, tl, 0.97), lerp(br, tr, 0.97), 1 - k * 2)
        const n = at(th, 1, 0).setY(0)
        const out = n.clone().multiplyScalar(0.004)
        b.add('rim', quad(bl, br, tr, tl))
        b.add(clad, quad(dbl.add(out), dbr.add(out), dtr.add(out), dtl.add(out)))
        // pull: vertical brass bar near the meeting edge
        const pb = lerp(lerp(bl, tl, 0.42), lerp(br, tr, 0.42), 0.86).add(n.clone().multiplyScalar(0.016))
        const pt = lerp(lerp(bl, tl, 0.72), lerp(br, tr, 0.72), 0.86).add(n.clone().multiplyScalar(0.016))
        b.beam('strip', pb, pt, 0.014, 0.012, n)
        // LED line under the door leaf
        b.beam('led', lerp(bl, br, 0.08).add(V(0, 0.02, 0)).add(n.clone().multiplyScalar(0.006)), lerp(bl, br, 0.92).add(V(0, 0.02, 0)).add(n.clone().multiplyScalar(0.006)), 0.006, 0.004, n)
      }
      // brass strip + LED glow on the joint at the facet edge
      const te = th + half
      const sb = at(te, rBottom + 0.004, y0)
      const st = at(te, rTop + 0.004, y1)
      const radial = at(te, 1, 0)
      b.beam('led', sb.clone().sub(radial.clone().multiplyScalar(0.006)), st.clone().sub(radial.clone().multiplyScalar(0.006)), strip + 0.012, 0.01, radial)
      b.beam('strip', sb, st, strip, 0.012, radial)
    }
    // top rim band and bottom sill
    b.add('strip', loft([polyRing(facets, rTop + 0.012, y1 - 0.004, Math.PI / 2 - half), polyRing(facets, rTop + 0.012, y1 + 0.012, Math.PI / 2 - half)], { capTop: true, flat: true }))
    b.add('rim', loft([polyRing(facets, rBottom + 0.008, y0 - 0.01, Math.PI / 2 - half), polyRing(facets, rBottom + 0.008, y0 + 0.006, Math.PI / 2 - half)], { capTop: true, flat: true }))
    const g = b.build(mats as unknown as Record<string, THREE.Material>, 'table-body')
    return g
  }, [mats])
}

export function Table({ children }: { children: ReactNode }) {
  const rot = useRef<THREE.Group>(null!)
  const { mats, dispose } = useMemo(createTableMaterials, [])
  useEffect(() => dispose, [dispose])
  const ticks = useTickGeometry()
  const body = useBodyGroup(mats)
  useEffect(
    () => () =>
      body.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose()
      }),
    [body],
  )
  const [logo, setLogo] = useState<{ texture: THREE.Texture; aspect: number } | null>(null)
  const rotateRequest = useStore((s) => s.rotateRequest)
  const mode = useStore((s) => s.mode)

  useEffect(() => {
    let alive = true
    let tex: THREE.Texture | undefined
    // brand book: on a gold background the logo is used in solid black
    logoTexture(`${import.meta.env.BASE_URL}color-metal-logo.svg`, { tagline: 'PARTNER IN ENGINEERING', taglineColor: '#1d1d1d', tint: '#1d1d1d' })
      .then((l) => {
        tex = l.texture
        if (alive) setLogo(l)
      })
      .catch((e) => console.warn('logo texture', e))
    return () => {
      alive = false
      tex?.dispose()
    }
  }, [])

  // step / reset requests from the UI
  useEffect(() => {
    if (rotateRequest.nonce === 0) return
    const s = tableState
    s.velocity = 0
    if (rotateRequest.absolute !== undefined) s.target = s.angle - wrapPi(s.angle - rotateRequest.absolute)
    else s.target = (s.target ?? s.angle) + rotateRequest.delta
  }, [rotateRequest])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = tableState
    if (s.target !== null) {
      s.angle = THREE.MathUtils.damp(s.angle, s.target, 3.2, dt)
      if (Math.abs(s.target - s.angle) < 1e-4) {
        s.angle = s.target
        s.target = null
      }
    } else if (!s.dragging && s.velocity !== 0) {
      // heavy turntable: gentle friction after a manual push
      s.angle += s.velocity * dt
      s.velocity *= Math.exp(-dt * 2.4)
      if (Math.abs(s.velocity) < 0.002) s.velocity = 0
    }
    rot.current.rotation.y = s.angle
  })

  const edgeEmissive = mode === 'rotate' ? 0.08 : 0
  useEffect(() => {
    mats.edge.emissive.set('#c0a062')
    mats.edge.emissiveIntensity = edgeEmissive
  }, [edgeEmissive, mats])

  // logo on the (slightly outward-leaning) front brass panel
  const { rTop, rBottom, y0, y1, facets } = TABLE.body
  const cosH = Math.cos(Math.PI / facets)
  const tilt = Math.atan(((rTop - rBottom) * cosH) / (y1 - y0))
  const logoY = y0 + (y1 - y0) * 0.74
  const apo = (rBottom + ((logoY - y0) / (y1 - y0)) * (rTop - rBottom)) * cosH
  const logoW = 0.52
  const logoH = logo ? logoW / logo.aspect : 0.08

  return (
    <group>
      {/* ---------- fixed lower body ---------- */}
      <mesh position={[0, TABLE.plinthH / 2, 0]} receiveShadow castShadow material={mats.plinth}>
        <cylinderGeometry args={[TABLE.plinthRadius, TABLE.plinthRadius, TABLE.plinthH, 12, 1, false, Math.PI / 12]} />
      </mesh>
      <primitive object={body} />
      {logo && (
        <mesh position={[0, logoY, apo + 0.0075]} rotation={[tilt, 0, 0]}>
          <planeGeometry args={[logoW, logoH]} />
          <meshStandardMaterial map={logo.texture} transparent alphaTest={0.35} metalness={0.4} roughness={0.38} depthWrite={false} />
        </mesh>
      )}
      {/* shadow-gap reveal between fixed body and rotating top */}
      <mesh position={[0, (TABLE.bodyTop + TABLE.topY0) / 2, 0]} material={mats.reveal}>
        <cylinderGeometry args={[TABLE.bodyRadius - 0.06, TABLE.bodyRadius - 0.06, TABLE.topY0 - TABLE.bodyTop + 0.004, 96]} />
      </mesh>
      {/* fixed index mark (front) — reads against the bezel ticks */}
      <mesh position={[0, TABLE.bodyTop + 0.004, rTop * cosH + 0.024]} material={mats.hub}>
        <boxGeometry args={[0.008, 0.008, 0.02]} />
      </mesh>

      {/* ---------- rotating upper display assembly ---------- */}
      <group ref={rot}>
        <mesh position={[0, (TABLE.topY0 + TABLE.height) / 2, 0]} castShadow receiveShadow material={[mats.edge, mats.top, mats.under]}>
          <cylinderGeometry args={[TABLE.radius, TABLE.radius, TABLE.height - TABLE.topY0, 192]} />
        </mesh>
        <mesh geometry={ticks} material={mats.ticks} receiveShadow />
        {/* centre hub (rotation axis) */}
        <mesh position={[0, TABLE.height + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.hub} receiveShadow>
          <circleGeometry args={[0.075, 64]} />
        </mesh>
        <mesh position={[0, TABLE.height + 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.reveal}>
          <ringGeometry args={[0.075, 0.078, 64]} />
        </mesh>
        {children}
      </group>
    </group>
  )
}

