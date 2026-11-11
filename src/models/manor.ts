/**
 * MODEL C — Historic building (manor house), Răscruci.
 *
 * Modelling specification derived from the supplied photographs (real metres):
 *  - Strictly symmetrical two-storey block of five parts: two corner pavilions
 *    projecting front and back, two recessed connecting wings, a taller central
 *    block with a pedimented risalit on both facades.
 *  - Copper roofs: steep mansard (pavilion) roofs with a curb and low upper hip
 *    on the pavilions and the central block (central one tallest), low gable
 *    roofs over the connecting wings, a small copper hip over the entrance
 *    porch; ox-eye dormers, finials, chimneys and modern skylights.
 *  - Facades: cream render, rusticated quoins, socle, belt course, main
 *    cornice; ground-floor arched windows, upper windows with hoods; Corinthian
 *    pilasters and three arched French windows on the central risalit.
 *  - Garden side: raised portico with columns carrying a balustraded terrace,
 *    reached by two curved (horseshoe) staircases.
 * Approximations: absolute dimensions (proportions taken from the elevation &
 * plan photographs), window counts on side elevations, ornament (simplified),
 * column count, roof pitches.
 */
import * as THREE from 'three'
import { Builder, V, extrude, facet, frameShape, frustum, hipRoof, lathe, mat, metricBox, opening, truncatedHip, type OpeningType } from '../lib/geo'

export const MANOR_SIZE = { length: 50, scale: 0.8 / 50 }

const PAV = { cx: 19.25, hw: 5, hd: 11.5 }
const CON = { x0: 7, x1: 14.25, hd: 10 }
const CEN = { hw: 7, hd: 11.8 }
const EAVE = 13.05
const CEN_EAVE = 14.05
const SEAM = { key: 'copper', spacing: 0.55, h: 0.07, w: 0.055 }
const deg = (d: number) => (d * Math.PI) / 180
const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)

/** Window with stucco surround, ochre frame, glazing bars, sill and optional hood. */
function win(b: Builder, m: THREE.Matrix4, type: OpeningType, w: number, h: number, y0: number, hood = false) {
  b.add('trim', extrude(frameShape(type, w, h, 0.26, 0, y0), 0.14), m)
  b.add('frame', extrude(frameShape(type, w - 0.16, h - 0.08, 0.08, 0, y0), 0.08), m)
  b.add('glassM', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w - 0.16, h - 0.08, 0, y0, 10))), M(m, mat(0, 0, 0.03)))
  b.add('frame', metricBox(0.07, h - 0.2, 0.06), M(m, mat(0, y0 + (h - 0.2) / 2, 0.05)))
  b.add('frame', metricBox(w - 0.2, 0.07, 0.06), M(m, mat(0, y0 + h * 0.66, 0.05)))
  b.add('trim', metricBox(w + 0.55, 0.16, 0.32), M(m, mat(0, y0 - 0.2, 0.12)))
  if (hood) {
    b.add('trim', metricBox(w + 0.5, 0.42, 0.12), M(m, mat(0, y0 + h + 0.47, 0.06)))
    b.add('trim', metricBox(w + 0.85, 0.2, 0.36), M(m, mat(0, y0 + h + 0.78, 0.16)))
  }
}

/** Rusticated quoins on a vertical building corner. dirA/dirB point along the two faces away from the corner. */
function quoins(b: Builder, corner: THREE.Vector3, dirA: THREE.Vector3, dirB: THREE.Vector3, y0: number, y1: number) {
  const rowH = 0.52
  const n = Math.floor((y1 - y0) / rowH)
  const proj = 0.09
  for (let i = 0; i < n; i++) {
    const y = y0 + i * rowH + rowH * 0.45
    const la = i % 2 ? 1.05 : 0.62
    const lb = i % 2 ? 0.62 : 1.05
    // face A: outward normal = -dirB
    const ca = corner.clone().add(dirA.clone().multiplyScalar(la / 2)).add(dirB.clone().multiplyScalar(-proj / 2)).setY(y)
    const cb = corner.clone().add(dirB.clone().multiplyScalar(lb / 2)).add(dirA.clone().multiplyScalar(-proj / 2)).setY(y)
    const angA = Math.atan2(dirA.x, dirA.z)
    const angB = Math.atan2(dirB.x, dirB.z)
    b.add('trim', metricBox(proj, rowH * 0.84, la), mat(ca.x, ca.y, ca.z, angA))
    b.add('trim', metricBox(proj, rowH * 0.84, lb), mat(cb.x, cb.y, cb.z, angB))
  }
}

