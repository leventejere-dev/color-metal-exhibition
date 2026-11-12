/**
 * Geometry of one quarter furniture module (module frame: bisector = +z,
 * radial joint faces at θ = ±45°). All four modules share this geometry; only
 * the cladding finishes of their three facets differ.
 *
 * Construction concept (conceptual, not engineered):
 *  - welded / bolted 40 × 40 mm aluminium profile frame (base ring, top ring,
 *    posts at every facet edge, radial side frames, bisector rib),
 *  - aluminium-honeycomb sandwich tabletop with a light solid-surface finish
 *    and brass-anodised aluminium edge lipping on all edges,
 *  - thin decorative metal sheets (brass, copper, patina, zinc, anthracite
 *    aluminium) bonded to 4 mm aluminium composite panels, hung on rails,
 *  - finished radial side panels (champagne brushed aluminium composite with a
 *    black seal band at the joint),
 *  - recessed Ø 50 mm swivel casters in niches of the dark toe-kick skirt.
 */
import * as THREE from 'three'
import { Builder, V } from '../../lib/geo'
import { CASTERS, TABLE } from '../layout'

const DEG = Math.PI / 180
const { facets, rTop, rBottom, y0, y1 } = TABLE.body
export const HALF = Math.PI / facets // 15°
export const BOUND = Math.PI / 4 // ±45°
const J = TABLE.joint

export const at = (th: number, r: number, y: number) => V(Math.sin(th) * r, y, Math.cos(th) * r)
/** radius of the facet vertices at height y (tapered body) */
export const rAt = (y: number) => rBottom + ((y - y0) / (y1 - y0)) * (rTop - rBottom)
/** outward normal of a radial joint face (sign +1: θ = +45°, −1: θ = −45°) */
export const sideOut = (sign: number) => V(Math.cos(BOUND) * sign, 0, -Math.sin(BOUND))
/** point on a radial joint face (already set back by half the joint) */
export const sidePt = (sign: number, r: number, y: number) => at(sign * BOUND, r, y).addScaledVector(sideOut(sign), -J)
/** tangent at a boundary vertex pointing into the module */
const tIn = (sign: number) => V(-sign * Math.cos(BOUND), 0, Math.sin(BOUND))

/** Quad (a, b, c, d) whose face points along n. UVs: u along a→b (m), v along a→d (m). */
export function quadFacing(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, n: THREE.Vector3) {
  const nn = V().subVectors(b, a).cross(V().subVectors(c, a))
  const flip = nn.dot(n) < 0
  const pts = flip ? [a, c, b, a, d, c] : [a, b, c, a, c, d]
  const w = a.distanceTo(b)
  const h = a.distanceTo(d)
  const uvOf = (p: THREE.Vector3) => (p === a ? [0, 0] : p === b ? [w, 0] : p === c ? [w, h] : [0, h])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(pts.flatMap(uvOf), 2))
  g.computeVertexNormals()
  return g
}

type P2 = [number, number]
/** Move each edge of a convex polygon inward by its own distance (edge i: pts[i] → pts[i+1]). */
export function insetPolygon(pts: P2[], insets: number[], centre: P2): P2[] {
  const n = pts.length
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % n]
    const len = Math.hypot(q[0] - p[0], q[1] - p[1])
    const d: P2 = [(q[0] - p[0]) / len, (q[1] - p[1]) / len]
    let nr: P2 = [-d[1], d[0]]
    if (nr[0] * (centre[0] - p[0]) + nr[1] * (centre[1] - p[1]) < 0) nr = [-nr[0], -nr[1]]
    return { p: [p[0] + nr[0] * insets[i], p[1] + nr[1] * insets[i]] as P2, d }
  })
  return lines.map((L, i) => {
    const K = lines[(i - 1 + n) % n]
    const den = K.d[0] * L.d[1] - K.d[1] * L.d[0]
    const t = ((L.p[0] - K.p[0]) * L.d[1] - (L.p[1] - K.p[1]) * L.d[0]) / den
    return [K.p[0] + K.d[0] * t, K.p[1] + K.d[1] * t] as P2
  })
}

