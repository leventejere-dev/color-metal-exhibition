/**
 * MODEL B — Reformed church, Tășnad.
 *
 * Modelling specification derived from the supplied photographs (real metres):
 *  - West tower, square, three storeys separated by cornices: ground stage with
 *    arched west door and oculus, middle stage with oculus, belfry with arched
 *    louvred openings and clock faces; corner urns on the top cornice.
 *  - Baroque helm: concave bell with oculus dormers, small cornice with urns,
 *    tall concave spire, gilded globe and star.
 *  - Gothic hall: long nave with steep (~60°) gable roof; slightly narrower
 *    choir closed by a polygonal (5/8) apse with hipped facets; two-stage
 *    buttresses with sloped, metal-capped weatherings; tall pointed windows.
 *  - Gothic-revival south porch with pointed portal and small pinnacles.
 *  - NEW ROOF (COLOR METAL scope): anthracite aluminium standing seam on nave,
 *    choir, apse and porch; seams ~0.55 m apart.
 * Approximations: exact lengths/heights, buttress count, north elevation,
 * window tracery (simplified), helm profile; the helm is kept in its existing
 * light-grey metal because the photos do not show it re-clad.
 */
import * as THREE from 'three'
import { MODEL_LENGTH } from './common'
import { Builder, V, extrude, facet, frameShape, lathe, loft, mat, metricBox, opening, rectRing } from '../lib/geo'

export const CHURCH_SIZE = { length: 50.5, scale: MODEL_LENGTH / 50.5 }

const PITCH = (60 * Math.PI) / 180
const T60 = Math.tan(PITCH)
const NAVE = { x0: -17, x1: 9, hw: 6.25, h: 11 }
const CHOIR = { x0: 9, xv: 20.3, hw: 5.25, h: 11 }
const RC = CHOIR.hw / Math.sin((67.5 * Math.PI) / 180) // circumradius of the apse octagon
const XC = CHOIR.xv - RC * Math.cos((67.5 * Math.PI) / 180) // apse centre
const TOWER = { x0: -25.2, x1: -17, hw: 4.1 }
const SEAM = { key: 'alu', spacing: 0.55, h: 0.075, w: 0.06 }

const deg = (d: number) => (d * Math.PI) / 180
const apsePt = (aDeg: number, r: number, y: number) => V(XC + r * Math.cos(deg(aDeg)), y, r * Math.sin(deg(aDeg)))

/** Pointed Gothic window on a wall frame (local x along wall, z outward). */
function gothicWindow(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number) {
  const f = 0.32
  b.add('stone', extrude(frameShape('pointed', w, h, f, 0, y0), 0.22), m)
  const glass = new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', w, h, 0, y0, 10)))
  b.add('glassC', glass, new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.06)))
  // mullion & transoms (lead / stone)
  b.add('stone', metricBox(0.12, h - 0.3, 0.12), new THREE.Matrix4().multiplyMatrices(m, mat(0, y0 + (h - 0.3) / 2, 0.1)))
  for (let i = 1; i < 4; i++) b.add('lead', metricBox(w, 0.06, 0.08), new THREE.Matrix4().multiplyMatrices(m, mat(0, y0 + (i * (h - w * 0.8)) / 4, 0.1)))
  // tracery hint: small trefoil ring at the head
  const ring = new THREE.TorusGeometry(w * 0.22, 0.06, 6, 16)
  b.add('stone', ring, new THREE.Matrix4().multiplyMatrices(m, mat(0, y0 + h - w * 0.62, 0.1)))
  // sill
  b.add('stone', metricBox(w + 0.8, 0.18, 0.45), new THREE.Matrix4().multiplyMatrices(m, mat(0, y0 - 0.25, 0.15)))
}

