/**
 * COLOR METAL modular exhibition installation: four identical quarter-circle
 * furniture modules (Ø 2.80 m when joined), each carrying one removable
 * architectural model.
 *
 *  Installation (turns as one unit when joined — central pivot + swivel casters)
 *   ├─ Furniture module 01…04  (own transform, rolls on its own casters)
 *   │    ├─ quarter tabletop, shadow-gap reveal, tick ring
 *   │    ├─ metal-clad body, finished radial side panels, toe-kick skirt
 *   │    ├─ aluminium frame + cut cladding (construction view only)
 *   │    ├─ swivel casters (3 with total-lock brake, 1 plain at the apex)
 *   │    ├─ joint hardware (alignment pins / bushings, cam latch / keeper)
 *   │    └─ architectural model on its removable base
 *   ├─ central locking hub (drops into the four apex notches)
 *   └─ floor pivot plate with spigot
 */
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { brushedTexture, logoTexture, noiseTexture, patinaTexture } from '../lib/textures'
import { honeycombTexture } from '../lib/siteTextures'
import { isJoined, moduleState, tableState, useStore, type Config, type Detail, type ModelId } from '../store'
import { CASTER, CASTERS, MODULES, PARK_DISTANCE, SEPARATION, TABLE, moduleOf, type ModuleDef } from './layout'
import {
  buildBody,
  buildCutCladding,
  buildFrame,
  buildHardware,
  buildHoneycombEdge,
  buildTop,
  colliderGeometry,
  type ModuleFinish,
} from './furniture/parts'

const DEG = Math.PI / 180
const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** Facet finishes around the 12-sided body (index 0 = front, counting towards +x). */
const CLADDING = ['brass', 'copper', 'patina', 'alu', 'zinc', 'copper', 'brass', 'copper', 'zinc', 'alu', 'patina', 'copper']
/** Facets that are compartment doors. */
const DOORS = new Set([3, 9])

function finishOf(m: ModuleDef): ModuleFinish {
  const c = Math.round(m.angleDeg / 30)
  const f = (j: number) => ((c + j) % 12 + 12) % 12
  return { clad: [CLADDING[f(-1)], CLADDING[f(0)], CLADDING[f(1)]] as [string, string, string], door: DOORS.has(f(0)) }
}

/** Shared colliders (read by the camera rig). */
export const furnitureColliders: THREE.Object3D[] = []

/* ------------------------------------------------------------------ */
/* materials                                                           */
/* ------------------------------------------------------------------ */

