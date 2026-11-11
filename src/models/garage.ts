/**
 * MODEL D — Multi-storey car park, Satu Mare.
 *
 * COLOR METAL supplied the gold-painted expanded aluminium mesh façade and all
 * of its fixing elements. Modelling specification derived from the supplied
 * drone and street photographs (real metres):
 *  - Rectangular block with one large rounded street corner: the front face
 *    meets the curve at a slight kink, the curve sweeps round into the side
 *    face; the west end is a raw concrete party wall.
 *  - Four levels; a concrete frame with punched openings in groups, veiled by
 *    the expanded-metal mesh hung on vertical profiles at an alternating
 *    narrow / wide rhythm, gold coping on top and a gold sill flashing over the
 *    plinth.
 *  - Yellow-ochre clinker brick plinth with perforated brick screens, white
 *    roller shutters and a vehicle entrance.
 *  - Flat membrane roof: plant area enclosed by a gold mesh screen with boxed
 *    posts, galvanised ducts and units, a glazed stair head near the curved
 *    corner and a stair/lift housing.
 * Approximations: footprint, heights and the curve radius are estimated from
 * the photographs; opening pattern, roof plant and ground-floor openings are
 * simplified; the mesh diamond is drawn ~2× real size so it stays legible at
 * model scale.
 */
import * as THREE from 'three'
import { MODEL_LENGTH } from './common'
import { Builder, V, mat, metricBox, rng } from '../lib/geo'

export const GARAGE_SIZE = { length: 50, scale: MODEL_LENGTH / 50 }

/* ---------------- plan ---------------- */
const W = 50 // east–west (x)
const D = 33 // north–south (z); +z = front face
const R = 14 // radius of the rounded street corner
const KINK = (16 * Math.PI) / 180 // the front face meets the curve at a slight angle
const XK = W / 2 - R * (1 - Math.sin(KINK)) // end of the straight front face
const ZE = D / 2 - R * Math.cos(KINK) // start of the straight east face

/* ---------------- section ---------------- */
const PLINTH = 2.4 // brick plinth / bottom of the mesh (front, curve)
const PLINTH_HI = 3.0 // taller ground floor towards the back
const ROOF = 12.9 // roof membrane
const TOP = 13.95 // top of the coping
const ROWS: [number, number][] = [
  [3.4, 5.5],
  [6.6, 8.7],
  [9.8, 11.9],
]
const OFF = { brick: 0.3, mesh: 0.38, prof: 0.4, cope: 0.5, voidIn: -0.55, wallIn: -0.25 }

type V2 = THREE.Vector2
const v2 = (x: number, z: number) => new THREE.Vector2(x, z)

interface Seg {
  face: 'front' | 'curve' | 'east' | 'back' | 'west'
  len: number
  /** turn angle at the start / end corner (convex, radians) */
  turn0: number
  turn1: number
  at: (u: number, off: number) => { p: V2; t: V2; n: V2 }
}

function line(face: Seg['face'], a: V2, b: V2): Omit<Seg, 'turn0' | 'turn1'> {
  const t = b.clone().sub(a).normalize()
  const n = v2(-t.y, t.x)
  return { face, len: a.distanceTo(b), at: (u, off) => ({ p: a.clone().addScaledVector(t, u).addScaledVector(n, off), t, n }) }
}

function arc(face: Seg['face'], c: V2, r: number, th0: number, th1: number): Omit<Seg, 'turn0' | 'turn1'> {
  return {
    face,
    len: r * (th1 - th0),
    at: (u, off) => {
      const th = th0 + u / r
      const n = v2(Math.sin(th), Math.cos(th))
      return { p: c.clone().addScaledVector(n, r + off), t: v2(Math.cos(th), -Math.sin(th)), n }
    },
  }
}