/** Two-stage Gothic buttress at point p on a wall with outward normal n. */
function buttress(b: Builder, p: THREE.Vector3, n: THREE.Vector3, width = 1.15, depth = 1.9, scale = 1) {
  const s = scale
  const prof = new THREE.Shape([
    new THREE.Vector2(-0.3, 0),
    new THREE.Vector2(depth, 0),
    new THREE.Vector2(depth, 5.6 * s),
    new THREE.Vector2(depth * 0.62, 6.7 * s),
    new THREE.Vector2(depth * 0.62, 8.4 * s),
    new THREE.Vector2(-0.3, 10.1 * s),
  ])
  const up = V(0, 1, 0)
  const t = V().crossVectors(n, up).normalize()
  const basis = new THREE.Matrix4().makeBasis(n.clone().normalize(), up, t)
  basis.setPosition(p.clone().sub(t.clone().multiplyScalar(width / 2)))
  b.add('wallC', extrude(prof, width), basis)
  // metal flashing on the two weathering slopes (existing grey metal, as photographed)
  const pt = (sx: number, y: number) => p.clone().add(n.clone().multiplyScalar(sx)).add(V(0, y, 0))
  b.beam('helm', pt(depth + 0.08, 5.6 * s + 0.06), pt(depth * 0.62 + 0.02, 6.7 * s + 0.06), width + 0.12, 0.08, V(0, 1, 0))
  b.beam('helm', pt(depth * 0.62 + 0.08, 8.4 * s + 0.06), pt(-0.1, 10.1 * s + 0.06), width + 0.12, 0.08, V(0, 1, 0))
  // stone plinth
  b.add('stone', metricBox(depth + 0.2, 1.0, width + 0.2), new THREE.Matrix4().makeBasis(n.clone().normalize(), up, t).setPosition(p.clone().add(n.clone().multiplyScalar(depth / 2)).add(V(0, 0.5, 0))))
}

function urn(b: Builder, x: number, y: number, z: number, s = 1) {
  const prof: [number, number][] = [
    [0.0, 0],
    [0.32, 0],
    [0.32, 0.12],
    [0.16, 0.2],
    [0.28, 0.42],
    [0.3, 0.6],
    [0.18, 0.78],
    [0.1, 0.86],
    [0.14, 0.95],
    [0.0, 1.25],
  ]
  b.add('towerW', lathe(prof.map(([r, yy]) => [r * s, yy * s]), 10), mat(x, y, z))
}

/** Square ogee helm profile → loft. */
function squareLoft(profile: [number, number][], cx: number, cz: number) {
  return loft(
    profile.map(([hw, y]) => rectRing(hw, hw, y, cx, cz)),
    { capBottom: true },
  )
}

