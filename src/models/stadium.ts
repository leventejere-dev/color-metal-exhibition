/**
 * MODEL A — Sepsi OSK Stadium, Sfântu Gheorghe.
 *
 * Built from the supplied photographs. Modelling specification (real metres):
 *  - HALF-SECTION (as requested): cut along the pitch centre line, keeping the
 *    main stand, the zinc facade and the near halves of the end stands.
 *  - Rectangular single-tier bowl around a 105 × 68 m pitch; four separate
 *    stands with dark cladding, exposed steel frames and flat dark roofs whose
 *    leading edges carry a catwalk with floodlights.
 *  - Along the main long side (+z): a low white pavilion with tapered piers and
 *    arched corner pavilions, wrapped by a broad sloped titanium-zinc eave band.
 *  - Zinc landmarks along that facade (left → right as seen from the front):
 *    corner spire A on an arched pavilion · the bell-shaped "wave" in which the
 *    eave band rises to the upper band · three stepped gables of increasing
 *    height · spire B with four small pinnacles · truncated stepped tower C.
 *  - Above the pavilion: dark glazed facade topped by a second zinc band.
 * Approximations: overall dimensions, stand depths, roof heights, seat colour,
 * the three non-photographed elevations and the exact count/spacing of piers.
 */
import * as THREE from 'three'
import { MODEL_LENGTH } from './common'
import { Builder, V, facet, frustum, loft, mat, metricBox, opening, rectRing, wallWithOpenings, extrude } from '../lib/geo'

export const STADIUM_SIZE = { length: 150, depth: 71.5, scale: MODEL_LENGTH / 150 }

const PITCH = { w: 113, d: 76 } // incl. 4 m run-off
const FRONT_Z = 53 // back face of the main stand (= pitch half-depth 38 + stand depth 15)
const PAV = { z0: 53, z1: 67, h: 7.4 } // pavilion depth range & eave height
const BAND = { y0: 7.4, y1: 10.6, out: 3.2 } // lower zinc band

/** Tiered square spire (stacked frustums separated by dark shadow gaps). */
function tieredSpire(
  b: Builder,
  cx: number,
  cz: number,
  baseY: number,
  opts: { skirt: number; skirtTop: number; skirtH: number; body: number; height: number; tiers: number; truncated?: number; exp?: number; rotY?: number },
) {
  const m = mat(cx, 0, cz, opts.rotY ?? 0)
  const add = (key: string, g: THREE.BufferGeometry) => b.add(key, g, m)
  // flared skirt (pagoda-like eave)
  const y1 = baseY + opts.skirtH
  add('zinc', frustum(opts.skirt, opts.skirt, opts.skirtTop, opts.skirtTop, baseY, y1))
  add('zincDark', frustum(opts.skirtTop * 0.96, opts.skirtTop * 0.96, opts.skirtTop * 0.96, opts.skirtTop * 0.96, y1, y1 + 0.35, 0, 0, false))
  // tiers
  const top = baseY + opts.height
  const yStart = y1 + 0.35
  const exp = opts.exp ?? 1.35
  const endW = opts.truncated ?? 0.05
  const hw = (t: number) => endW + (opts.body - endW) * Math.pow(Math.max(0, 1 - t), exp)
  const ys: number[] = []
  // tiers get shorter towards the top
  let acc = 0
  const weights: number[] = []
  for (let i = 0; i < opts.tiers; i++) weights.push(1 - i * (0.45 / opts.tiers))
  const wsum = weights.reduce((a, c) => a + c, 0)
  ys.push(yStart)
  for (let i = 0; i < opts.tiers; i++) {
    acc += weights[i] / wsum
    ys.push(yStart + acc * (top - yStart))
  }
  for (let i = 0; i < opts.tiers; i++) {
    const t0 = (ys[i] - yStart) / (top - yStart)
    const t1 = (ys[i + 1] - yStart) / (top - yStart)
    const wb = hw(t0) + 0.32
    const wt = hw(t1)
    const gap = Math.min(0.32, (ys[i + 1] - ys[i]) * 0.12)
    add('zinc', frustum(wb, wb, wt, wt, ys[i], ys[i + 1] - gap, 0, 0, true))
    if (i < opts.tiers - 1) add('zincDark', frustum(wt * 0.97, wt * 0.97, wt * 0.97, wt * 0.97, ys[i + 1] - gap, ys[i + 1], 0, 0, false))
  }
  if (!opts.truncated) {
    // slender finial
    b.add('zinc', new THREE.CylinderGeometry(0.03, 0.12, 2.2, 6), mat(cx, top + 1.0, cz))
  }
  return top
}