function pilaster(b: Builder, m: THREE.Matrix4, x: number, y0: number, y1: number, w = 0.66) {
  b.add('trim', metricBox(w + 0.16, 0.32, 0.36), M(m, mat(x, y0 + 0.16, 0.18)))
  b.add('trim', metricBox(w, y1 - y0 - 0.9, 0.26), M(m, mat(x, y0 + 0.32 + (y1 - y0 - 0.9) / 2, 0.13)))
  // Corinthian capital (simplified bell + abacus)
  b.add('trim', frustum(w / 2, 0.16, w / 2 + 0.12, 0.24, 0, 0.5), M(m, mat(x, y1 - 0.58, 0.18)))
  b.add('trim', metricBox(w + 0.36, 0.1, 0.5), M(m, mat(x, y1 - 0.03, 0.22)))
}

function balustrade(b: Builder, a: THREE.Vector3, c: THREE.Vector3, h = 1.05, spacing = 0.34) {
  const L = a.distanceTo(c)
  const n = Math.max(2, Math.floor(L / spacing))
  const prof: [number, number][] = [
    [0.0, 0],
    [0.11, 0],
    [0.11, 0.08],
    [0.06, 0.14],
    [0.12, 0.38],
    [0.1, 0.52],
    [0.05, 0.62],
    [0.08, 0.7],
    [0.0, 0.7],
  ]
  const g = lathe(prof.map(([r, y]) => [r, (y * (h - 0.32)) / 0.7]), 7)
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(c, i / n)
    b.add('trim', g, mat(p.x, p.y + 0.12, p.z))
  }
  b.beam('trim', a.clone().setY(a.y + 0.06), c.clone().setY(c.y + 0.06), 0.34, 0.12)
  b.beam('trim', a.clone().setY(a.y + h - 0.12), c.clone().setY(c.y + h - 0.12), 0.4, 0.2)
}

/** Ox-eye dormer on a roof facet: a short copper cylinder pointing outward. */
function oxEye(b: Builder, p: THREE.Vector3, n: THREE.Vector3) {
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n.clone().normalize())
  const m = new THREE.Matrix4().compose(p, q, V(1, 1, 1))
  b.add('copperDark', new THREE.CylinderGeometry(0.52, 0.52, 1.1, 18, 1, true), m)
  b.add('glassM', new THREE.CircleGeometry(0.42, 18), M(m, mat(0, 0.5, 0, 0, -Math.PI / 2)))
  b.add('copperDark', new THREE.TorusGeometry(0.47, 0.07, 6, 18), M(m, mat(0, 0.56, 0, 0, Math.PI / 2)))
}

function finial(b: Builder, x: number, y: number, z: number, s = 1) {
  const prof: [number, number][] = [
    [0.18, 0],
    [0.12, 0.2],
    [0.1, 0.45],
    [0.22, 0.6],
    [0.22, 0.78],
    [0.06, 0.95],
    [0.04, 1.6],
    [0.0, 1.85],
  ]
  b.add('copperDark', lathe(prof.map(([r, yy]) => [r * s, yy * s]), 10), mat(x, y, z))
}