function createFurnitureMaterials() {
  const brushedV = brushedTexture(4, false)
  brushedV.repeat.set(2, 1)
  const brushedH = brushedTexture(5, true)
  brushedH.repeat.set(1, 6)
  const mottled = noiseTexture(61, 190, 60, 128)
  mottled.repeat.set(3, 3)
  const patinaMap = patinaTexture()
  patinaMap.repeat.set(1, 1.4)
  const honey = honeycombTexture()
  honey.repeat.set(1 / 0.04, 1)
  const metal = (color: string, roughness: number, metalness = 1, map: THREE.Texture = brushedV, anisotropy = 0.55) =>
    new THREE.MeshPhysicalMaterial({ color, roughness, metalness, roughnessMap: map, envMapIntensity: 1.15, anisotropy, anisotropyRotation: Math.PI / 2 })
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p)
  const mats = {
    brass: metal('#cdb06a', 0.3),
    copper: metal('#bf7a55', 0.32),
    patina: std({ color: '#ffffff', map: patinaMap, roughness: 0.68, metalness: 0.25, roughnessMap: mottled }),
    alu: metal('#43474c', 0.36, 0.7),
    zinc: metal('#a4a8aa', 0.4, 0.85),
    strip: metal('#c9aa60', 0.26),
    led: std({ color: '#fff1d6', emissive: '#ffd79a', emissiveIntensity: 1.4, roughness: 0.4 }),
    plinth: std({ color: '#3a3936', roughness: 0.75, metalness: 0.2 }),
    niche: std({ color: '#252422', roughness: 0.9 }),
    top: std({ color: '#dbd7d0', roughness: 0.6, metalness: 0.02 }),
    edge: metal('#c0a062', 0.3, 1, brushedH, 0),
    reveal: std({ color: '#2e2d2b', roughness: 0.9 }),
    ticks: std({ color: '#7d7e81', metalness: 0.6, roughness: 0.4 }),
    hub: metal('#c0a062', 0.24, 1, brushedV, 0),
    rim: metal('#3a3b3d', 0.35, 0.8, brushedH, 0),
    // finished radial side panels: champagne brushed aluminium composite + black seal band
    side: metal('#b8b1a2', 0.42, 0.75, brushedH, 0.35),
    seal: std({ color: '#1f1f1f', roughness: 0.8 }),
    acm: std({ color: '#8e9093', roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide }),
    // construction and hardware
    frame: std({ color: '#c3c8cd', metalness: 0.85, roughness: 0.32, envMapIntensity: 1.2 }),
    honey: std({ map: honey, roughness: 0.6, metalness: 0.4 }),
    hw: std({ color: '#c8a75a', metalness: 1, roughness: 0.3, emissive: '#ffcc66', emissiveIntensity: 0 }),
    hwDark: std({ color: '#2a2a2b', metalness: 0.5, roughness: 0.5 }),
    rubber: std({ color: '#2b2c2e', roughness: 0.85 }),
    castor: std({ color: '#b4b8bc', metalness: 0.9, roughness: 0.35 }),
    brake: std({ color: '#5c5f63', metalness: 0.6, roughness: 0.45 }),
  }
  return {
    mats,
    dispose() {
      Object.values(mats).forEach((m) => m.dispose())
      ;[brushedV, brushedH, mottled, patinaMap, honey].forEach((t) => t.dispose())
    },
  }
}
type FMats = ReturnType<typeof createFurnitureMaterials>['mats']