const K = v2(XK, D / 2)
const ARC_C = v2(XK - R * Math.sin(KINK), D / 2 - R * Math.cos(KINK))
const SEGS: Seg[] = [
  { ...line('front', v2(-W / 2, D / 2), K), turn0: Math.PI / 2, turn1: KINK },
  { ...arc('curve', ARC_C, R, KINK, Math.PI / 2), turn0: KINK, turn1: 0 },
  { ...line('east', v2(W / 2, ZE), v2(W / 2, -D / 2)), turn0: 0, turn1: Math.PI / 2 },
  { ...line('back', v2(W / 2, -D / 2), v2(-W / 2, -D / 2)), turn0: Math.PI / 2, turn1: Math.PI / 2 },
  { ...line('west', v2(-W / 2, -D / 2), v2(-W / 2, D / 2)), turn0: Math.PI / 2, turn1: Math.PI / 2 },
]
const seg = (f: Seg['face']) => SEGS.find((s) => s.face === f)!

/**
 * Sample a range [u0, u1] of one segment at a given offset from the façade
 * line. At convex corners the range is extended (or shortened for negative
 * offsets) so offset surfaces meet cleanly.
 */
function samples(s: Seg, u0: number, u1: number, off: number, step = 0.8) {
  const ext0 = u0 <= 1e-6 ? off * Math.tan(s.turn0 / 2) : 0
  const ext1 = u1 >= s.len - 1e-6 ? off * Math.tan(s.turn1 / 2) : 0
  const curved = s.face === 'curve'
  const k = curved ? R / (R + off) : 1 // offset arcs: convert extension to centre-line length
  const a = u0 - ext0 * k
  const b = u1 + ext1 * k
  const n = curved ? Math.max(1, Math.ceil((b - a) / step)) : 1
  const out: { p: V2; n: V2; u: number }[] = []
  for (let i = 0; i <= n; i++) {
    const u = a + ((b - a) * i) / n
    const r = s.at(u, off)
    // straight segments: extend along the tangent
    out.push({ p: r.p, n: r.n, u })
  }
  if (!curved) {
    out[0].p = s.at(u0, off).p.addScaledVector(s.at(0, 0).t, -ext0)
    out[out.length - 1].p = s.at(u1, off).p.addScaledVector(s.at(0, 0).t, ext1)
  }
  return out
}

/** Vertical surface following the façade line (outward-facing, UVs in metres). */
function ribbon(b: Builder, key: string, s: Seg, u0: number, u1: number, y0: number, y1: number, off: number, inward = false) {
  if (u1 - u0 < 1e-4 || y1 - y0 < 1e-4) return
  const pts = samples(s, u0, u1, off)
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const sgn = inward ? -1 : 1
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i]
    const B = pts[i + 1]
    const quad = [
      [A, y0],
      [B, y0],
      [B, y1],
      [A, y0],
      [B, y1],
      [A, y1],
    ] as const
    const order = inward ? [0, 2, 1, 3, 5, 4] : [0, 1, 2, 3, 4, 5]
    for (const o of order) {
      const [P, y] = quad[o]
      pos.push(P.p.x, y, P.p.y)
      nor.push(P.n.x * sgn, 0, P.n.y * sgn)
      uv.push(P.u, y)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  b.add(key, g)
}

/** Horizontal (upward-facing) band between two offsets at height y. */
function band(b: Builder, key: string, s: Seg, u0: number, u1: number, y: number, offIn: number, offOut: number) {
  const a = samples(s, u0, u1, offIn)
  const c = samples(s, u0, u1, offOut)
  const pos: number[] = []
  const uv: number[] = []
  for (let i = 0; i < a.length - 1; i++) {
    const q = [a[i], c[i], c[i + 1], a[i], c[i + 1], a[i + 1]]
    const offs = [offIn, offOut, offOut, offIn, offOut, offIn]
    q.forEach((P, k) => {
      pos.push(P.p.x, y, P.p.y)
      uv.push(P.u, offs[k])
    })
  }
  // (inner, outer, outer') winding faces +y because the outward normal is t × up
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 3).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  b.add(key, g)
}

/** Box standing on the façade line at (u, off), its local z pointing outwards. */
function onFacade(b: Builder, key: string, s: Seg, u: number, off: number, w: number, y0: number, y1: number, d: number) {
  const r = s.at(u, off)
  b.add(key, metricBox(w, y1 - y0, d), mat(r.p.x, (y0 + y1) / 2, r.p.y, Math.atan2(r.n.x, r.n.y)))
}