/** Module footprint at height y: apex chord, two radial sides, three facets. */
export function footprint(y: number, apexR = TABLE.bodyNotch): P2[] {
  const p = (v: THREE.Vector3): P2 => [v.x, v.z]
  const r = rAt(y)
  return [p(sidePt(-1, apexR, y)), p(sidePt(-1, r, y)), p(at(-HALF, r, y)), p(at(HALF, r, y)), p(sidePt(1, r, y)), p(sidePt(1, apexR, y))]
}
const CENTRE: P2 = [0, 0.7]

/** Vertical wall following a closed 2D outline (outward-facing). */
function wall(b: Builder, key: string, pts: P2[], ya: number, yb: number, skip?: (i: number, a: P2, c: P2) => [number, number][] | null) {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const c = pts[(i + 1) % pts.length]
    const mid: P2 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]
    const n = V(mid[0] - CENTRE[0], 0, mid[1] - CENTRE[1])
    const d = V(c[0] - a[0], 0, c[1] - a[1])
    const nn = V(-d.z, 0, d.x)
    if (nn.dot(n) < 0) nn.negate()
    const pieces = skip?.(i, a, c) ?? [[0, 1]]
    for (const [t0, t1] of pieces) {
      const pa = V(a[0] + (c[0] - a[0]) * t0, 0, a[1] + (c[1] - a[1]) * t0)
      const pc = V(a[0] + (c[0] - a[0]) * t1, 0, a[1] + (c[1] - a[1]) * t1)
      b.add(key, quadFacing(pa.clone().setY(ya), pc.clone().setY(ya), pc.clone().setY(yb), pa.clone().setY(yb), nn))
    }
  }
}

/** Horizontal sector-like slab from a 2D outline (x, z), extruded upwards. */
export function slab(pts: P2[], yBottom: number, thickness: number) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 1 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, yBottom, 0)
  return g
}

/** Outline of the quarter tabletop: outer arc, two radial edges (set back by J), concave apex notch. */
export function topOutline(R = TABLE.radius, notch = TABLE.notch, inset = 0): P2[] {
  const pts: P2[] = []
  const off = J + inset
  const aOuter = BOUND - Math.asin(off / R)
  const aNotch = BOUND - Math.asin(Math.min(0.99, off / notch))
  const N = 48
  for (let i = 0; i <= N; i++) {
    const a = -aOuter + (2 * aOuter * i) / N
    pts.push([Math.sin(a) * R, Math.cos(a) * R])
  }
  for (let i = 0; i <= 10; i++) {
    const a = aNotch - (2 * aNotch * i) / 10
    pts.push([Math.sin(a) * notch, Math.cos(a) * notch])
  }
  return pts
}

export interface ModuleFinish {
  clad: [string, string, string] // facets j = −1, 0, +1
  door: boolean // centre facet is a compartment door
}