/** Steep stepped gable (Sepsi "triple gable"): slate infill framed by three tiers of zinc roof planes. */
function steppedGable(b: Builder, cx: number, zFront: number, baseY: number, W: number, H: number, depth: number) {
  const hw = W / 2
  const apexY = baseY + H
  const zf = zFront
  const zb = zFront - depth
  const capH = H * 0.2
  const bodyTop = apexY - capH
  const capHalf = hw * (capH / H) * 1.3
  const tiers = 3
  const kick = 0.75
  const board = 1.05 // visible width of the zinc bargeboard (in the gable plane)
  const half = (t: number) => hw - t * (hw - capHalf)
  // slate infill (front triangle), slightly recessed
  facet(b, 'slate', [V(cx - hw + board, baseY, zf - 0.35), V(cx + hw - board, baseY, zf - 0.35), V(cx + capHalf * 0.5, bodyTop, zf - 0.35), V(cx - capHalf * 0.5, bodyTop, zf - 0.35)], {
    hint: V(0, 0, 1),
  })
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers
    const t1 = (i + 1) / tiers
    const y0 = baseY + t0 * (bodyTop - baseY)
    const y1 = baseY + t1 * (bodyTop - baseY) - 0.22
    const hb = half(t0) + kick
    const ht = half(t1)
    for (const side of [-1, 1]) {
      const xb = cx + side * hb
      const xt = cx + side * ht
      // stepped roof plane running back to the facade
      const pts = side < 0 ? [V(xb, y0, zf), V(xb, y0, zb), V(xt, y1, zb), V(xt, y1, zf)] : [V(xb, y0, zb), V(xb, y0, zf), V(xt, y1, zf), V(xt, y1, zb)]
      facet(b, 'zinc', pts, { hint: V(side, 0.25, 0), thickness: 0.25 })
      // front bargeboard: a thick zinc fascia along the rake
      const inward = V(-side, 0, 0)
      const a = V(xb, y0, zf + 0.35).add(inward.clone().multiplyScalar(board * 0.42))
      const c = V(xt, y1, zf + 0.35).add(inward.clone().multiplyScalar(board * 0.42))
      b.beam('zinc', a, c, board, 0.95, V(0, 0, 1))
      // dark shadow gap under the next tier
      if (i < tiers - 1) b.beam('zincDark', V(xt, y1 + 0.02, zf + 0.3), V(xt - side * 0.6, y1 + 0.02, zf + 0.3), 0.18, 0.7, V(0, 0, 1))
    }
  }
  // trapezoidal cap with a dark band
  const capD = Math.min(depth * 0.55, 5)
  const cz = zf - capD / 2 + 0.6
  b.add('zinc', frustum(capHalf + 0.7, capD / 2, capHalf * 0.6, capD / 2 - 0.25, bodyTop - 0.1, apexY - capH * 0.45, cx, cz))
  b.add('zincDark', frustum(capHalf * 0.55, capD / 2 - 0.35, capHalf * 0.55, capD / 2 - 0.35, apexY - capH * 0.45, apexY - capH * 0.38, cx, cz, false))
  b.add('zinc', frustum(capHalf * 0.66, capD / 2 - 0.25, capHalf * 0.42, capD / 2 - 0.5, apexY - capH * 0.38, apexY, cx, cz))
}