/* ---------------- façade programme (per face, distances along the face) ---------------- */
const OPEN_W = 1.85
const PIER_W = 0.35
const groups: Record<Seg['face'], [number, number][]> = {
  // [start, count]
  front: [
    [5.0, 4],
    [20.5, 6],
  ],
  curve: [
    [1.8, 2],
    [7.0, 3],
    [13.9, 2],
  ],
  east: [
    [1.0, 3],
    [8.6, 3],
    [15.2, 2],
  ],
  back: [
    [2.5, 4],
    [13.5, 4],
    [24.5, 4],
    [35.5, 4],
  ],
  west: [],
}

/** Plinth height along each meshed face: [from, to, height]. */
const plinthRuns: Record<Seg['face'], [number, number, number][]> = {
  front: [[0, Infinity, PLINTH]],
  curve: [[0, Infinity, PLINTH]],
  east: [
    [0, 2.6, PLINTH],
    [2.6, Infinity, PLINTH_HI],
  ],
  back: [[0, Infinity, PLINTH_HI]],
  west: [[0, Infinity, PLINTH]],
}

function openingCols(f: Seg['face']) {
  const cols: [number, number][] = []
  for (const [start, n] of groups[f]) for (let i = 0; i < n; i++) cols.push([start + i * (OPEN_W + PIER_W), start + i * (OPEN_W + PIER_W) + OPEN_W])
  return cols
}

/** Concrete frame behind the mesh: solid piers, spandrels between openings, dark interior. */
function structure(b: Builder, s: Seg) {
  const cols = openingCols(s.face)
  for (const [r0, r1raw, py] of plinthRuns[s.face]) {
    const r1 = Math.min(r1raw, s.len)
    // dark interior seen through the openings
    ribbon(b, 'voidG', s, r0, r1, py, ROOF, OFF.voidIn)
    let u = r0
    const solid = (a: number, c: number) => ribbon(b, 'concG', s, a, c, py, TOP - 0.2, 0)
    for (const [c0, c1] of cols) {
      if (c1 <= r0 || c0 >= r1) continue
      const a = Math.max(c0, r0)
      const c = Math.min(c1, r1)
      if (a > u) solid(u, a)
      // spandrels and lintels between the opening rows
      let y = py
      for (const [o0, o1] of ROWS) {
        ribbon(b, 'concG', s, a, c, y, o0, 0)
        // sill top and soffit (visible through the mesh from above / below)
        band(b, 'concG', s, a, c, o0, OFF.wallIn, 0)
        y = o1
      }
      ribbon(b, 'concG', s, a, c, y, TOP - 0.2, 0)
      u = c
    }
    if (u < r1) solid(u, r1)
  }
}

/** Expanded-metal curtain with its vertical profiles and the sill flashing. */
function meshFacade(b: Builder, s: Seg, rand: () => number) {
  for (const [r0raw, r1raw, py] of plinthRuns[s.face]) {
    // the mesh stops short of the concrete party wall (gold edge trim there)
    const r0 = s.face === 'front' && r0raw === 0 ? 0.25 : r0raw
    const r1 = s.face === 'back' && r1raw >= s.len ? s.len - 0.25 : Math.min(r1raw, s.len)
    ribbon(b, 'expMesh', s, r0, r1, py + 0.12, TOP - 0.24, OFF.mesh)
    // sill flashing over the brick plinth
    band(b, 'goldPaint', s, r0, r1, py + 0.12, OFF.wallIn, OFF.cope - 0.04)
    ribbon(b, 'goldPaint', s, r0, r1, py - 0.02, py + 0.12, OFF.cope - 0.04)
    // vertical profiles: alternating narrow / wide rhythm (≈ 0.45 m / 0.95 m)
    let u = r0
    let narrow = rand() > 0.5
    while (u <= r1 + 1e-3) {
      onFacade(b, 'goldPaint', s, Math.min(u, r1), OFF.prof, 0.1, py + 0.12, TOP - 0.24, 0.1)
      u += (narrow ? 0.45 : 0.95) + (rand() - 0.5) * 0.08
      narrow = !narrow
    }
  }
}