/** Mansard roof (lower steep truncated hip + low upper hip) with seams, curb, dormers. */
function mansard(b: Builder, cx: number, cz: number, w: number, d: number, y0: number, pitch: number, rise: number, upperPitch: number) {
  const lower = truncatedHip(cx, cz, w, d, y0, deg(pitch), rise)
  lower.facets.forEach((f) => facet(b, 'copper', f, { seams: SEAM, thickness: 0.1 }))
  lower.lines.forEach(([p, q]) => b.beam('copperDark', p, q, 0.22, 0.14))
  const up = hipRoof(cx, cz, lower.curb.w, lower.curb.d, lower.curb.y + 0.12, deg(upperPitch))
  up.facets.forEach((f) => facet(b, 'copper', f, { seams: SEAM }))
  up.lines.forEach(([p, q]) => b.beam('copperDark', p, q, 0.2, 0.12))
  // curb moulding
  const c = lower.corners
  for (let i = 0; i < 4; i++) b.beam('copperDark', c[i].clone().setY(c[i].y + 0.06), c[(i + 1) % 4].clone().setY(c[i].y + 0.06), 0.3, 0.3)
  // eave gutter
  const e = [V(cx - w / 2, y0, cz - d / 2), V(cx + w / 2, y0, cz - d / 2), V(cx + w / 2, y0, cz + d / 2), V(cx - w / 2, y0, cz + d / 2)]
  for (let i = 0; i < 4; i++) b.beam('copperDark', e[i].clone().setY(y0 - 0.08), e[(i + 1) % 4].clone().setY(y0 - 0.08), 0.26, 0.26)
  return { lower, up }
}