/** Exterior body: cladding, joint strips with LED reveals, rim bands, finished side panels, skirt. */
export function buildBody(f: ModuleFinish) {
  const body = new Builder()
  const sideP = new Builder() // +45° side panel (hidden in the cutaway)
  const clad = new Builder() // outer cladding (hidden in the cutaway)
  const strip = 0.034
  const vy0 = y0 + 0.006
  const vy1 = y1 - 0.006

  for (let j = -1; j <= 1; j++) {
    const th = j * 2 * HALF
    const key = f.clad[j + 1]
    const inset = (strip / 2 + 0.003) / rTop
    const insetB = (strip / 2 + 0.003) / rBottom
    const bl = at(th - HALF + insetB, rBottom, vy0)
    const br = at(th + HALF - insetB, rBottom, vy0)
    const tr = at(th + HALF - inset, rTop, vy1)
    const tl = at(th - HALF + inset, rTop, vy1)
    const n = at(th, 1, 0)
    if (!(f.door && j === 0)) {
      clad.add(key, quadFacing(bl, br, tr, tl, n))
    } else {
      const k = 0.018
      const lerp = (a: THREE.Vector3, c: THREE.Vector3, t: number) => a.clone().lerp(c, t)
      const dbl = lerp(lerp(bl, tl, 0.06), lerp(br, tr, 0.06), k * 2)
      const dbr = lerp(lerp(bl, tl, 0.06), lerp(br, tr, 0.06), 1 - k * 2)
      const dtl = lerp(lerp(bl, tl, 0.97), lerp(br, tr, 0.97), k * 2)
      const dtr = lerp(lerp(bl, tl, 0.97), lerp(br, tr, 0.97), 1 - k * 2)
      const out = n.clone().multiplyScalar(0.004)
      clad.add('rim', quadFacing(bl, br, tr, tl, n))
      clad.add(key, quadFacing(dbl.add(out), dbr.add(out), dtr.add(out), dtl.add(out), n))
      const pb = lerp(lerp(bl, tl, 0.42), lerp(br, tr, 0.42), 0.86).add(n.clone().multiplyScalar(0.016))
      const pt = lerp(lerp(bl, tl, 0.72), lerp(br, tr, 0.72), 0.86).add(n.clone().multiplyScalar(0.016))
      clad.beam('strip', pb, pt, 0.014, 0.012, n)
      clad.beam('led', lerp(bl, br, 0.08).add(V(0, 0.02, 0)).add(n.clone().multiplyScalar(0.006)), lerp(bl, br, 0.92).add(V(0, 0.02, 0)).add(n.clone().multiplyScalar(0.006)), 0.006, 0.004, n)
    }
  }

  // vertical brass strips with LED glow: full strips at the inner facet edges,
  // half strips at the joints (each module carries its own half)
  for (const te of [-HALF, HALF]) {
    const radial = at(te, 1, 0)
    const sb = at(te, rBottom + 0.004, y0)
    const st = at(te, rTop + 0.004, y1)
    body.beam('led', sb.clone().sub(radial.clone().multiplyScalar(0.006)), st.clone().sub(radial.clone().multiplyScalar(0.006)), strip + 0.012, 0.01, radial)
    body.beam('strip', sb, st, strip, 0.012, radial)
  }
  const hw = strip / 2 - J
  for (const sign of [-1, 1]) {
    const radial = at(sign * BOUND, 1, 0)
    const shift = tIn(sign).multiplyScalar(J + hw / 2)
    const sb = at(sign * BOUND, rBottom + 0.004, y0).add(shift)
    const st = at(sign * BOUND, rTop + 0.004, y1).add(shift)
    body.beam('led', sb.clone().sub(radial.clone().multiplyScalar(0.006)), st.clone().sub(radial.clone().multiplyScalar(0.006)), hw + 0.004, 0.01, radial)
    body.beam('strip', sb, st, hw, 0.012, radial)
    if (sign === 1) {
      // hex-key access to the quarter-turn cam latch, flush in the joint strip
      const y = 0.935
      const p = at(BOUND, rAt(y) + 0.011, y).add(tIn(1).multiplyScalar(J + hw / 2))
      const g = new THREE.CylinderGeometry(0.0045, 0.0045, 0.003, 14)
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), radial)))
      g.translate(p.x, p.y, p.z)
      body.add('hwDark', g)
    }
  }

  // rim bands: brass top band and dark bottom sill, around the facets and along both joints
  const band = (key: string, y: number, h: number, depth: number, rOff: number) => {
    const r = rAt(y) + rOff
    const vs = [-BOUND, -HALF, HALF, BOUND].map((t) => at(t, r, y))
    vs[0].add(tIn(-1).multiplyScalar(J))
    vs[3].add(tIn(1).multiplyScalar(J))
    for (let i = 0; i < 3; i++) body.beam(key, vs[i], vs[i + 1], depth, h)
    for (const sign of [-1, 1]) {
      const a = sidePt(sign, TABLE.bodyNotch, y).addScaledVector(sideOut(sign), -depth / 2 + 0.0005)
      const c = sidePt(sign, r - depth / 2, y).addScaledVector(sideOut(sign), -depth / 2 + 0.0005)
      body.beam(key, a, c, depth, h)
    }
  }
  band('strip', y1 + 0.004, 0.016, 0.024, 0.0)
  band('rim', y0 - 0.002, 0.016, 0.02, 0.0)

  // finished radial side panels (champagne aluminium composite, black seal band at the joint)
  for (const sign of [-1, 1]) {
    const tgt = sign === 1 ? sideP : body
    const out = sideOut(sign)
    const rIn = TABLE.bodyNotch
    const rb = rAt(y0) - 0.006
    const rt = rAt(y1) - 0.006
    const seal = 0.026
    const ya = y0 + 0.006
    const yb = y1 - 0.004
    tgt.add('side', quadFacing(sidePt(sign, rIn, ya), sidePt(sign, rb - seal, ya), sidePt(sign, rt - seal, yb), sidePt(sign, rIn, yb), out))
    tgt.add('seal', quadFacing(sidePt(sign, rb - seal, ya), sidePt(sign, rb, ya), sidePt(sign, rt, yb), sidePt(sign, rt - seal, yb), out))
    // back face of the panel (seen in the cutaway)
    const inn = out.clone().multiplyScalar(-0.006)
    tgt.add('acm', quadFacing(sidePt(sign, rIn, ya).add(inn), sidePt(sign, rb, ya).add(inn), sidePt(sign, rt, yb).add(inn), sidePt(sign, rIn, yb).add(inn), out.clone().negate()))
  }
  // concave apex face (around the pivot spigot)
  {
    const r = TABLE.bodyNotch
    const a0 = BOUND - Math.asin(J / r)
    const N = 8
    for (let i = 0; i < N; i++) {
      const ta = -a0 + (2 * a0 * i) / N
      const tb = -a0 + (2 * a0 * (i + 1)) / N
      const tm = (ta + tb) / 2
      body.add('side', quadFacing(at(ta, r, y0 + 0.006), at(tb, r, y0 + 0.006), at(tb, r, y1 - 0.004), at(ta, r, y1 - 0.004), at(tm, -1, 0)))
    }
  }

  // underside panel and dark toe-kick skirt with caster niches
  const under: P2[] = footprint(y0)
  const apex: P2[] = []
  {
    const r = TABLE.bodyNotch
    const a0 = BOUND - Math.asin(J / r)
    for (let i = 0; i <= 8; i++) {
      const a = a0 - (2 * a0 * i) / 8
      apex.push([Math.sin(a) * r, Math.cos(a) * r])
    }
  }
  const outline = [...under.slice(1, 5), ...apex]
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)))
  const ug = new THREE.ShapeGeometry(shape)
  ug.rotateX(Math.PI / 2)
  ug.translate(0, y0 - 0.003, 0)
  body.add('plinth', ug)

  const sk = insetPolygon(footprint(y0, 0.16), [TABLE.skirtSideInset, TABLE.skirtInset, TABLE.skirtInset, TABLE.skirtInset, TABLE.skirtSideInset, 0.05], CENTRE)
  const niches: { i: number; t: number }[] = []
  for (const c of CASTERS) {
    if (c.r < 0.6) continue
    const p: P2 = [Math.sin(c.deg * DEG) * c.r, Math.cos(c.deg * DEG) * c.r]
    // nearest skirt edge
    let best = { i: 0, t: 0, d: 1e9 }
    for (let i = 0; i < sk.length; i++) {
      const a = sk[i]
      const b2 = sk[(i + 1) % sk.length]
      const dx = b2[0] - a[0]
      const dz = b2[1] - a[1]
      const L2 = dx * dx + dz * dz
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2))
      const d = Math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1])
      if (d < best.d) best = { i, t, d }
    }
    niches.push(best)
  }
  const ya = TABLE.floorGap
  const yb = y0 - 0.003
  wall(body, 'plinth', sk, ya, yb, (i, a, c) => {
    const L = Math.hypot(c[0] - a[0], c[1] - a[1])
    const hs = niches.filter((n) => n.i === i).map((n) => n.t)
    if (!hs.length) return null
    const w = 0.065 / L
    const pieces: [number, number][] = []
    let t = 0
    for (const h of hs.sort()) {
      pieces.push([t, h - w])
      // niche: back wall and cheeks, set 8 cm into the skirt
      const d: P2 = [(c[0] - a[0]) / L, (c[1] - a[1]) / L]
      let nr: P2 = [-d[1], d[0]]
      const mid: P2 = [a[0] + (c[0] - a[0]) * h, a[1] + (c[1] - a[1]) * h]
      if (nr[0] * (CENTRE[0] - mid[0]) + nr[1] * (CENTRE[1] - mid[1]) < 0) nr = [-nr[0], -nr[1]]
      const p0: P2 = [a[0] + (c[0] - a[0]) * (h - w), a[1] + (c[1] - a[1]) * (h - w)]
      const p1: P2 = [a[0] + (c[0] - a[0]) * (h + w), a[1] + (c[1] - a[1]) * (h + w)]
      const q0: P2 = [p0[0] + nr[0] * 0.08, p0[1] + nr[1] * 0.08]
      const q1: P2 = [p1[0] + nr[0] * 0.08, p1[1] + nr[1] * 0.08]
      const v = (q: P2, y: number) => V(q[0], y, q[1])
      const outN = V(-nr[0], 0, -nr[1])
      body.add('niche', quadFacing(v(q0, ya), v(q1, ya), v(q1, yb), v(q0, yb), outN))
      body.add('niche', quadFacing(v(p0, ya), v(q0, ya), v(q0, yb), v(p0, yb), V(d[0], 0, d[1])))
      body.add('niche', quadFacing(v(q1, ya), v(p1, ya), v(p1, yb), v(q1, yb), V(-d[0], 0, -d[1])))
      t = h + w
    }
    pieces.push([t, 1])
    return pieces
  })

  return { body, sideP, clad }
}