/** Gold coping along the whole parapet. */
function coping(b: Builder, s: Seg) {
  band(b, 'goldPaint', s, 0, s.len, TOP, OFF.wallIn - 0.08, OFF.cope)
  ribbon(b, 'goldPaint', s, 0, s.len, TOP - 0.3, TOP, OFF.cope)
  ribbon(b, 'goldPaint', s, 0, s.len, TOP - 0.12, TOP, OFF.wallIn - 0.08, true)
  // membrane upstand on the inside of the parapet
  ribbon(b, 'membrane', s, 0, s.len, ROOF, TOP - 0.12, OFF.wallIn, true)
}

/** Brick plinth with its openings / inserts (each item: [from, to, kind, y0, y1]). */
type PlinthItem = [number, number, 'lattice' | 'shutter' | 'void' | 'door', number, number]
const plinthItems: Record<Seg['face'], PlinthItem[]> = {
  front: [
    [3.0, 9.5, 'lattice', 0.45, 1.95],
    [15.5, 31.0, 'lattice', 0.45, 1.95],
  ],
  curve: [[0.5, 2.0, 'lattice', 0.45, 1.95]],
  east: [
    [3.1, 4.05, 'shutter', 0.15, 2.45],
    [4.8, 5.75, 'shutter', 0.15, 2.45],
    [6.5, 7.45, 'shutter', 0.15, 2.45],
    [8.2, 9.15, 'shutter', 0.15, 2.45],
    [10.2, 14.6, 'lattice', 0.35, 2.55],
    [15.4, 19.0, 'void', 0, 2.75],
  ],
  back: [
    [6.0, 13.0, 'void', 0, 2.75],
    [20.0, 27.0, 'void', 0, 2.75],
    [33.0, 34.0, 'door', 0, 2.1],
    [40.0, 45.5, 'lattice', 0.35, 2.55],
  ],
  west: [[24.0, 25.0, 'door', 0, 2.1]],
}

function plinth(b: Builder, s: Seg) {
  const items = plinthItems[s.face]
  for (const [r0, r1raw, py] of plinthRuns[s.face]) {
    const r1 = Math.min(r1raw, s.len)
    ribbon(b, 'brick', s, r0, r1, 0, py, OFF.brick)
    // closing strip under the sill flashing (between brick face and wall)
    band(b, 'brick', s, r0, r1, py, OFF.wallIn, OFF.brick)
  }
  for (const [a, c, kind, y0, y1] of items) {
    if (kind === 'lattice') ribbon(b, 'brickLattice', s, a, c, y0, y1, OFF.brick + 0.012)
    else if (kind === 'shutter') {
      ribbon(b, 'shutter', s, a, c, y0, y1, OFF.brick + 0.012)
      // narrow yellow frame
      ribbon(b, 'goldPaint', s, a - 0.06, a, y0, y1 + 0.06, OFF.brick + 0.02)
      ribbon(b, 'goldPaint', s, c, c + 0.06, y0, y1 + 0.06, OFF.brick + 0.02)
      ribbon(b, 'goldPaint', s, a - 0.06, c + 0.06, y1, y1 + 0.06, OFF.brick + 0.02)
    } else if (kind === 'void') {
      ribbon(b, 'voidG', s, a, c, y0 + 0.01, y1, OFF.brick + 0.012)
      ribbon(b, 'goldPaint', s, a - 0.05, c + 0.05, y1, y1 + 0.12, OFF.brick + 0.02)
    } else {
      ribbon(b, 'steel', s, a, c, y0 + 0.01, y1, OFF.brick + 0.012)
    }
  }
}

/* ---------------- roof ---------------- */

function roofOutline(off: number) {
  const pts: V2[] = []
  for (const s of SEGS) {
    const sm = samples(s, 0, s.len, off, 1.0)
    for (let i = 0; i < sm.length - 1; i++) pts.push(sm[i].p)
  }
  return pts
}