export function buildManor(): Builder {
  const b = new Builder()

  /* ---------------- site board ---------------- */
  b.block('concrete', 51, 0.4, 38, 0, -0.4, 0.3)

  /* ---------------- masses ---------------- */
  for (const sx of [-1, 1]) {
    const cx = sx * PAV.cx
    b.block('wallM', PAV.hw * 2, EAVE, PAV.hd * 2, cx, 0, 0)
    b.block('socle', PAV.hw * 2 + 0.3, 1.2, PAV.hd * 2 + 0.3, cx, 0, 0)
    b.block('trim', PAV.hw * 2 + 0.3, 0.45, PAV.hd * 2 + 0.3, cx, 6.35, 0)
    b.block('trim', PAV.hw * 2 + 0.7, 0.35, PAV.hd * 2 + 0.7, cx, EAVE - 0.65, 0)
    b.block('trim', PAV.hw * 2 + 1.1, 0.3, PAV.hd * 2 + 1.1, cx, EAVE - 0.3, 0)
    const ccx = (sx * (CON.x0 + CON.x1)) / 2
    const cw = CON.x1 - CON.x0
    b.block('wallM', cw, EAVE, CON.hd * 2, ccx, 0, 0)
    b.block('socle', cw, 1.2, CON.hd * 2 + 0.3, ccx, 0, 0)
    b.block('trim', cw, 0.45, CON.hd * 2 + 0.3, ccx, 6.35, 0)
    b.block('trim', cw, 0.35, CON.hd * 2 + 0.7, ccx, EAVE - 0.65, 0)
    b.block('trim', cw, 0.3, CON.hd * 2 + 1.1, ccx, EAVE - 0.3, 0)
  }
  b.block('wallM', CEN.hw * 2, CEN_EAVE, CEN.hd * 2, 0, 0, 0)
  b.block('socle', CEN.hw * 2 + 0.3, 1.2, CEN.hd * 2 + 0.3, 0, 0, 0)
  b.block('trim', CEN.hw * 2 + 0.3, 0.45, CEN.hd * 2 + 0.3, 0, 6.35, 0)
  b.block('trim', CEN.hw * 2 + 0.7, 0.4, CEN.hd * 2 + 0.7, 0, CEN_EAVE - 0.7, 0)
  b.block('trim', CEN.hw * 2 + 1.1, 0.3, CEN.hd * 2 + 1.1, 0, CEN_EAVE - 0.3, 0)
  // frieze band of the central block above the side cornices
  b.block('trim', CEN.hw * 2 + 0.2, 0.25, CEN.hd * 2 + 0.2, 0, 12.2, 0)

  /* ---------------- quoins ---------------- */
  const X = V(1, 0, 0)
  const Z = V(0, 0, 1)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      // pavilion outer & inner corners
      quoins(b, V(sx * (PAV.cx + PAV.hw), 0, sz * PAV.hd), X.clone().multiplyScalar(-sx), Z.clone().multiplyScalar(-sz), 1.2, EAVE - 0.7)
      quoins(b, V(sx * (PAV.cx - PAV.hw), 0, sz * PAV.hd), X.clone().multiplyScalar(sx), Z.clone().multiplyScalar(-sz), 1.2, EAVE - 0.7)
      // central block corners
      quoins(b, V(sx * CEN.hw, 0, sz * CEN.hd), X.clone().multiplyScalar(-sx), Z.clone().multiplyScalar(-sz), 1.2, CEN_EAVE - 0.75)
    }
  }

  /* ---------------- windows ---------------- */
  for (const sz of [-1, 1]) {
    const ry = sz > 0 ? 0 : Math.PI
    const garden = sz > 0
    for (const sx of [-1, 1]) {
      // pavilions (2 bays)
      const pm = mat(sx * PAV.cx, 0, sz * PAV.hd, ry)
      for (const bx of [-2.25, 2.25]) {
        const isDoor = !garden && bx * sx > 0
        if (isDoor) {
          win(b, M(pm, mat(bx, 0, 0)), 'rect', 1.45, 3.0, 1.25)
          b.add('paving', metricBox(2.4, 1.2, 1.6), M(pm, mat(bx, 0.6, 0.8)))
        } else win(b, M(pm, mat(bx, 0, 0)), 'segment', 1.35, 2.55, 2.0)
        win(b, M(pm, mat(bx, 0, 0)), 'rect', 1.35, 2.65, 7.6, true)
      }
      // connecting wings (2 bays)
      const cm = mat((sx * (CON.x0 + CON.x1)) / 2, 0, sz * CON.hd, ry)
      for (const bx of [-1.75, 1.75]) {
        win(b, M(cm, mat(bx, 0, 0)), 'segment', 1.3, 2.5, 2.0)
        win(b, M(cm, mat(bx, 0, 0)), 'rect', 1.3, 2.6, 7.6, true)
      }
      // outer side elevations (5 bays)
      const sm = mat(sx * (PAV.cx + PAV.hw), 0, 0, sx * (Math.PI / 2))
      for (let i = -2; i <= 2; i++) {
        win(b, M(sm, mat(i * 4.4, 0, 0)), 'segment', 1.3, 2.5, 2.0)
        win(b, M(sm, mat(i * 4.4, 0, 0)), 'rect', 1.3, 2.6, 7.6, true)
      }
    }
    // central risalit: three arched French windows between Corinthian pilasters
    const cm = mat(0, 0, sz * CEN.hd, ry)
    for (const bx of [-3, 0, 3]) win(b, M(cm, mat(bx, 0, 0)), 'round', 1.65, 3.5, 7.45)
    for (const px of [-4.6, -1.5, 1.5, 4.6]) pilaster(b, cm, px, 7.0, 12.2)
    for (const px of [-6.1, 6.1]) pilaster(b, cm, px, 7.0, 12.2, 0.55)
    // pediment
    const pw = CEN.hw * 2 + 0.9
    const ph = 3.3
    const tri = new THREE.Shape([new THREE.Vector2(-pw / 2, 0), new THREE.Vector2(pw / 2, 0), new THREE.Vector2(0, ph)])
    const pz = sz * (CEN.hd + 0.45)
    const pm = mat(0, CEN_EAVE, pz, ry)
    b.add('trim', extrude(tri, 2.2), M(pm, mat(0, 0, -2.2)))
    const rake = Math.atan2(ph, pw / 2)
    for (const s of [-1, 1]) {
      const a = V(s * (pw / 2 + 0.25), CEN_EAVE - 0.05, pz)
      const c = V(0, CEN_EAVE + ph + 0.25, pz)
      b.beam('trim', a.clone().add(V(0, 0, sz * 0.15)), c.clone().add(V(0, 0, sz * 0.15)), 0.5, 0.55, V(0, 0, 1))
      // copper coping on the rakes
      const o = V(0, 0.32 / Math.cos(rake), 0)
      b.beam('copperDark', a.clone().add(o).add(V(0, 0, -sz * 0.7)), c.clone().add(o).add(V(0, 0, -sz * 0.7)), 0.7, 2.2, V(0, 0, 1))
    }
    // tympanum coat of arms
    b.add('trim', new THREE.CylinderGeometry(0.55, 0.55, 0.2, 16), M(pm, mat(0, 1.25, 0.08, 0, Math.PI / 2, 0, 1, 1, 1.3)))
  }

  /* ---------------- roofs (copper) ---------------- */
  for (const sx of [-1, 1]) {
    const cx = sx * PAV.cx
    const r = mansard(b, cx, 0, PAV.hw * 2 + 1.0, PAV.hd * 2 + 1.0, EAVE, 66, 3.4, 16)
    // finials at the ridge ends
    const [r1, r2] = r.up.lines[0]
    finial(b, r1.x, r1.y + 0.1, r1.z)
    finial(b, r2.x, r2.y + 0.1, r2.z)
    // ox-eye dormers: one on each short facet, two on the outer long facet
    const t = Math.tan(deg(66))
    const yD = EAVE + 1.55
    const run = (yD - EAVE) / t
    const hd = PAV.hd + 0.5
    oxEye(b, V(cx, yD, hd - run + 0.25), V(0, 0.15, 1))
    oxEye(b, V(cx, yD, -(hd - run + 0.25)), V(0, 0.15, -1))
    for (const z of [-4.5, 4.5]) oxEye(b, V(cx + sx * (PAV.hw + 0.5 - run + 0.25), yD, z), V(sx, 0.15, 0))
    // connecting-wing gable roof (ridge parallel to the facade)
    const x0 = sx > 0 ? CON.x0 - 0.4 : -(CON.x1 + 0.4)
    const x1 = sx > 0 ? CON.x1 + 0.4 : -(CON.x0 - 0.4)
    const cp = deg(17)
    const hdC = CON.hd + 0.5
    const ridge = EAVE + hdC * Math.tan(cp)
    facet(b, 'copper', [V(x0, EAVE, hdC), V(x1, EAVE, hdC), V(x1, ridge, 0), V(x0, ridge, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, 'copper', [V(x1, EAVE, -hdC), V(x0, EAVE, -hdC), V(x0, ridge, 0), V(x1, ridge, 0)], { seams: SEAM, thickness: 0.1 })
    b.beam('copperDark', V(x0, ridge + 0.06, 0), V(x1, ridge + 0.06, 0), 0.26, 0.18)
    for (const sz of [-1, 1]) b.beam('copperDark', V(x0, EAVE - 0.08, sz * hdC), V(x1, EAVE - 0.08, sz * hdC), 0.26, 0.26)
    // chimneys
    for (const [chx, chz] of [
      [sx * 8.1, -7.2],
      [sx * 13.2, 1.2],
    ]) {
      b.block('wallM', 0.95, 4.1, 1.5, chx, EAVE, chz)
      b.block('trim', 1.25, 0.28, 1.8, chx, EAVE + 4.1, chz)
      b.block('copperDark', 1.0, 0.18, 1.55, chx, EAVE + 4.38, chz)
    }
    // modern skylights (as photographed): garden slope right wing, entrance slope left wing
    const slz = sx > 0 ? 1 : -1
    const sxc = sx * ((CON.x0 + CON.x1) / 2)
    const yAt = (z: number) => EAVE + (hdC - Math.abs(z)) * Math.tan(cp) + 0.1
    const z0 = slz * 3.4
    const z1 = slz * 6.4
    const pts = [V(sxc - 1.2, yAt(z1), z1), V(sxc + 1.2, yAt(z1), z1), V(sxc + 1.2, yAt(z0), z0), V(sxc - 1.2, yAt(z0), z0)]
    facet(b, 'skylight', pts)
    for (const p of [[-1.25, 0], [1.25, 0]]) b.beam('copperDark', V(sxc + p[0], yAt(z1) + 0.04, z1), V(sxc + p[0], yAt(z0) + 0.04, z0), 0.1, 0.12)
  }
  // central block mansard with central finial
  const rc = mansard(b, 0, 0, CEN.hw * 2 + 1.0, CEN.hd * 2 + 1.0, CEN_EAVE, 66, 3.9, 14)
  const [c1, c2] = rc.up.lines[0]
  const top = c1.clone().add(c2).multiplyScalar(0.5)
  finial(b, top.x, top.y + 0.1, top.z, 1.15)
  b.rod('copperDark', V(top.x, top.y + 1.9, top.z), V(top.x, top.y + 4.2, top.z), 0.035)
  // ox-eyes on the central roof's long sides are not visible in the photos → none

  /* ---------------- entrance porch (−z) ---------------- */
  {
    const z0 = -CEN.hd
    const z1 = -CEN.hd - 3.4
    const zc = (z0 + z1) / 2
    b.block('wallM', 10, 5.6, 3.4, 0, 0, zc)
    b.block('socle', 10.3, 1.2, 3.7, 0, 0, zc)
    b.block('trim', 10.5, 0.4, 3.9, 0, 5.2, zc)
    const fm = mat(0, 0, z1, Math.PI)
    win(b, M(fm, mat(0, 0, 0)), 'rect', 1.9, 3.6, 1.25)
    for (const bx of [-2.7, 2.7]) win(b, M(fm, mat(bx, 0, 0)), 'rect', 1.25, 2.9, 1.9)
    for (const px of [-4.3, -1.5, 1.5, 4.3]) pilaster(b, fm, px, 1.2, 5.2, 0.5)
    const hr = hipRoof(0, zc, 10.6, 4.0, 5.6, deg(24))
    hr.facets.forEach((f) => facet(b, 'copper', f, { seams: SEAM, thickness: 0.08 }))
    hr.lines.forEach(([p, q]) => b.beam('copperDark', p, q, 0.18, 0.12))
    // entrance steps & cube planters
    for (let i = 0; i < 3; i++) b.block('paving', 4.2 - i * 0.3, 0.4 * (i + 1), 1.0, 0, 0, z1 - 2.6 + i * 0.9)
    for (const sx of [-1, 1]) b.block('trim', 1.0, 1.0, 1.0, sx * 3.0, 0, z1 - 2.4)
  }

  /* ---------------- garden portico, terrace & horseshoe stairs (+z) ---------------- */
  {
    const z0 = CEN.hd
    const z1 = CEN.hd + 5.2
    const zc = (z0 + z1) / 2
    const podiumH = 2.0
    b.block('socle', 14, podiumH, 5.2, 0, 0, zc)
    b.block('paving', 13.6, 0.06, 4.8, 0, podiumH, zc)
    // columns
    const colXs = [-6.2, -4.2, -1.3, 1.3, 4.2, 6.2]
    const colH = 4.9
    for (const x of colXs) {
      b.add('trim', new THREE.CylinderGeometry(0.3, 0.36, colH, 16), mat(x, podiumH + colH / 2, z1 - 0.55))
      b.block('trim', 0.86, 0.3, 0.86, x, podiumH, z1 - 0.55)
      b.block('trim', 0.86, 0.26, 0.86, x, podiumH + colH - 0.26, z1 - 0.55)
    }
    for (const x of [-6.2, 6.2]) b.add('trim', new THREE.CylinderGeometry(0.3, 0.36, colH, 16), mat(x, podiumH + colH / 2, z0 + 2.3))
    // entablature / terrace slab
    const eY = podiumH + colH
    b.block('trim', 14.4, 0.75, 5.5, 0, eY, zc + 0.15)
    b.block('trim', 14.8, 0.18, 5.9, 0, eY + 0.75, zc + 0.15)
    b.block('paving', 14.0, 0.05, 5.0, 0, eY + 0.93, zc + 0.1)
    // terrace balustrade with pedestals
    const by = eY + 0.93
    const fz = z1 + 0.1
    const pedX = [-7.0, -2.4, 2.4, 7.0]
    for (let i = 0; i < pedX.length - 1; i++) balustrade(b, V(pedX[i] + 0.35, by, fz), V(pedX[i + 1] - 0.35, by, fz))
    for (const x of pedX) b.block('trim', 0.62, 1.15, 0.62, x, by, fz)
    for (const sx of [-1, 1]) {
      balustrade(b, V(sx * 7.0, by, fz - 0.4), V(sx * 7.0, by, z0 + 0.5))
      b.block('trim', 0.62, 1.15, 0.62, sx * 7.0, by, z0 + 0.4)
    }
    // ground-floor doors behind the portico
    const gm = mat(0, 0, CEN.hd, 0)
    for (const bx of [-3, 0, 3]) win(b, M(gm, mat(bx, 0, 0)), 'round', 1.65, 3.4, podiumH + 0.1)
    // curved stairs
    const steps = 11
    for (const sx of [-1, 1]) {
      const C = V(sx * 7.0, 0, z1 - 0.2)
      const rIn = 1.25
      const rOut = 3.55
      const a0 = -Math.PI / 2 // pointing −z from the centre (towards the building)
      const a1 = 0 // pointing outward (±x)
      for (let i = 0; i < steps; i++) {
        const t0 = i / steps
        const t1 = (i + 1) / steps
        const h = podiumH * (1 - i / steps)
        const s = new THREE.Shape()
        const seg = 4
        const ang = (t: number) => a0 + (a1 - a0) * t
        const pt = (r: number, a: number) => new THREE.Vector2(sx * r * Math.cos(a), -(r * Math.sin(a)))
        s.moveTo(pt(rIn, ang(t0)).x, pt(rIn, ang(t0)).y)
        for (let k = 0; k <= seg; k++) {
          const p = pt(rOut, ang(t0 + ((t1 - t0) * k) / seg))
          s.lineTo(p.x, p.y)
        }
        for (let k = seg; k >= 0; k--) {
          const p = pt(rIn, ang(t0 + ((t1 - t0) * k) / seg))
          s.lineTo(p.x, p.y)
        }
        b.add('socle', extrude(s, h), mat(C.x, 0, C.z, 0, -Math.PI / 2))
      }
      // outer curved balustrade following the flight
      const n = 9
      for (let k = 0; k < n; k++) {
        const ta = k / n
        const tb = (k + 1) / n
        const pa = V(C.x + sx * rOut * Math.cos(a0 + (a1 - a0) * ta), podiumH * (1 - ta) + 0.05, C.z + rOut * Math.sin(a0 + (a1 - a0) * ta))
        const pb = V(C.x + sx * rOut * Math.cos(a0 + (a1 - a0) * tb), podiumH * (1 - tb) + 0.05, C.z + rOut * Math.sin(a0 + (a1 - a0) * tb))
        pa.add(V(-sx * 0.2 * Math.cos(a0 + (a1 - a0) * ta), 0, -0.2 * Math.sin(a0 + (a1 - a0) * ta)))
        pb.add(V(-sx * 0.2 * Math.cos(a0 + (a1 - a0) * tb), 0, -0.2 * Math.sin(a0 + (a1 - a0) * tb)))
        balustrade(b, pa, pb, 1.0, 0.36)
      }
      // end pedestal at the foot of the stair
      const end = V(C.x + sx * (rOut - 0.2), 0, C.z + 0.25)
      b.block('trim', 0.7, 1.35, 0.7, end.x, 0, end.z)
      b.block('trim', 0.85, 0.15, 0.85, end.x, 1.35, end.z)
    }
  }

  /* ---------------- copper downpipes ---------------- */
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (const x of [sx * (PAV.cx - PAV.hw - 0.25), sx * (CEN.hw + 0.25)]) {
        b.rod('copperDark', V(x, 0.3, sz * (CON.hd + 0.12)), V(x, EAVE - 0.2, sz * (CON.hd + 0.12)), 0.09, 8)
      }
    }
  }

  return b
}