/** Sloped zinc eave band following a height profile along x (supports the "wave"). */
function eaveBand(
  b: Builder,
  x0: number,
  x1: number,
  zFace: number,
  profile: (x: number) => number,
  opts: { height: number; out: number; soffit: number; step?: number },
) {
  const step = opts.step ?? 1.0
  const xs: number[] = []
  for (let x = x0; x < x1; x += step) xs.push(x)
  xs.push(x1)
  const pos: number[] = []
  const uv: number[] = []
  const sPos: number[] = []
  const tPos: number[] = []
  let arc = 0
  const pt = (x: number) => {
    const yb = profile(x)
    return {
      bot: V(x, yb, zFace + opts.out),
      top: V(x, yb + opts.height, zFace + 0.2),
      back: V(x, yb, zFace),
      backTop: V(x, yb + opts.height, zFace),
    }
  }
  let prev = pt(xs[0])
  for (let i = 1; i < xs.length; i++) {
    const cur = pt(xs[i])
    const seg = Math.hypot(cur.bot.x - prev.bot.x, cur.bot.y - prev.bot.y)
    const a0 = arc
    arc += seg
    // outer sloped face (normals computed later)
    for (const p of [prev.bot, cur.bot, cur.top, prev.bot, cur.top, prev.top]) pos.push(p.x, p.y, p.z)
    const sl = opts.height + 0.5
    uv.push(a0, 0, arc, 0, arc, sl, a0, 0, arc, sl, a0, sl)
    // soffit (underside) back to the facade
    for (const p of [prev.bot, prev.back, cur.back, prev.bot, cur.back, cur.bot]) sPos.push(p.x, p.y, p.z)
    // top cap
    for (const p of [prev.top, cur.top, cur.backTop, prev.top, cur.backTop, prev.backTop]) tPos.push(p.x, p.y, p.z)
    prev = cur
  }
  const mk = (arr: number[], uvs?: number[]) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
    if (uvs) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    g.computeVertexNormals()
    return g
  }
  b.add('zinc', mk(pos, uv))
  b.add('zinc', mk(sPos))
  b.add('zinc', mk(tPos))
  // fine dark shadow line under the band edge
  return arc
}