export function buildChurch(): Builder {
  const b = new Builder()

  /* ---------------- site board ---------------- */
  b.block('concrete', 52, 0.4, 21, -0.15, -0.4, 0)

  /* ---------------- nave ---------------- */
  const nx = (NAVE.x0 + NAVE.x1) / 2
  const nl = NAVE.x1 - NAVE.x0
  b.block('wallC', nl, NAVE.h, NAVE.hw * 2, nx, 0, 0)
  b.block('stone', nl + 0.3, 0.9, NAVE.hw * 2 + 0.3, nx, 0, 0)
  // eaves cornice
  b.block('stone', nl, 0.35, NAVE.hw * 2 + 0.5, nx, NAVE.h - 0.35, 0)

  /* ---------------- choir + apse (single convex prism) ---------------- */
  const ring = (y: number, grow = 0) => {
    const hw = CHOIR.hw + grow
    const rc = RC + grow / Math.cos(deg(22.5))
    return [V(CHOIR.x0, y, -hw), apsePt(-67.5, rc, y), apsePt(-22.5, rc, y), apsePt(22.5, rc, y), apsePt(67.5, rc, y), V(CHOIR.x0, y, hw)]
  }
  b.add('wallC', loft([ring(0), ring(CHOIR.h)], { capTop: true, flat: true }))
  b.add('stone', loft([ring(0, 0.15), ring(0.9, 0.15)], { capTop: true, flat: true }))
  b.add('stone', loft([ring(CHOIR.h - 0.35, 0.25), ring(CHOIR.h, 0.25)], { capTop: true, flat: true }))

  /* ---------------- roofs (anthracite standing seam) ---------------- */
  const ov = 0.45
  const eY = NAVE.h - ov * T60
  // nave
  const nRidge = NAVE.h + NAVE.hw * T60
  const nhw = NAVE.hw + ov
  const xa = NAVE.x0 + 0.2
  const xb = NAVE.x1 + 0.35
  facet(b, 'alu', [V(xa, eY, nhw), V(xb, eY, nhw), V(xb, nRidge, 0), V(xa, nRidge, 0)], { seams: SEAM, thickness: 0.12 })
  facet(b, 'alu', [V(xb, eY, -nhw), V(xa, eY, -nhw), V(xa, nRidge, 0), V(xb, nRidge, 0)], { seams: SEAM, thickness: 0.12 })
  b.beam('alu', V(xa, nRidge + 0.08, 0), V(xb, nRidge + 0.08, 0), 0.32, 0.22)
  for (const sz of [-1, 1]) b.beam('alu', V(xa, eY - 0.1, sz * (nhw + 0.08)), V(xb, eY - 0.1, sz * (nhw + 0.08)), 0.22, 0.22)
  // nave gable walls (west behind tower, east above choir)
  const gable = new THREE.Shape([new THREE.Vector2(-NAVE.hw, NAVE.h - 0.01), new THREE.Vector2(NAVE.hw, NAVE.h - 0.01), new THREE.Vector2(0, nRidge - 0.05)])
  b.add('wallC', extrude(gable, 0.9), mat(NAVE.x1 - 0.9, 0, 0, Math.PI / 2))
  b.add('wallC', extrude(gable, 0.9), mat(NAVE.x0 + 0.9, 0, 0, -Math.PI / 2))
  // east gable rake flashing
  for (const sz of [-1, 1]) b.beam('alu', V(NAVE.x1 + 0.5, eY, sz * nhw), V(NAVE.x1 + 0.5, nRidge + 0.05, 0), 0.25, 0.5, V(1, 0, 0))

  // choir + apse
  const cRidge = CHOIR.h + CHOIR.hw * T60
  const chw = CHOIR.hw + ov
  const rcO = RC * (chw / CHOIR.hw)
  const apex = V(XC, cRidge, 0)
  const cx0 = CHOIR.x0 - 0.2
  const vS = V(XC + rcO * Math.cos(deg(67.5)), eY, chw)
  const vN = V(XC + rcO * Math.cos(deg(-67.5)), eY, -chw)
  facet(b, 'alu', [V(cx0, eY, chw), vS, apex, V(cx0, cRidge, 0)], { seams: SEAM, thickness: 0.12 })
  facet(b, 'alu', [vN, V(cx0, eY, -chw), V(cx0, cRidge, 0), apex], { seams: SEAM, thickness: 0.12 })
  const apseAngles = [67.5, 22.5, -22.5, -67.5]
  for (let i = 0; i < 3; i++) {
    const p1 = apsePt(apseAngles[i], rcO, eY)
    const p2 = apsePt(apseAngles[i + 1], rcO, eY)
    facet(b, 'alu', [p1, p2, apex], { seams: SEAM, thickness: 0.12 })
  }
  b.beam('alu', V(cx0, cRidge + 0.08, 0), V(apex.x, cRidge + 0.08, 0), 0.3, 0.2)
  // hip caps
  for (const a of apseAngles) b.beam('alu', apsePt(a, rcO, eY + 0.1), V(apex.x, apex.y + 0.1, 0), 0.26, 0.16)
  // apex finial (gilded) & nave east-gable finial
  b.add('gilt', new THREE.SphereGeometry(0.28, 12, 8), mat(apex.x, apex.y + 0.55, 0))
  b.rod('gilt', V(apex.x, apex.y, 0), V(apex.x, apex.y + 1.6, 0), 0.06)
  b.add('gilt', new THREE.SphereGeometry(0.28, 12, 8), mat(NAVE.x1 + 0.3, nRidge + 0.55, 0))
  b.rod('gilt', V(NAVE.x1 + 0.3, nRidge, 0), V(NAVE.x1 + 0.3, nRidge + 1.6, 0), 0.06)

  /* ---------------- buttresses ---------------- */
  for (const sz of [-1, 1]) {
    for (const x of [-10.6, -3.6, 3.4]) buttress(b, V(x, 0, sz * NAVE.hw), V(0, 0, sz))
    for (const x of [12.9, 16.6]) buttress(b, V(x, 0, sz * CHOIR.hw), V(0, 0, sz), 1.05, 1.7, 0.98)
  }
  // apse corner buttresses (radial)
  for (const a of [67.5, 22.5, -22.5, -67.5]) {
    const p = apsePt(a, RC, 0)
    buttress(b, p, V(Math.cos(deg(a)), 0, Math.sin(deg(a))), 1.0, 1.7, 0.98)
  }
  // nave east corners (diagonal)
  for (const sz of [-1, 1]) buttress(b, V(NAVE.x1, 0, sz * NAVE.hw), V(0.7, 0, sz * 0.7).normalize(), 1.05, 1.6, 0.95)

  /* ---------------- windows ---------------- */
  const wallM = (x: number, z: number, ry: number) => mat(x, 0, z, ry)
  for (const sz of [-1, 1]) {
    const ry = sz > 0 ? 0 : Math.PI
    for (const x of [-7.1, -0.1]) gothicWindow(b, wallM(x, sz * NAVE.hw, ry), 2.2, 6.4, 3.4)
    gothicWindow(b, wallM(6.2, sz * NAVE.hw, ry), 2.0, 6.0, 3.6)
    if (sz < 0) gothicWindow(b, wallM(-14.0, sz * NAVE.hw, ry), 1.8, 5.6, 3.8)
    gothicWindow(b, wallM(10.95, sz * CHOIR.hw, ry), 1.6, 5.8, 3.6)
    gothicWindow(b, wallM(14.75, sz * CHOIR.hw, ry), 1.6, 5.8, 3.6)
    gothicWindow(b, wallM(18.45, sz * CHOIR.hw, ry), 1.5, 5.6, 3.8)
  }
  // apse facets: windows on the three faces (normals 45°, 0°, -45°)
  for (const a of [45, 0, -45]) {
    const apo = CHOIR.hw
    const p = V(XC + apo * Math.cos(deg(a)), 0, apo * Math.sin(deg(a)))
    gothicWindow(b, mat(p.x, 0, p.z, Math.PI / 2 - deg(a)), 1.5, 5.6, 3.8)
  }

  /* ---------------- south porch (Gothic revival) ---------------- */
  {
    const px = -14.1
    const pw = 4.8
    const pd = 2.4
    const ph = 6.0
    const z0 = NAVE.hw
    const z1 = z0 + pd
    b.block('wallC', pw, ph, pd, px, 0, (z0 + z1) / 2)
    b.block('stone', pw + 0.3, 0.9, pd + 0.3, px, 0, (z0 + z1) / 2)
    // pointed front gable (extruded) rising above the porch
    const g = new THREE.Shape([
      new THREE.Vector2(-pw / 2, ph - 0.01),
      new THREE.Vector2(pw / 2, ph - 0.01),
      new THREE.Vector2(pw / 2, ph + 0.5),
      new THREE.Vector2(0, ph + 3.0),
      new THREE.Vector2(-pw / 2, ph + 0.5),
    ])
    b.add('wallC', extrude(g, 0.55), mat(px, 0, z1 - 0.55))
    // portal with moulded pointed surround
    const fm = mat(px, 0, z1)
    b.add('stone', extrude(frameShape('pointed', 2.0, 3.9, 0.45, 0, 0), 0.25), fm)
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 2.0, 3.9, 0, 0, 10))), new THREE.Matrix4().multiplyMatrices(fm, mat(0, 0, 0.03)))
    // outer pointed hood moulding reaching into the gable
    b.add('stone', extrude(frameShape('pointed', 3.3, 6.4, 0.22, 0, 0.2), 0.3), mat(px, 0, z1))
    // pinnacles
    for (const sx of [-1, 1]) {
      const x = px + sx * (pw / 2 - 0.25)
      b.block('stone', 0.5, ph + 1.0, 0.5, x, 0, z1 - 0.25)
      b.add('stone', new THREE.ConeGeometry(0.4, 1.4, 4, 1), mat(x, ph + 1.7, z1 - 0.25, Math.PI / 4))
    }
    // small anthracite gable roof running back into the nave wall
    const rY = ph + 0.15
    const rh = 1.9
    facet(b, 'alu', [V(px - pw / 2 - 0.3, rY, z1 - 0.5), V(px - pw / 2 - 0.3, rY, z0), V(px, rY + rh, z0), V(px, rY + rh, z1 - 0.5)], { seams: SEAM, hint: V(-1, 1, 0) })
    facet(b, 'alu', [V(px + pw / 2 + 0.3, rY, z0), V(px + pw / 2 + 0.3, rY, z1 - 0.5), V(px, rY + rh, z1 - 0.5), V(px, rY + rh, z0)], { seams: SEAM, hint: V(1, 1, 0) })
  }

  /* ---------------- west tower ---------------- */
  const tx = (TOWER.x0 + TOWER.x1) / 2
  const stages = [
    { y0: 0, y1: 12.6, hw: TOWER.hw },
    { y0: 13.3, y1: 21.6, hw: TOWER.hw - 0.25 },
    { y0: 22.3, y1: 30.4, hw: TOWER.hw - 0.45 },
  ]
  const cornices = [
    { y: 12.6, h: 0.7, hw: TOWER.hw + 0.35 },
    { y: 21.6, h: 0.7, hw: TOWER.hw + 0.12 },
    { y: 30.4, h: 0.95, hw: TOWER.hw + 0.05 },
  ]
  b.block('stone', TOWER.hw * 2 + 0.4, 1.1, TOWER.hw * 2 + 0.4, tx, 0, 0)
  stages.forEach((s) => {
    b.block('towerW', s.hw * 2, s.y1 - s.y0, s.hw * 2, tx, s.y0, 0)
    // paired corner pilasters
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      b.block('towerW', 0.75, s.y1 - s.y0, 0.2, tx + sx * (s.hw - 0.375), s.y0, sz * (s.hw + 0.1))
      b.block('towerW', 0.2, s.y1 - s.y0, 0.75, tx + sx * (s.hw + 0.1), s.y0, sz * (s.hw - 0.375))
    }
  })
  cornices.forEach((c) => {
    b.block('towerW', c.hw * 2, c.h * 0.45, c.hw * 2, tx, c.y, 0)
    b.block('towerW', c.hw * 2 + 0.3, c.h * 0.3, c.hw * 2 + 0.3, tx, c.y + c.h * 0.45, 0)
    b.block('towerW', c.hw * 2 + 0.1, c.h * 0.25, c.hw * 2 + 0.1, tx, c.y + c.h * 0.75, 0)
  })
  // tower openings per face (ry: west = -π/2 → local z → -x)
  const faces: { ry: number; d: (hw: number) => THREE.Vector3; west?: boolean; east?: boolean }[] = [
    { ry: -Math.PI / 2, d: (hw) => V(tx - hw, 0, 0), west: true },
    { ry: 0, d: (hw) => V(tx, 0, hw) },
    { ry: Math.PI, d: (hw) => V(tx, 0, -hw) },
    { ry: Math.PI / 2, d: (hw) => V(tx + hw, 0, 0), east: true },
  ]
  for (const f of faces) {
    if (f.east) {
      // only the belfry level is visible above the nave roof
      const p3 = f.d(stages[2].hw)
      const m3 = mat(p3.x, 0, p3.z, f.ry)
      b.add('towerW', extrude(frameShape('round', 1.5, 3.9, 0.3, 0, 23.4), 0.2), m3)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.5, 3.9, 0, 23.4))), new THREE.Matrix4().multiplyMatrices(m3, mat(0, 0, 0.02)))
      b.add('clock', new THREE.CylinderGeometry(0.95, 0.95, 0.12, 24), new THREE.Matrix4().multiplyMatrices(m3, mat(0, 28.9, 0.08, 0, Math.PI / 2)))
      continue
    }
    const p1 = f.d(stages[0].hw)
    const m1 = mat(p1.x, 0, p1.z, f.ry)
    if (f.west) {
      b.add('towerW', extrude(frameShape('round', 2.0, 3.8, 0.35, 0, 0.9), 0.22), m1)
      b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.0, 3.8, 0, 0.9))), new THREE.Matrix4().multiplyMatrices(m1, mat(0, 0, 0.03)))
    }
    // oculus (ground stage)
    b.add('towerW', new THREE.TorusGeometry(0.75, 0.2, 8, 24), new THREE.Matrix4().multiplyMatrices(m1, mat(0, 8.6, 0.12)))
    b.add('glassC', new THREE.CircleGeometry(0.72, 24), new THREE.Matrix4().multiplyMatrices(m1, mat(0, 8.6, 0.03)))
    // middle stage: oculus
    const p2 = f.d(stages[1].hw)
    const m2 = mat(p2.x, 0, p2.z, f.ry)
    b.add('towerW', new THREE.TorusGeometry(0.85, 0.22, 8, 24), new THREE.Matrix4().multiplyMatrices(m2, mat(0, 17.6, 0.12)))
    b.add('glassC', new THREE.CircleGeometry(0.82, 24), new THREE.Matrix4().multiplyMatrices(m2, mat(0, 17.6, 0.03)))
    // belfry: arched louvred opening + clock
    const p3 = f.d(stages[2].hw)
    const m3 = mat(p3.x, 0, p3.z, f.ry)
    b.add('towerW', extrude(frameShape('round', 1.5, 3.9, 0.3, 0, 23.4), 0.2), m3)
    b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.5, 3.9, 0, 23.4))), new THREE.Matrix4().multiplyMatrices(m3, mat(0, 0, 0.02)))
    for (let i = 0; i < 6; i++) b.add('wood', metricBox(1.5, 0.08, 0.14), new THREE.Matrix4().multiplyMatrices(m3, mat(0, 23.8 + i * 0.5, 0.06, 0, 0.5)))
    b.add('clock', new THREE.CylinderGeometry(0.95, 0.95, 0.12, 24), new THREE.Matrix4().multiplyMatrices(m3, mat(0, 28.9, 0.08, 0, Math.PI / 2)))
    b.add('towerW', new THREE.TorusGeometry(1.0, 0.1, 6, 24), new THREE.Matrix4().multiplyMatrices(m3, mat(0, 28.9, 0.14)))
    b.add('gilt', metricBox(0.08, 0.7, 0.04), new THREE.Matrix4().multiplyMatrices(m3, mat(0, 29.15, 0.18)))
    b.add('gilt', metricBox(0.5, 0.08, 0.04), new THREE.Matrix4().multiplyMatrices(m3, mat(0.22, 28.9, 0.18)))
  }
  // corner urns on the top cornice
  const topY = cornices[2].y + cornices[2].h
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) urn(b, tx + sx * (TOWER.hw - 0.3), topY, sz * (TOWER.hw - 0.3), 1.1)

  /* ---------------- baroque helm ---------------- */
  const bell: [number, number][] = [
    [3.75, topY],
    [3.62, topY + 0.35],
    [3.3, topY + 1.0],
    [2.85, topY + 1.8],
    [2.4, topY + 2.7],
    [2.0, topY + 3.6],
    [1.7, topY + 4.4],
    [1.52, topY + 5.0],
  ]
  b.add('helm', squareLoft(bell, tx, 0))
  // oculus dormers on the bell (one per face)
  for (const f of faces) {
    const hwAt = 3.05
    const p = f.d(hwAt)
    const m = mat(p.x, 0, p.z, f.ry)
    b.add('helm', metricBox(1.5, 1.7, 1.5), new THREE.Matrix4().multiplyMatrices(m, mat(0, topY + 1.85, 0.2)))
    b.add('helm', new THREE.CylinderGeometry(0.85, 0.85, 1.6, 16, 1, false, -Math.PI / 2, Math.PI), new THREE.Matrix4().multiplyMatrices(m, mat(0, topY + 2.7, 0.2, 0, -Math.PI / 2)))
    b.add('towerW', new THREE.TorusGeometry(0.45, 0.11, 6, 20), new THREE.Matrix4().multiplyMatrices(m, mat(0, topY + 1.9, 0.98)))
    b.add('clock', new THREE.CircleGeometry(0.42, 20), new THREE.Matrix4().multiplyMatrices(m, mat(0, topY + 1.9, 0.96)))
  }
  // small cornice with urns
  const neckY = topY + 5.0
  b.block('towerW', 3.6, 0.35, 3.6, tx, neckY, 0)
  b.block('towerW', 3.9, 0.25, 3.9, tx, neckY + 0.35, 0)
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) urn(b, tx + sx * 1.7, neckY + 0.6, sz * 1.7, 0.55)
  // tall concave spire
  const sy = neckY + 0.6
  const spire: [number, number][] = [
    [1.55, sy],
    [1.3, sy + 0.9],
    [1.0, sy + 2.3],
    [0.74, sy + 3.8],
    [0.52, sy + 5.3],
    [0.33, sy + 6.7],
    [0.18, sy + 7.9],
    [0.07, sy + 8.9],
    [0.02, sy + 9.4],
  ]
  b.add('helm', squareLoft(spire, tx, 0))
  // gilded globe, rod, star
  const gy = sy + 9.4
  b.add('gilt', new THREE.SphereGeometry(0.45, 16, 12), mat(tx, gy + 0.3, 0))
  b.rod('gilt', V(tx, gy, 0), V(tx, gy + 2.4, 0), 0.06)
  const star = new THREE.Shape()
  for (let i = 0; i < 12; i++) {
    const r = i % 2 ? 0.22 : 0.62
    const a = (i / 12) * Math.PI * 2 + Math.PI / 2
    if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else star.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  b.add('gilt', extrude(star, 0.06), mat(tx, gy + 2.0, -0.03))

  return b
}