/** Tabletop slab, its shadow-gap reveal and the engraved tick ring. */
export function buildTop() {
  const top = slab(topOutline(), TABLE.topY0, TABLE.height - TABLE.topY0)
  const reveal = new Builder()
  reveal.add('reveal', slab(topOutline(TABLE.bodyRadius - 0.06, 0.14, 0.05), y1 - 0.001, TABLE.topY0 - y1 + 0.002))
  const ticks = new Builder()
  for (let d = -40; d <= 40; d += 5) {
    const a = d * DEG
    const major = d % 30 === 0
    const len = major ? 0.03 : 0.016
    const r = TABLE.radius - 0.012 - len / 2
    ticks.box('ticks', major ? 0.004 : 0.0022, 0.0012, len, Math.sin(a) * r, TABLE.height + 0.0006, Math.cos(a) * r, a)
  }
  return { top, reveal, ticks }
}

/** Alignment pins / bushings, cam latch and keeper on the two joint faces. */
export function buildHardware() {
  const b = new Builder()
  const orient = (g: THREE.BufferGeometry, axis: THREE.Vector3, p: THREE.Vector3) => {
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), axis)))
    g.translate(p.x, p.y, p.z)
    return g
  }
  for (const r of [0.45, 1.0]) {
    const y = 0.5
    // +45° face: conical alignment pin on a flange
    const out = sideOut(1)
    const p = sidePt(1, r, y)
    b.add('hw', orient(new THREE.CylinderGeometry(0.02, 0.02, 0.003, 20), out, p.clone().addScaledVector(out, 0.0015)))
    b.add('hw', orient(new THREE.CylinderGeometry(0.004, 0.011, 0.03, 16), out, p.clone().addScaledVector(out, 0.016)))
    // −45° face: bushing
    const out2 = sideOut(-1)
    const q = sidePt(-1, r, y)
    b.add('hw', orient(new THREE.CylinderGeometry(0.021, 0.021, 0.003, 20), out2, q.clone().addScaledVector(out2, 0.0015)))
    b.add('hwDark', orient(new THREE.CylinderGeometry(0.0125, 0.0125, 0.0036, 16), out2, q.clone().addScaledVector(out2, 0.0016)))
  }
  // quarter-turn cam latch (+45°) and keeper plate (−45°) just below the tabletop, near the outer edge
  {
    const y = 0.935
    const r = 1.19
    const out = sideOut(1)
    const p = sidePt(1, r, y)
    const housing = new THREE.BoxGeometry(0.07, 0.036, 0.008)
    const radial = at(BOUND, 1, 0)
    const zAx = radial.clone().cross(V(0, 1, 0))
    const m = new THREE.Matrix4().makeBasis(radial, V(0, 1, 0), zAx).setPosition(p.clone().addScaledVector(out, 0.004))
    housing.applyMatrix4(m)
    b.add('hwDark', housing)
    const hook = new THREE.BoxGeometry(0.03, 0.012, 0.012)
    hook.applyMatrix4(new THREE.Matrix4().makeBasis(radial, V(0, 1, 0), zAx).setPosition(p.clone().addScaledVector(out, 0.012)))
    b.add('hw', hook)
    const out2 = sideOut(-1)
    const q = sidePt(-1, r, y)
    const radial2 = at(-BOUND, 1, 0)
    const keeper = new THREE.BoxGeometry(0.06, 0.032, 0.004)
    keeper.applyMatrix4(new THREE.Matrix4().makeBasis(radial2, V(0, 1, 0), radial2.clone().cross(V(0, 1, 0))).setPosition(q.clone().addScaledVector(out2, 0.002)))
    b.add('hw', keeper)
  }
  return b
}