/** Vertical mesh panel between two plan points (screen around the plant area). */
function meshPanel(b: Builder, a: V2, c: V2, y0: number, y1: number) {
  const L = a.distanceTo(c)
  const g = new THREE.PlaneGeometry(L, y1 - y0)
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L, uv.getY(i) * (y1 - y0) + y0)
  const mid = a.clone().add(c).multiplyScalar(0.5)
  const ry = Math.atan2(-(c.y - a.y), c.x - a.x)
  b.add('expMesh', g, mat(mid.x, (y0 + y1) / 2, mid.y, ry))
}

function roof(b: Builder) {
  const outline = roofOutline(OFF.wallIn)
  const shape = new THREE.Shape(outline.map((p) => new THREE.Vector2(p.x, -p.y)))
  b.add('membrane', new THREE.ShapeGeometry(shape, 1), mat(0, ROOF, 0, 0, -Math.PI / 2))

  /* plant area, enclosed by a gold expanded-mesh screen with boxed posts */
  const x0 = -21
  const x1 = 3
  const z0 = -14.2
  const z1 = -2.5
  const h0 = ROOF + 0.25
  const h1 = ROOF + 2.0
  const corners = [v2(x0, z1), v2(x1, z1), v2(x1, z0), v2(x0, z0)]
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const c = corners[(i + 1) % 4]
    meshPanel(b, a, c, h0, h1)
    const L = a.distanceTo(c)
    const n = Math.max(1, Math.round(L / 4.8))
    for (let k = 0; k <= n; k++) {
      const p = a.clone().lerp(c, k / n)
      const boxed = k === 0 || k === n || k % 2 === 0
      b.box('goldPaint', boxed ? 0.34 : 0.1, h1 - ROOF + 0.12, boxed ? 0.34 : 0.1, p.x, (ROOF + h1 + 0.12) / 2, p.y)
    }
    // fine uprights every ~1.4 m, top rail and galvanised base rail
    const m = Math.round(L / 1.4)
    for (let k = 1; k < m; k++) {
      const p = a.clone().lerp(c, k / m)
      b.box('goldPaint', 0.06, h1 - h0, 0.06, p.x, (h0 + h1) / 2, p.y)
    }
    b.beam('goldPaint', V(a.x, h1 + 0.04, a.y), V(c.x, h1 + 0.04, c.y), 0.16, 0.1)
    b.beam('galv', V(a.x, ROOF + 0.12, a.y), V(c.x, ROOF + 0.12, c.y), 0.12, 0.24)
  }
  // galvanised air-handling units and ducts inside the screen
  const unit = (x: number, z: number, w: number, d: number, h: number) => {
    b.block('galv', w, h, d, x, ROOF + 0.25, z)
    b.block('galv', w + 0.1, 0.12, d + 0.1, x, ROOF + 0.25 + h, z)
    b.block('concG', w + 0.3, 0.25, d + 0.3, x, ROOF, z)
  }
  unit(-17.5, -9.5, 2.4, 6.5, 2.1)
  unit(-13.5, -9.5, 2.4, 6.5, 2.1)
  unit(-6.5, -10.5, 5.5, 2.4, 1.9)
  for (let i = 0; i < 4; i++) {
    // exhaust hoods on the units
    b.block('galv', 1.3, 0.9, 1.1, -19.2 + i * 1.9, ROOF + 2.35, -5.4)
    b.box('galv', 1.3, 0.12, 1.5, -19.2 + i * 1.9, ROOF + 3.3, -5.2, 0, -0.35)
  }
  b.beam('galv', V(-20, ROOF + 2.3, -4.2), V(1.0, ROOF + 2.3, -4.2), 1.1, 0.8)
  b.beam('galv', V(1.0, ROOF + 2.3, -4.2), V(1.0, ROOF + 2.3, -12.5), 0.9, 0.7)
  b.beam('galv', V(-11, ROOF + 1.4, -6.5), V(-11, ROOF + 1.4, -12.5), 0.8, 0.6)
  // round duct with silencer, discharging above the screen
  b.rod('galv', V(-6.0, ROOF + 2.7, -6.5), V(-6.0, ROOF + 2.7, -1.0), 0.55, 18)
  b.rod('galv', V(-6.0, ROOF + 2.7, -1.0), V(-6.0, ROOF + 2.7, 0.2), 0.68, 18)
  b.rod('galv', V(-6.0, ROOF + 0.25, -6.5), V(-6.0, ROOF + 2.2, -6.5), 0.12, 8)
  // antenna mast
  b.rod('steel', V(-1.5, ROOF, -13.2), V(-1.5, ROOF + 6.5, -13.2), 0.05, 6)

  /* glazed stair head near the curved corner */
  const gx = 11.3
  const gz = 10.0
  const gw = 4.6
  const gd = 3.4
  const gh = 2.8
  b.block('glassG', gw, gh, gd, gx, ROOF, gz)
  b.block('galv', gw + 0.2, 0.18, gd + 0.2, gx, ROOF + gh, gz)
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) b.block('steel', 0.12, gh, 0.12, gx + (sx * gw) / 2, ROOF, gz + (sz * gd) / 2)
  for (let i = 1; i < 4; i++) b.block('steel', 0.06, gh, gd + 0.02, gx - gw / 2 + (i * gw) / 4, ROOF, gz)

  /* stair / lift housing */
  b.block('white', 4.0, 3.2, 4.4, 6.6, ROOF, -11.2)
  b.block('galv', 4.2, 0.15, 4.6, 6.6, ROOF + 3.2, -11.2)
  b.block('steel', 1.1, 2.1, 0.06, 6.0, ROOF, -8.98)
  // cable tray towards the stair head
  b.beam('galv', V(3.4, ROOF + 0.2, -6), V(9.5, ROOF + 0.2, 8.3), 0.3, 0.1)
  // roof drains
  for (const [x, z] of [
    [-10, 8],
    [2, 2],
    [14, -8],
    [-22, -1],
  ])
    b.add('steel', new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), mat(x, ROOF + 0.025, z))
}