export function buildStadium(): Builder {
  const b = new Builder()
  const px = PITCH.w / 2
  const pz = PITCH.d / 2

  /* ---------------- ground plate & half pitch ----------------
   * HALF-SECTION MODEL: the stadium is cut along the pitch centre line
   * (z = 0); only the half carrying the main stand and the zinc facade is
   * modelled. The cut faces sit against the presentation backdrop.
   */
  b.block('concrete', 150, 0.6, 71.5, 0, -0.6, 35.25)
  const pitchGeo = new THREE.PlaneGeometry(PITCH.w, PITCH.d / 2)
  const puv = pitchGeo.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < puv.count; i++) puv.setY(i, puv.getY(i) * 0.5)
  b.add('pitch', pitchGeo, mat(0, 0.05, PITCH.d / 4, 0, -Math.PI / 2))
  // section face of the ground slab at the cut
  b.box('stadDark', PITCH.w + 30, 0.6, 0.05, 0, -0.3, -0.48)

  /* ---------------- stands ---------------- */
  // profile in (outward distance s, height y): front wall, seating rake, back.
  // x0..x1 is the kept stretch along the stand (allows the half-section cut).
  const stand = (x0: number, x1: number, depth: number, rakeTop: number, roofY: number, ry: number, dist: number, isMain: boolean) => {
    const sb = new Builder()
    const L = x1 - x0
    const xc = (x0 + x1) / 2
    const s0 = 0
    const s1 = depth - 2.5
    // concrete under-structure (extruded profile along x)
    const prof = new THREE.Shape([
      new THREE.Vector2(s0, 0),
      new THREE.Vector2(depth, 0),
      new THREE.Vector2(depth, rakeTop + 1),
      new THREE.Vector2(s1, rakeTop + 1),
      new THREE.Vector2(s1, rakeTop),
      new THREE.Vector2(s0, 1.4),
    ])
    const g = extrude(prof, L)
    // extrusion runs along local −x from x1 to x0; profile s → +z (outward)
    sb.add('concrete', g, new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0)).setPosition(x1, 0, 0))
    // seating surface
    const rakeLen = Math.hypot(s1 - s0, rakeTop - 1.4)
    const ang = Math.atan2(rakeTop - 1.4, s1 - s0)
    sb.add('seats', metricBox(L - 0.4, rakeLen, 0.12), mat(xc, (1.4 + rakeTop) / 2 + 0.07, (s0 + s1) / 2 - 0.05, 0, Math.PI / 2 - ang))
    // vomitory gaps (dark openings across the rake)
    for (let x = x0 + 9; x < x1 - 5; x += 14) {
      sb.add('stadDark', metricBox(2.2, rakeLen * 0.42, 0.16), mat(x, 1.4 + (rakeTop - 1.4) * 0.22 + 0.05, s0 + (s1 - s0) * 0.22 - 0.05, 0, Math.PI / 2 - ang))
    }
    // white perimeter wall at pitch level
    sb.block('white', L, 1.4, 0.3, xc, 0, -0.15)
    // roof slab (cantilevered towards the pitch)
    const roofFront = -4.5
    const roofBack = depth + 3.5
    const roofD = roofBack - roofFront
    sb.box('stadRoof', L + 1.5, 0.9, roofD, xc, roofY, (roofFront + roofBack) / 2)
    sb.box('stadDark', L + 1.5, 0.35, roofD - 0.4, xc, roofY - 0.62, (roofFront + roofBack) / 2)
    // leading-edge catwalk with floodlights
    const ry0 = roofY + 0.45
    sb.box('rail', L, 0.12, 0.12, xc, ry0 + 1.9, roofFront + 0.5)
    sb.box('rail', L, 0.12, 0.12, xc, ry0 + 1.9, roofFront + 2.2)
    sb.box('steel', L, 0.15, 1.9, xc, ry0 + 0.2, roofFront + 1.35)
    for (let x = x0 + 0.5; x <= x1; x += 3) {
      sb.box('rail', 0.1, 1.9, 0.1, x, ry0 + 0.95, roofFront + 0.5)
      sb.box('rail', 0.1, 1.9, 0.1, x, ry0 + 0.95, roofFront + 2.2)
    }
    for (let x = x0 + 2; x <= x1 - 1; x += 3.4) {
      sb.box('lamp', 0.75, 0.55, 0.32, x, ry0 + 2.35, roofFront + 0.35, 0, 0.5)
    }
    if (!isMain) {
      // outward-leaning back facade (dark mesh) with exposed steel frames
      const lean = 4.5
      const fb = depth - 1.0
      facet(sb, 'stadMesh', [V(x0, 0.6, fb), V(x1, 0.6, fb), V(x1, roofY - 0.4, fb + lean), V(x0, roofY - 0.4, fb + lean)], {
        hint: V(0, 0, 1),
      })
      const bays = Math.max(1, Math.round(L / 7.5))
      for (let i = 0; i <= bays; i++) {
        const x = x0 + (i * L) / bays
        sb.beam('steel', V(x, 0, fb + 0.8), V(x, roofY - 0.2, fb + lean + 0.9), 0.55, 0.7, V(0, 0, 1))
        if (i < bays) {
          const xn = x0 + ((i + 1) * L) / bays
          const yM = roofY * 0.5
          // diagonal bracing (V pattern)
          sb.beam('steel', V(x, 2.2, fb + 0.9), V((x + xn) / 2, yM, fb + lean * 0.5 + 0.9), 0.25, 0.3, V(0, 0, 1))
          sb.beam('steel', V(xn, 2.2, fb + 0.9), V((x + xn) / 2, yM, fb + lean * 0.5 + 0.9), 0.25, 0.3, V(0, 0, 1))
          sb.beam('steel', V((x + xn) / 2, yM, fb + lean * 0.5 + 0.9), V(x, roofY - 0.5, fb + lean + 0.9), 0.25, 0.3, V(0, 0, 1))
          sb.beam('steel', V((x + xn) / 2, yM, fb + lean * 0.5 + 0.9), V(xn, roofY - 0.5, fb + lean + 0.9), 0.25, 0.3, V(0, 0, 1))
        }
      }
      // horizontal girts
      for (const yy of [roofY * 0.5, roofY - 0.6]) {
        const t = yy / roofY
        sb.box('steel', L, 0.3, 0.3, xc, yy, fb + lean * t + 1.0)
      }
      // white base building with arched gates
      const holes: THREE.Vector2[][] = []
      for (let x = 8; x < L - 5; x += 16) holes.push(opening('round', 3.2, 3.6, x - L / 2, 0))
      sb.add('white', wallWithOpenings(L, 4.2, 0.6, holes), mat(xc, 0, fb + 1.6))
      for (const h of holes) {
        const cx = (h[0].x + h[1].x) / 2
        sb.add('stadDark', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 3.2, 3.6, cx, 0))), mat(xc, 0, fb + 1.62))
      }
    } else {
      // main stand back: vertical dark glazed facade between the two zinc bands
      sb.add('glass', metricBox(L, roofY - BAND.y1 - 3, 0.3), mat(xc, BAND.y1 + (roofY - BAND.y1 - 3) / 2, depth))
      for (let x = x0; x <= x1; x += 6) sb.box('steel', 0.35, roofY - BAND.y1 - 3, 0.5, x, BAND.y1 + (roofY - BAND.y1 - 3) / 2, depth + 0.2)
    }
    b.merge(sb, mat(Math.sin(ry) * dist, 0, Math.cos(ry) * dist, ry))
  }
  // main long side (+z) complete; the two end stands are cut at the pitch centre line (world z = 0)
  const halfEnd = (PITCH.d - 2) / 2
  stand(-(PITCH.w + 2) / 2, (PITCH.w + 2) / 2, 15, 13, 19.5, 0, pz, true)
  stand(-halfEnd, 0, 12.5, 11, 17.8, Math.PI / 2, px, false)
  stand(0, halfEnd, 12.5, 11, 17.8, -Math.PI / 2, px, false)

  // upper zinc band on top of the main stand facade (sloped, like the eave band)
  const upperY = 19.5 - 3.2
  eaveBand(b, -px - 1.5, px + 1.5, FRONT_Z + 0.1, () => upperY, { height: 2.8, out: 2.4, soffit: 2.4, step: 4 })

  /* ---------------- main pavilion (white, piers) ---------------- */
  const xL = -64
  const xR = 64
  // roof deck & back wall
  b.box('white', xR - xL, 0.6, PAV.z1 - PAV.z0, (xL + xR) / 2, PAV.h + 0.3, (PAV.z0 + PAV.z1) / 2)
  b.box('glassPlain', xR - xL - 4, PAV.h - 0.4, 0.3, (xL + xR) / 2, PAV.h / 2, PAV.z1 - 4.5)
  // tapered piers (wider at the foot)
  for (let x = xL + 13; x <= xR - 13; x += 7.2) {
    b.add('white', frustum(1.5, 1.6, 1.05, 1.15, 0, PAV.h, x, PAV.z1 - 1.6))
  }
  // corner pavilions with bell arches (under spire A and tower C)
  const cornerPav = (cx: number, w: number) => {
    const d = PAV.z1 - PAV.z0 + 2
    const cz = (PAV.z0 + PAV.z1) / 2 + 1
    const h = PAV.h + 0.4
    // front wall with arches
    const holesF = [opening('bell', 4.4, 6.2, -w / 4, 0), opening('bell', 4.4, 6.2, w / 4, 0)]
    b.add('white', wallWithOpenings(w, h, 1.2, holesF), mat(cx, 0, cz + d / 2 - 1.2))
    for (const sx of [-1, 1]) {
      const holesS = [opening('bell', 4.4, 6.2, 0, 0)]
      b.add('white', wallWithOpenings(d, h, 1.2, holesS), mat(cx + (sx * w) / 2 - (sx > 0 ? 1.2 : 0), 0, cz, sx * (Math.PI / 2)))
    }
    b.box('stadDark', w - 2.6, h - 0.4, d - 3, cx, h / 2, cz)
    b.box('white', w, 0.6, d, cx, h + 0.3, cz)
    return { cz, d, top: h + 0.6 }
  }
  const pa = cornerPav(-60, 15)
  const pc = cornerPav(60, 14)

  /* ---------------- lower zinc eave band incl. the wave ---------------- */
  const waveC = -38
  const waveHW = 8.5
  const waveRise = upperY - BAND.y0 - 0.5
  const profile = (x: number) => {
    const t = (x - waveC) / waveHW
    if (Math.abs(t) >= 1) return BAND.y0
    const k = 0.5 * (1 + Math.cos(Math.PI * t))
    return BAND.y0 + waveRise * Math.pow(k, 0.75)
  }
  eaveBand(b, xL + 7, xR - 7, PAV.z1, profile, { height: BAND.y1 - BAND.y0, out: BAND.out, soffit: BAND.out, step: 0.6 })
  // dark attic volume behind the band, under the gables and spire B
  b.box('stadDark', 40, 2.8, 11, -7, 9.2, PAV.z1 - 5.6)
  b.box('stadDark', 10, 2.6, 10, 26, 9.1, PAV.z1 - 5.5)
  // dark opening under the wave (stair hall)
  b.box('stadDark', waveHW * 1.5, upperY - 1.5, 0.4, waveC, (upperY - 1.5) / 2, PAV.z1 - 0.6)
  b.box('steel', 0.4, upperY - 2, 0.4, waveC - 3, (upperY - 2) / 2, PAV.z1 - 0.3)
  b.box('steel', 0.4, upperY - 2, 0.4, waveC + 3, (upperY - 2) / 2, PAV.z1 - 0.3)

  /* ---------------- spires, gables, tower ---------------- */
  // A — tall corner spire on the left arched pavilion
  tieredSpire(b, -60, pa.cz, pa.top, { skirt: 9.2, skirtTop: 6.2, skirtH: 2.4, body: 5.4, height: 24, tiers: 8, exp: 1.25 })
  // three stepped gables, increasing in height towards spire B
  steppedGable(b, -20, PAV.z1 + 0.4, BAND.y1 - 0.2, 10.5, 9.5, 9)
  steppedGable(b, -8.5, PAV.z1 + 0.6, BAND.y1 - 0.2, 11.5, 12.5, 10)
  steppedGable(b, 4.5, PAV.z1 + 0.8, BAND.y1 - 0.2, 13, 16.5, 11)
  // B — spire with four small pinnacles at its skirt
  const bx = 26
  const bz = PAV.z1 - 5.5
  tieredSpire(b, bx, bz, BAND.y1 - 0.4, { skirt: 7.6, skirtTop: 5.2, skirtH: 2.0, body: 4.4, height: 17.5, tiers: 7, exp: 1.3 })
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    tieredSpire(b, bx + sx * 5.6, bz + sz * 5.6, BAND.y1 + 1.2, { skirt: 1.3, skirtTop: 1.0, skirtH: 0.6, body: 0.9, height: 5.2, tiers: 3, exp: 1.2 })
  }
  // C — truncated stepped tower on the right arched pavilion
  tieredSpire(b, 60, pc.cz, pc.top, { skirt: 8.8, skirtTop: 6.0, skirtH: 2.4, body: 5.0, height: 13, tiers: 6, truncated: 2.2, exp: 1.0 })

  /* ---------------- "SEPSI" red lettering on the side piers (hint only) ---------------- */
  // (omitted at model scale — letters would be ~5 mm)

  // keep the footprint centred: the half-section spans z ≈ [-0.5, 71] → shift by -35.25
  const out = new Builder()
  out.merge(b, mat(0, 0, -35.25))
  return out
}

/** Loft helper re-export (used by tests / future tweaks) */
export const _internal = { loft, rectRing }