/** Lightweight aluminium profile frame and cladding rails (shown in the construction view). */
export function buildFrame() {
  const b = new Builder()
  const P = 0.04
  const yb = y0 + 0.03
  const yt = y1 - 0.035
  const ring = (y: number) => insetPolygon(footprint(y, 0.16), [0.045, 0.06, 0.06, 0.06, 0.045, 0.04], CENTRE)
  const rb = ring(yb)
  const rt = ring(yt)
  const v = (p: P2, y: number) => V(p[0], y, p[1])
  for (let i = 0; i < rb.length; i++) {
    const k = (i + 1) % rb.length
    b.beam('frame', v(rb[i], yb), v(rb[k], yb), P, P)
    b.beam('frame', v(rt[i], yt), v(rt[k], yt), P, P)
    b.beam('frame', v(rb[i], yb), v(rt[i], yt), P, P, at(0, 1, 0))
  }
  // bisector ribs (bottom and under the top) and a cross member at mid-radius
  const apexMid = (r: P2[]): P2 => [(r[5][0] + r[0][0]) / 2, (r[5][1] + r[0][1]) / 2]
  const arcMid = (r: P2[]): P2 => [(r[2][0] + r[3][0]) / 2, (r[2][1] + r[3][1]) / 2]
  b.beam('frame', v(apexMid(rb), yb), v(arcMid(rb), yb), P, P)
  b.beam('frame', v(apexMid(rt), yt), v(arcMid(rt), yt), P, P)
  const cross = (y: number, ringPts: P2[], z: number) => {
    // intersect z = const with the two side edges (0→1 and 5→4)
    const along = (a: P2, c: P2): P2 => {
      const t = (z - a[1]) / (c[1] - a[1])
      return [a[0] + (c[0] - a[0]) * t, z]
    }
    const L = along(ringPts[0], ringPts[1])
    const R = along(ringPts[5], ringPts[4])
    b.beam('frame', v(L, y), v(R, y), P, P)
    return [L, R]
  }
  const [cl, cr] = cross(yb, rb, 0.66)
  const [tl, tr] = cross(yt, rt, 0.66)
  b.beam('frame', v(cl, yb), v(tl, yt), P, P, at(0, 1, 0))
  b.beam('frame', v(cr, yb), v(tr, yt), P, P, at(0, 1, 0))
  // diagonal braces in the two side frames
  b.beam('frame', v(cl, yb + 0.02), v(rt[1], yt - 0.02), 0.03, 0.03)
  b.beam('frame', v(cr, yb + 0.02), v(rt[4], yt - 0.02), 0.03, 0.03)
  // caster mounting plates
  for (const c of CASTERS) {
    const a = c.deg * DEG
    b.box('frame', 0.1, 0.008, 0.1, Math.sin(a) * c.r, y0 - 0.006, Math.cos(a) * c.r, a)
  }
  // horizontal hanging rails behind the cladding
  for (const y of [0.36, 0.72]) {
    const r = rAt(y) - 0.022
    const vs = [-BOUND, -HALF, HALF, BOUND].map((t) => at(t, r, y))
    vs[0].add(tIn(-1).multiplyScalar(0.03))
    vs[3].add(tIn(1).multiplyScalar(0.03))
    for (let i = 0; i < 3; i++) b.beam('frame', vs[i], vs[i + 1], 0.02, 0.03)
  }
  return b
}