/* ---------------- site ---------------- */

function site(b: Builder) {
  b.block('concrete', 53, 0.4, 36.6, 0, -0.4, 0.1)
  // pavement along the street faces with a kerb
  for (const f of ['front', 'curve', 'east'] as const) {
    const s = seg(f)
    band(b, 'walkway', s, 0, s.len, 0.1, OFF.brick, 1.55)
    ribbon(b, 'concG', s, 0, s.len, 0, 0.12, 1.55)
  }
}

export function buildGarage(): Builder {
  const b = new Builder()
  const rand = rng(404)
  site(b)
  for (const s of SEGS) {
    plinth(b, s)
    coping(b, s)
    if (s.face === 'west') {
      // raw concrete party wall, gold edge trims where the mesh stops
      ribbon(b, 'concRaw', s, 0, s.len, PLINTH, TOP - 0.12, 0)
      band(b, 'brick', s, 0, s.len, PLINTH, OFF.wallIn, OFF.brick)
      continue
    }
    structure(b, s)
    meshFacade(b, s, rand)
  }
  // gold edge trims where the mesh stops at the party wall, and on the corners
  const top = TOP - 0.2
  b.block('goldPaint', 0.27, top - PLINTH, 0.5, -W / 2 + 0.135, PLINTH, D / 2 + 0.25)
  b.block('goldPaint', 0.27, top - PLINTH_HI, 0.5, -W / 2 + 0.135, PLINTH_HI, -D / 2 - 0.25)
  b.block('goldPaint', 0.2, top - PLINTH, 0.2, K.x + 0.06, PLINTH, K.y + OFF.prof)
  b.block('goldPaint', 0.22, top - PLINTH_HI, 0.22, W / 2 + OFF.prof, PLINTH_HI, -D / 2 - OFF.prof)
  // step in the plinth / sill flashing on the east face
  onFacade(b, 'goldPaint', seg('east'), 2.6, 0.1, 0.06, PLINTH, PLINTH_HI + 0.12, 0.8)
  roof(b)
  return b
}