/** Soft quarter-disc contact shadow (four of them read as one round shadow when joined). */
function quarterShadowTexture() {
  const W = 384
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const px = 128 // per metre; canvas covers x −1.5…1.5, z −0.3…1.7
  ctx.filter = 'blur(16px)'
  ctx.fillStyle = 'rgba(0,0,0,0.9)'
  ctx.beginPath()
  const cx = 1.5 * px
  const cz = 0.3 * px
  ctx.moveTo(cx, H - cz)
  for (let i = 0; i <= 30; i++) {
    const a = -Math.PI / 4 + (i / 30) * (Math.PI / 2)
    ctx.lineTo(cx + Math.sin(a) * 1.3 * px, H - (cz + Math.cos(a) * 1.3 * px))
  }
  ctx.closePath()
  ctx.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ------------------------------------------------------------------ */
/* configurations                                                      */
/* ------------------------------------------------------------------ */

const dir = (deg: number): [number, number] => [Math.sin(deg * DEG), Math.cos(deg * DEG)]

/** Target offset (installation frame) of every module for a configuration. */
export function moduleTargets(s: { config: Config; spread: number; focus: ModelId; detail: Detail }): Record<ModelId, [number, number]> {
  const out = {} as Record<ModelId, [number, number]>
  const fk = moduleOf(s.focus).angleDeg
  for (const m of MODULES) {
    const rel = (((m.angleDeg - fk) % 360) + 360) % 360 // 0 focus, 90 next (ccw), 180 opposite, 270 previous
    const [sx, sz] = dir(m.angleDeg)
    let d = 0
    let off: [number, number] | null = null
    if (s.detail === 'connections') d = 0.42
    else if (s.config === 'separated') d = SEPARATION * s.spread
    else if (s.config === 'single') d = rel === 0 ? 0 : PARK_DISTANCE
    else if (s.config === 'semi') d = rel === 0 || rel === 90 ? 0 : PARK_DISTANCE
    else if (s.config === 'threeQuarter') d = rel === 180 ? PARK_DISTANCE : 0
    else if (s.config === 'pairs') {
      // two semicircles: the focus pair and the opposite pair roll apart along their joint line
      const g = rel === 0 || rel === 90 ? fk + 45 : fk + 225
      const [gx, gz] = dir(g)
      off = [gx * 0.85, gz * 0.85]
    }
    out[m.model] = off ?? [sx * d, sz * d]
  }
  return out
}

/* ------------------------------------------------------------------ */
/* casters                                                             */
/* ------------------------------------------------------------------ */

interface CasterRig {
  root: THREE.Group
  swivel: THREE.Group
  wheel: THREE.Mesh
  local: THREE.Vector2 // module-frame position (x, z)
}

const casterGeo = (() => {
  const r = CASTER.wheelR
  const wheel = new THREE.CylinderGeometry(r, r, 0.02, 24)
  wheel.rotateZ(Math.PI / 2)
  const hub = new THREE.CylinderGeometry(0.011, 0.011, 0.024, 16)
  hub.rotateZ(Math.PI / 2)
  return {
    wheel,
    hub,
    plate: new THREE.BoxGeometry(0.062, 0.005, 0.062),
    bearing: new THREE.CylinderGeometry(0.02, 0.022, 0.008, 20),
    yoke: new THREE.BoxGeometry(0.036, 0.004, 0.036),
    cheek: new THREE.BoxGeometry(0.003, 0.044, 0.034),
    pedal: new THREE.BoxGeometry(0.028, 0.005, 0.026),
  }
})()

function makeCaster(m: FMats, brake: boolean): Omit<CasterRig, 'local'> {
  const root = new THREE.Group()
  const add = (g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) => {
    const mesh = new THREE.Mesh(g, mat)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }
  const top = CASTER.mountY
  add(casterGeo.plate, m.castor, 0, top - 0.0025, 0, root)
  const swivel = new THREE.Group()
  root.add(swivel)
  add(casterGeo.bearing, m.castor, 0, top - 0.009, 0, swivel)
  add(casterGeo.yoke, m.castor, 0, top - 0.015, -0.006, swivel)
  // fork cheeks; the wheel trails 20 mm behind the swivel axis
  add(casterGeo.cheek, m.castor, 0.0135, 0.038, -0.014, swivel)
  add(casterGeo.cheek, m.castor, -0.0135, 0.038, -0.014, swivel)
  const wheel = add(casterGeo.wheel, m.rubber, 0, CASTER.wheelR, -0.02, swivel)
  add(casterGeo.hub, m.castor, 0, CASTER.wheelR, -0.02, swivel)
  // total-lock brake pedal, pointing forward (towards the access side)
  if (brake) add(casterGeo.pedal, m.brake, 0, 0.047, 0.014, swivel)
  return { root, swivel, wheel }
}

/* ------------------------------------------------------------------ */
/* one furniture module                                                */
/* ------------------------------------------------------------------ */

interface ModuleRig {
  group: THREE.Group
  casters: CasterRig[]
}

function FurnitureModule({
  def,
  mats,
  logo,
  rigs,
  shadowTex,
  children,
}: {
  def: ModuleDef
  mats: FMats
  logo: { texture: THREE.Texture; aspect: number } | null
  rigs: Map<ModelId, ModuleRig>
  shadowTex: THREE.Texture
  children: ReactNode
}) {
  const group = useRef<THREE.Group>(null!)
  const finish = useMemo(() => finishOf(def), [def])
  const detail = useStore((s) => s.detail)
  const focus = useStore((s) => s.focus)
  const cut = detail === 'construction' && focus === def.model

  const parts = useMemo(() => {
    const m = mats as unknown as Record<string, THREE.Material>
    const { body, sideP, clad } = buildBody(finish)
    const { top, reveal, ticks } = buildTop()
    return {
      body: body.build(m, 'body'),
      sideP: sideP.build(m, 'side+'),
      clad: clad.build(m, 'cladding'),
      reveal: reveal.build(m, 'reveal'),
      ticks: ticks.build(m, 'ticks'),
      top,
      hardware: buildHardware().build(m, 'hardware'),
      frame: buildFrame().build(m, 'frame'),
      cutClad: buildCutCladding(finish).build(m, 'cut'),
      honey: buildHoneycombEdge(),
      collider: colliderGeometry(),
    }
  }, [mats, finish])
  useEffect(
    () => () => {
      for (const o of [parts.body, parts.sideP, parts.clad, parts.reveal, parts.ticks, parts.hardware, parts.frame, parts.cutClad])
        o.traverse((x) => (x as THREE.Mesh).isMesh && (x as THREE.Mesh).geometry.dispose())
      parts.top.dispose()
      parts.honey.dispose()
      parts.collider.dispose()
    },
    [parts],
  )

  const casters = useMemo(
    () =>
      CASTERS.map((c) => {
        const rig = makeCaster(mats, c.brake)
        const a = c.deg * DEG
        rig.root.position.set(Math.sin(a) * c.r, 0, Math.cos(a) * c.r)
        // parked casters trail outwards
        rig.swivel.rotation.y = a + Math.PI
        return { ...rig, local: new THREE.Vector2(Math.sin(a) * c.r, Math.cos(a) * c.r) }
      }),
    [mats],
  )

  const collider = useRef<THREE.Mesh>(null!)
  useEffect(() => {
    rigs.set(def.model, { group: group.current, casters })
    const c = collider.current
    furnitureColliders.push(c)
    return () => {
      rigs.delete(def.model)
      const i = furnitureColliders.indexOf(c)
      if (i >= 0) furnitureColliders.splice(i, 1)
    }
  }, [rigs, def.model, casters])

  // logo on the brass hero facet (front and back modules)
  const { rTop, rBottom, y0, y1, facets } = TABLE.body
  const cosH = Math.cos(Math.PI / facets)
  const tilt = Math.atan(((rTop - rBottom) * cosH) / (y1 - y0))
  const logoY = y0 + (y1 - y0) * 0.74
  const apo = (rBottom + ((logoY - y0) / (y1 - y0)) * (rTop - rBottom)) * cosH
  const logoW = 0.52
  const showLogo = finish.clad[1] === 'brass' && logo

  return (
    <group ref={group}>
      <group rotation={[0, def.angleDeg * DEG, 0]}>
        <primitive object={parts.body} />
        <primitive object={parts.sideP} visible={!cut} />
        <primitive object={parts.clad} visible={!cut} />
        <primitive object={parts.cutClad} visible={cut} />
        <primitive object={parts.frame} visible={cut} />
        <mesh geometry={parts.honey} material={mats.honey} visible={cut} />
        <primitive object={parts.hardware} />
        <primitive object={parts.reveal} />
        <mesh geometry={parts.top} material={[mats.top, mats.edge]} castShadow receiveShadow />
        <primitive object={parts.ticks} />
        {casters.map((c, i) => (
          <primitive key={i} object={c.root} />
        ))}
        {showLogo && (
          <mesh position={[0, logoY, apo + 0.0075]} rotation={[tilt, 0, 0]} visible={!cut}>
            <planeGeometry args={[logoW, logoW / logo.aspect]} />
            <meshStandardMaterial map={logo.texture} transparent alphaTest={0.35} metalness={0.4} roughness={0.38} depthWrite={false} />
          </mesh>
        )}
        {/* soft quarter contact shadow on the floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0.7]} renderOrder={1}>
          <planeGeometry args={[3, 2]} />
          <meshBasicMaterial map={shadowTex} transparent opacity={0.34} depthWrite={false} />
        </mesh>
        <mesh ref={collider} geometry={parts.collider} visible={false} />
        {cut && <ConstructionTags />}
        {children}
      </group>
    </group>
  )
}

/** A few discreet labels for the construction cutaway (module frame). */
function ConstructionTags() {
  const tags: [string, [number, number, number]][] = [
    ['Alumínium profilváz, 40 × 40 mm', [-0.62, 0.52, 0.86]],
    ['Alumínium méhsejtes asztallap', [0.62, 1.03, 0.9]],
    ['1 mm fémlemez 4 mm kompozit panelen', [0.3, 0.42, 1.18]],
    ['Ø 50 mm forgó görgő, teljes fékkel', [0.58, 0.05, 0.9]],
    ['Illesztőcsap · excenteres zár', [0.66, 0.75, 0.62]],
    ['Levehető makettalap', [0, 1.1, 0.45]],
  ]
  return (
    <>
      {tags.map(([t, p]) => (
        <Html key={t} position={p} center zIndexRange={[5, 0]} className="tag-wrap">
          <div className="tag">
            <i />
            {t}
          </div>
        </Html>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* the installation                                                    */
/* ------------------------------------------------------------------ */

const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

export function Installation({ renderModel }: { renderModel: (id: ModelId, index: number) => ReactNode }) {
  const root = useRef<THREE.Group>(null!)
  const hub = useRef<THREE.Group>(null!)
  const { mats, dispose } = useMemo(createFurnitureMaterials, [])
  useEffect(() => dispose, [dispose])
  const shadowTex = useMemo(quarterShadowTexture, [])
  useEffect(() => () => shadowTex.dispose(), [shadowTex])
  const rigs = useMemo(() => new Map<ModelId, ModuleRig>(), [])
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

  // step / reset requests from the rotation dial
  useEffect(() => {
    if (rotateRequest.nonce === 0) return
    const s = tableState
    s.velocity = 0
    if (rotateRequest.absolute !== undefined) s.target = s.angle - wrapPi(s.angle - rotateRequest.absolute)
    else s.target = (s.target ?? s.angle) + rotateRequest.delta
  }, [rotateRequest])

  useEffect(() => {
    mats.edge.emissive.set('#c0a062')
    mats.edge.emissiveIntensity = mode === 'rotate' ? 0.08 : 0
  }, [mode, mats])

  const motion = useRef(
    MODULES.map(() => ({ from: [0, 0] as [number, number], to: [0, 0] as [number, number], t0: 0, dur: 1, x: 0, z: 0 })),
  )
  const hubY = useRef(0)
  const lastAngle = useRef(0)

  useFrame((state, dtRaw) => {
    const dt = Math.max(1e-4, Math.min(dtRaw, 0.05))
    const now = state.clock.elapsedTime
    const st = useStore.getState()

    /* installation rotation (only possible while joined) */
    const s = tableState
    if (s.target !== null) {
      s.angle = THREE.MathUtils.damp(s.angle, s.target, 3.2, dt)
      if (Math.abs(s.target - s.angle) < 1e-4) {
        s.angle = s.target
        s.target = null
      }
    } else if (!s.dragging && s.velocity !== 0) {
      s.angle += s.velocity * dt
      s.velocity *= Math.exp(-dt * 2.4)
      if (Math.abs(s.velocity) < 0.002) s.velocity = 0
    }
    root.current.rotation.y = s.angle
    const omega = (s.angle - lastAngle.current) / dt
    lastAngle.current = s.angle

    /* module motion: each module rolls on its casters to its target */
    const targets = moduleTargets(st)
    const atRest = motion.current.every((m) => Math.hypot(m.x, m.z) < 1e-4)
    MODULES.forEach((def, i) => {
      const m = motion.current[i]
      const [tx, tz] = targets[def.model]
      if (tx !== m.to[0] || tz !== m.to[1]) {
        const dist = Math.hypot(tx - m.x, tz - m.z)
        m.from = [m.x, m.z]
        m.to = [tx, tz]
        m.dur = dist > 2.5 ? 1.4 + dist / 2.4 : 0.6 + dist / 0.55
        // the central hub key comes out before joined modules can roll apart
        m.t0 = now + (atRest && hubY.current < 0.02 && dist > 0.01 ? 0.5 : 0)
      }
      const t = THREE.MathUtils.clamp((now - m.t0) / m.dur, 0, 1)
      const e = smoother(t)
      const x = m.from[0] + (m.to[0] - m.from[0]) * e
      const z = m.from[1] + (m.to[1] - m.from[1]) * e
      const vx = (x - m.x) / dt
      const vz = (z - m.z) / dt
      m.x = x
      m.z = z
      Object.assign(moduleState[def.model], { x, z, tx, tz })
      const rig = rigs.get(def.model)
      if (!rig) return
      rig.group.position.set(x, 0, z)
      rig.group.visible = Math.hypot(x, z) < PARK_DISTANCE - 1.2 || Math.hypot(tx, tz) < PARK_DISTANCE - 1.2
      // casters: swivel into the direction of travel, wheels roll with the distance covered
      const a = def.angleDeg * DEG
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      for (const c of rig.casters) {
        // caster position in the installation frame
        const px = x + c.local.x * ca + c.local.y * sa
        const pz = z - c.local.x * sa + c.local.y * ca
        const wx = vx + omega * pz
        const wz = vz - omega * px
        // back into the module frame
        const lx = wx * ca - wz * sa
        const lz = wx * sa + wz * ca
        const speed = Math.hypot(lx, lz)
        if (speed > 0.01) {
          const yaw = Math.atan2(lx, lz)
          const cur = c.swivel.rotation.y
          c.swivel.rotation.y = cur + wrapPi(yaw - cur) * (1 - Math.exp(-12 * dt))
          c.wheel.rotation.x += (speed * dt) / CASTER.wheelR
        }
      }
    })

    /* central locking hub: seated when joined, shown lifted in the connection view, removed otherwise */
    const joined = isJoined(st) && motion.current.every((m) => Math.hypot(m.x, m.z) < 1e-3)
    const hubTarget = joined ? 0 : st.detail === 'connections' ? 0.24 : 0.36
    hubY.current = THREE.MathUtils.damp(hubY.current, hubTarget, 6, dt)
    hub.current.position.y = hubY.current
    hub.current.visible = joined || st.detail === 'connections' || hubY.current < 0.3

    mats.hw.emissiveIntensity = st.detail === 'connections' ? 0.18 + 0.14 * Math.sin(now * 3.2) : 0
  })

  return (
    <group ref={root}>
      {/* floor pivot plate with spigot: the joined installation turns about it */}
      <mesh position={[0, 0.005, 0]} material={mats.plinth} receiveShadow>
        <cylinderGeometry args={[0.16, 0.17, 0.01, 40]} />
      </mesh>
      <mesh position={[0, 0.045, 0]} material={mats.frame} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.07, 20]} />
      </mesh>

      {/* central locking hub (key): drops into the four apex notches */}
      <group ref={hub}>
        <mesh position={[0, TABLE.height - 0.011, 0]} material={mats.hub} castShadow receiveShadow>
          <cylinderGeometry args={[TABLE.notch - 0.003, TABLE.notch - 0.003, 0.024, 48]} />
        </mesh>
        <mesh position={[0, TABLE.height + 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.reveal}>
          <ringGeometry args={[0.03, 0.033, 48]} />
        </mesh>
        {[0, 1, 2, 3].map((k) => {
          const a = (45 + 90 * k) * DEG
          return (
            <mesh key={k} position={[Math.sin(a) * 0.035, TABLE.height - 0.045, Math.cos(a) * 0.035]} material={mats.hw}>
              <cylinderGeometry args={[0.006, 0.004, 0.05, 12]} />
            </mesh>
          )
        })}
      </group>

      {MODULES.map((def, i) => (
        <Fragment key={def.model}>
          <FurnitureModule def={def} mats={mats} logo={logo} rigs={rigs} shadowTex={shadowTex}>
            {renderModel(def.model, i)}
          </FurnitureModule>
        </Fragment>
      ))}
    </group>
  )
}