/** Cladding cut at mid-height for the cutaway: lower panels plus the visible layer build-up. */
export function buildCutCladding(f: ModuleFinish) {
  const b = new Builder()
  const strip = 0.034
  const yc = 0.42
  const vy0 = y0 + 0.006
  for (let j = -1; j <= 1; j++) {
    const th = j * 2 * HALF
    const key = f.door && j === 0 ? 'rim' : f.clad[j + 1]
    const rc = rAt(yc)
    const insetB = (strip / 2 + 0.003) / rBottom
    const insetC = (strip / 2 + 0.003) / rc
    const bl = at(th - HALF + insetB, rBottom, vy0)
    const br = at(th + HALF - insetB, rBottom, vy0)
    const tr = at(th + HALF - insetC, rc, yc)
    const tl = at(th - HALF + insetC, rc, yc)
    const n = at(th, 1, 0)
    b.add(key, quadFacing(bl, br, tr, tl, n))
    // layer build-up along the cut: 1 mm metal sheet (drawn thicker) on a 4 mm composite core
    b.beam(key, tl.clone().add(V(0, 0.002, 0)), tr.clone().add(V(0, 0.002, 0)), 0.004, 0.004, V(0, 1, 0))
    b.beam('acm', tl.clone().add(V(0, 0.002, 0)).addScaledVector(n, -0.006), tr.clone().add(V(0, 0.002, 0)).addScaledVector(n, -0.006), 0.008, 0.004, V(0, 1, 0))
  }
  return b
}

/** Honeycomb sandwich visible on the opened tabletop edge (+45° side) in the cutaway. */
export function buildHoneycombEdge() {
  const r0 = TABLE.notch + 0.01
  const r1 = TABLE.radius - 0.01
  const out = sideOut(1)
  const ya = TABLE.topY0 + 0.002
  const yb = TABLE.height - 0.002
  const g = quadFacing(
    sidePt(1, r0, ya).addScaledVector(out, 0.0008),
    sidePt(1, r1, ya).addScaledVector(out, 0.0008),
    sidePt(1, r1, yb).addScaledVector(out, 0.0008),
    sidePt(1, r0, yb).addScaledVector(out, 0.0008),
    out,
  )
  // u in metres along the edge, v 0…1 across the slab
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) / (yb - ya))
  return g
}

/** Invisible quarter cylinder used to keep the camera out of the furniture. */
export function colliderGeometry() {
  const g = new THREE.CylinderGeometry(TABLE.radius + 0.04, TABLE.radius + 0.04, TABLE.height + 0.02, 12, 1, false, -BOUND, 2 * BOUND)
  g.translate(0, (TABLE.height + 0.02) / 2, 0)
  return g
}
