/**
 * Procedural geometry toolkit used to construct the three architectural models.
 *
 * All building geometry is authored in real-world metres (1 unit = 1 m of the
 * real building) and later scaled down to the ~1 m model size. UVs are
 * generated in metres as well, so tiling metal-panel textures line up with the
 * standing seams regardless of the model scale.
 *
 * Geometry is accumulated per material in a Builder and merged into a single
 * mesh per material, which keeps draw calls low (one per material per model).
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const UP = V(0, 1, 0)

/** Compose a transform. Rotation order: Rz, then Rx, then Ry (Euler 'YXZ'). */
export function mat(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'))
  return m.compose(V(x, y, z), q, V(sx, sy, sz))
}

/** Box geometry whose UVs are expressed in metres on every face. */
export function metricBox(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d)
  const uv = g.attributes.uv as THREE.BufferAttribute
  // face order: +x, -x, +y, -y, +z, -z ; 4 verts each
  const dims: [number, number][] = [
    [d, h], [d, h], [w, d], [w, d], [w, h], [w, h],
  ]
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i
      uv.setXY(idx, uv.getX(idx) * dims[f][0], uv.getY(idx) * dims[f][1])
    }
  }
  return g
}

export class Builder {
  private parts = new Map<string, THREE.BufferGeometry[]>()

  add(key: string, g: THREE.BufferGeometry, m?: THREE.Matrix4) {
    const geo = g.index ? g.toNonIndexed() : g.clone()
    for (const name of Object.keys(geo.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name)
    }
    if (!geo.attributes.normal) geo.computeVertexNormals()
    if (!geo.attributes.uv) {
      const n = geo.attributes.position.count
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2))
    }
    geo.morphAttributes = {}
    geo.clearGroups()
    if (m) geo.applyMatrix4(m)
    const list = this.parts.get(key)
    if (list) list.push(geo)
    else this.parts.set(key, [geo])
    return this
  }

  /** Centre-positioned box. */
  box(key: string, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) {
    return this.add(key, metricBox(w, h, d), mat(x, y, z, ry, rx, rz))
  }

  /** Box sitting on y0 (bottom at y0). */
  block(key: string, w: number, h: number, d: number, x: number, y0: number, z: number, ry = 0) {
    return this.box(key, w, h, d, x, y0 + h / 2, z, ry)
  }

  /** Beam between two points with a w×h cross-section. */
  beam(key: string, a: THREE.Vector3, b: THREE.Vector3, w: number, h: number, up: THREE.Vector3 = UP) {
    const d = V().subVectors(b, a)
    const L = d.length()
    if (L < 1e-5) return this
    d.normalize()
    let side = V().crossVectors(d, up)
    if (side.lengthSq() < 1e-6) side = V().crossVectors(d, V(1, 0, 0))
    side.normalize()
    const up2 = V().crossVectors(side, d).normalize()
    const m = new THREE.Matrix4().makeBasis(side, up2, d)
    m.setPosition(V().addVectors(a, b).multiplyScalar(0.5))
    return this.add(key, metricBox(w, h, L), m)
  }

  /** Cylinder between two points. */
  rod(key: string, a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 8) {
    const d = V().subVectors(b, a)
    const L = d.length()
    if (L < 1e-5) return this
    const g = new THREE.CylinderGeometry(r, r, L, seg, 1, false)
    const q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize())
    const m = new THREE.Matrix4().compose(V().addVectors(a, b).multiplyScalar(0.5), q, V(1, 1, 1))
    return this.add(key, g, m)
  }

  merge(other: Builder, m?: THREE.Matrix4) {
    for (const [k, list] of other.parts) for (const g of list) this.add(k, g, m)
    return this
  }

  build(materials: Record<string, THREE.Material>, name = 'model') {
    const group = new THREE.Group()
    group.name = name
    for (const [key, list] of this.parts) {
      const merged = mergeGeometries(list, false)
      list.forEach((g) => g.dispose())
      if (!merged) continue
      merged.computeBoundingSphere()
      const material = materials[key]
      if (!material) {
        console.warn('Missing material', key)
        continue
      }
      const mesh = new THREE.Mesh(merged, material)
      mesh.name = `${name}:${key}`
      mesh.castShadow = !(material as THREE.Material & { userData: Record<string, unknown> }).userData?.noCast
      mesh.receiveShadow = true
      group.add(mesh)
    }
    this.parts.clear()
    return group
  }
}

/* ------------------------------------------------------------------ */
/* Planar facets (roofs, gables) with optional standing seams          */
/* ------------------------------------------------------------------ */

export interface SeamSpec {
  key: string
  spacing: number
  h: number
  w: number
  offset?: number
  /** skip seams closer than this to the u-extent edges */
  margin?: number
}

/**
 * Adds a planar convex polygon. Normal is oriented along `hint` (default up).
 * UVs: u along the horizontal of the facet, v up the slope (metres).
 * Optionally adds standing seams running up the slope, clipped to the polygon.
 */
export function facet(
  b: Builder,
  key: string,
  ptsIn: THREE.Vector3[],
  opts: { seams?: SeamSpec; hint?: THREE.Vector3; thickness?: number } = {},
) {
  let pts = ptsIn
  const n = V().subVectors(pts[1], pts[0]).cross(V().subVectors(pts[2], pts[0]))
  if (n.lengthSq() < 1e-12) return
  n.normalize()
  const hint = opts.hint ?? UP
  if (n.dot(hint) < 0) {
    pts = [...pts].reverse()
    n.negate()
  }
  let vdir = UP.clone().sub(n.clone().multiplyScalar(n.dot(UP)))
  if (vdir.lengthSq() < 1e-6) vdir = V(0, 0, -1).sub(n.clone().multiplyScalar(n.dot(V(0, 0, -1))))
  vdir.normalize()
  const udir = V().crossVectors(vdir, n).normalize()

  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const push = (p: THREE.Vector3) => {
    pos.push(p.x, p.y, p.z)
    nor.push(n.x, n.y, n.z)
    uv.push(p.dot(udir), p.dot(vdir))
  }
  for (let i = 1; i < pts.length - 1; i++) {
    push(pts[0])
    push(pts[i])
    push(pts[i + 1])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  b.add(key, g)

  if (opts.thickness) {
    // underside (for overhangs seen from below)
    const back = new THREE.BufferGeometry()
    const p2: number[] = []
    const n2: number[] = []
    const off = n.clone().multiplyScalar(-opts.thickness)
    for (let i = 1; i < pts.length - 1; i++) {
      for (const p of [pts[0], pts[i + 1], pts[i]]) {
        const q = p.clone().add(off)
        p2.push(q.x, q.y, q.z)
        n2.push(-n.x, -n.y, -n.z)
      }
    }
    back.setAttribute('position', new THREE.Float32BufferAttribute(p2, 3))
    back.setAttribute('normal', new THREE.Float32BufferAttribute(n2, 3))
    b.add(key, back)
  }

  const s = opts.seams
  if (s) {
    const poly = pts.map((p) => [p.dot(udir), p.dot(vdir)] as [number, number])
    const d = pts[0].dot(n)
    let umin = Infinity
    let umax = -Infinity
    for (const [u] of poly) {
      umin = Math.min(umin, u)
      umax = Math.max(umax, u)
    }
    const off = s.offset ?? 0
    const margin = s.margin ?? s.spacing * 0.35
    const k0 = Math.ceil((umin + margin - off) / s.spacing)
    const k1 = Math.floor((umax - margin - off) / s.spacing)
    const basis = new THREE.Matrix4().makeBasis(udir, vdir, n)
    for (let k = k0; k <= k1; k++) {
      const u = off + k * s.spacing
      let vmin = Infinity
      let vmax = -Infinity
      for (let i = 0; i < poly.length; i++) {
        const [ua, va] = poly[i]
        const [ub, vb] = poly[(i + 1) % poly.length]
        if ((u - ua) * (u - ub) <= 0 && Math.abs(ub - ua) > 1e-9) {
          const t = (u - ua) / (ub - ua)
          const v = va + t * (vb - va)
          vmin = Math.min(vmin, v)
          vmax = Math.max(vmax, v)
        }
      }
      const len = vmax - vmin
      if (!(len > s.spacing * 0.4)) continue
      const c = udir.clone().multiplyScalar(u).add(vdir.clone().multiplyScalar((vmin + vmax) / 2)).add(n.clone().multiplyScalar(d + s.h / 2))
      const m = basis.clone().setPosition(c)
      b.add(s.key, metricBox(s.w, len, s.h), m)
    }
  }
}

/** Hip roof over an axis-aligned rectangle. Returns facets & ridge/hip lines. */
export function hipRoof(cx: number, cz: number, w: number, d: number, y0: number, pitch: number) {
  const hw = w / 2
  const hd = d / 2
  const t = Math.tan(pitch)
  const facets: THREE.Vector3[][] = []
  const lines: [THREE.Vector3, THREE.Vector3][] = []
  const c00 = V(cx - hw, y0, cz - hd)
  const c10 = V(cx + hw, y0, cz - hd)
  const c11 = V(cx + hw, y0, cz + hd)
  const c01 = V(cx - hw, y0, cz + hd)
  if (w >= d) {
    const h = hd * t
    const r1 = V(cx - (hw - hd), y0 + h, cz)
    const r2 = V(cx + (hw - hd), y0 + h, cz)
    facets.push([c01, c11, r2, r1], [c10, c00, r1, r2], [c00, c01, r1], [c11, c10, r2])
    lines.push([r1, r2], [c00, r1], [c01, r1], [c10, r2], [c11, r2])
    return { facets, lines, top: y0 + h }
  }
  const h = hw * t
  const r1 = V(cx, y0 + h, cz - (hd - hw))
  const r2 = V(cx, y0 + h, cz + (hd - hw))
  facets.push([c01, c11, r2], [c10, c00, r1], [c00, c01, r2, r1], [c11, c10, r1, r2])
  lines.push([r1, r2], [c00, r1], [c10, r1], [c01, r2], [c11, r2])
  return { facets, lines, top: y0 + h }
}

/** Lower part of a mansard / pavilion roof: 4 trapezoids from the eave rectangle to an inset curb rectangle. */
export function truncatedHip(cx: number, cz: number, w: number, d: number, y0: number, pitch: number, rise: number) {
  const inset = rise / Math.tan(pitch)
  const hw = w / 2
  const hd = d / 2
  const iw = hw - inset
  const id = hd - inset
  const y1 = y0 + rise
  const e = [V(cx - hw, y0, cz - hd), V(cx + hw, y0, cz - hd), V(cx + hw, y0, cz + hd), V(cx - hw, y0, cz + hd)]
  const c = [V(cx - iw, y1, cz - id), V(cx + iw, y1, cz - id), V(cx + iw, y1, cz + id), V(cx - iw, y1, cz + id)]
  const facets = [
    [e[3], e[2], c[2], c[3]], // +z
    [e[1], e[0], c[0], c[1]], // -z
    [e[0], e[3], c[3], c[0]], // -x
    [e[2], e[1], c[1], c[2]], // +x
  ]
  const lines: [THREE.Vector3, THREE.Vector3][] = [0, 1, 2, 3].map((i) => [e[i], c[i]])
  return { facets, lines, curb: { w: iw * 2, d: id * 2, y: y1 }, corners: c }
}

/* ------------------------------------------------------------------ */
/* Lofts (spires, tiers, helms)                                        */
/* ------------------------------------------------------------------ */

/** Rectangular ring, ordered so that loft() produces outward-facing sides. */
export function rectRing(hx: number, hz: number, y: number, cx = 0, cz = 0) {
  return [V(cx - hx, y, cz - hz), V(cx + hx, y, cz - hz), V(cx + hx, y, cz + hz), V(cx - hx, y, cz + hz)]
}

/** Regular polygon ring (n sides), first vertex at angle `phase`. Ordered for outward sides. */
export function polyRing(n: number, r: number, y: number, phase = 0, cx = 0, cz = 0) {
  const out: THREE.Vector3[] = []
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2
    out.push(V(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r))
  }
  return out
}

/**
 * Connect consecutive rings (same vertex count). Each side is shaded smoothly
 * along the profile but stays sharp at the corners. `flat` forces faceted shading.
 */
export function loft(rings: THREE.Vector3[][], opts: { capTop?: boolean; capBottom?: boolean; flat?: boolean } = {}) {
  const n = rings[0].length
  const geos: THREE.BufferGeometry[] = []
  for (let k = 0; k < n; k++) {
    const k2 = (k + 1) % n
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    let vAcc = 0
    for (let i = 0; i < rings.length; i++) {
      const a = rings[i][k]
      const b2 = rings[i][k2]
      if (i > 0) {
        const pa = rings[i - 1][k].clone().add(rings[i - 1][k2]).multiplyScalar(0.5)
        const pb = a.clone().add(b2).multiplyScalar(0.5)
        vAcc += pa.distanceTo(pb)
      }
      const w = a.distanceTo(b2)
      pos.push(a.x, a.y, a.z, b2.x, b2.y, b2.z)
      uv.push(0, vAcc, w, vAcc)
    }
    for (let i = 0; i < rings.length - 1; i++) {
      const lk = 2 * i
      const lk2 = 2 * i + 1
      const uk = 2 * (i + 1)
      const uk2 = 2 * (i + 1) + 1
      idx.push(lk, uk, uk2, lk, uk2, lk2)
    }
    let g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    if (opts.flat) {
      g = g.toNonIndexed()
      g.computeVertexNormals()
    } else {
      g.computeVertexNormals()
      g = g.toNonIndexed()
    }
    geos.push(g)
  }
  const cap = (ring: THREE.Vector3[], top: boolean) => {
    const pos: number[] = []
    const nor: number[] = []
    const uv: number[] = []
    for (let k = 1; k < ring.length - 1; k++) {
      const tri = top ? [ring[0], ring[k + 1], ring[k]] : [ring[0], ring[k], ring[k + 1]]
      for (const p of tri) {
        pos.push(p.x, p.y, p.z)
        nor.push(0, top ? 1 : -1, 0)
        uv.push(p.x, p.z)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geos.push(g)
  }
  if (opts.capTop) cap(rings[rings.length - 1], true)
  if (opts.capBottom) cap(rings[0], false)
  const merged = mergeGeometries(geos, false)
  geos.forEach((g) => g.dispose())
  return merged
}

/** Square/rect frustum between two heights (flat shaded). */
export function frustum(bx: number, bz: number, tx: number, tz: number, y0: number, y1: number, cx = 0, cz = 0, caps = true) {
  return loft([rectRing(bx, bz, y0, cx, cz), rectRing(tx, tz, y1, cx, cz)], { capTop: caps, capBottom: caps, flat: true })
}

/* ------------------------------------------------------------------ */
/* 2D outlines for openings & extruded wall pieces                     */
/* ------------------------------------------------------------------ */

export type OpeningType = 'rect' | 'round' | 'segment' | 'pointed' | 'bell'

/** Closed outline (CCW) of an opening of width w and total height h, bottom-centre at (cx, y0). */
export function opening(type: OpeningType, w: number, h: number, cx = 0, y0 = 0, seg = 14): THREE.Vector2[] {
  const hw = w / 2
  const pts: THREE.Vector2[] = []
  if (type === 'rect') {
    pts.push(new THREE.Vector2(cx - hw, y0), new THREE.Vector2(cx + hw, y0), new THREE.Vector2(cx + hw, y0 + h), new THREE.Vector2(cx - hw, y0 + h))
    return pts
  }
  if (type === 'round') {
    const ys = y0 + h - hw
    pts.push(new THREE.Vector2(cx - hw, y0), new THREE.Vector2(cx + hw, y0))
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI
      pts.push(new THREE.Vector2(cx + Math.cos(a) * hw, ys + Math.sin(a) * hw))
    }
    return pts
  }
  if (type === 'segment') {
    const rise = w * 0.18
    const ys = y0 + h - rise
    const R = (hw * hw + rise * rise) / (2 * rise)
    const cy = ys + rise - R
    const a0 = Math.asin(hw / R)
    pts.push(new THREE.Vector2(cx - hw, y0), new THREE.Vector2(cx + hw, y0))
    for (let i = 0; i <= seg; i++) {
      const x = cx + R * Math.sin(a0 - (i / seg) * 2 * a0)
      const y = cy + R * Math.cos(a0 - (i / seg) * 2 * a0)
      pts.push(new THREE.Vector2(x, y))
    }
    return pts
  }
  if (type === 'bell') {
    // tall stilted arch with steep sides (Sepsi pavilion openings)
    const ys = y0 + h - hw * 1.15
    pts.push(new THREE.Vector2(cx - hw, y0), new THREE.Vector2(cx + hw, y0))
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI
      pts.push(new THREE.Vector2(cx + Math.cos(a) * hw, ys + Math.sin(a) * hw * 1.15))
    }
    return pts
  }
  // pointed (equilateral gothic arch)
  const ys = y0 + h - w * Math.sin(Math.PI / 3)
  pts.push(new THREE.Vector2(cx - hw, y0), new THREE.Vector2(cx + hw, y0), new THREE.Vector2(cx + hw, ys))
  // right arc: centre at left springing point, radius w, from angle 0 to 60°
  for (let i = 1; i <= seg; i++) {
    const a = (i / seg) * (Math.PI / 3)
    pts.push(new THREE.Vector2(cx - hw + Math.cos(a) * w, ys + Math.sin(a) * w))
  }
  // left arc: centre at right springing point, from 120° to 180°
  for (let i = 1; i <= seg; i++) {
    const a = Math.PI * (2 / 3) + (i / seg) * (Math.PI / 3)
    pts.push(new THREE.Vector2(cx + hw + Math.cos(a) * w, ys + Math.sin(a) * w))
  }
  return pts
}

/** Extrude a 2D shape (in XY) by depth along +Z. */
export function extrude(shape: THREE.Shape, depth: number, curveSegments = 12) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments })
}

/** A flat frame ring around an opening outline (outer = opening grown by f). */
export function frameShape(type: OpeningType, w: number, h: number, f: number, cx = 0, y0 = 0) {
  const outer = new THREE.Shape(opening(type, w + 2 * f, h + f + (type === 'rect' ? f : f * 0.6), cx, y0 - f))
  outer.holes.push(new THREE.Path(opening(type, w, h, cx, y0)))
  return outer
}

/** A wall panel with holes (openings), in local XY, extruded by depth. */
export function wallWithOpenings(w: number, h: number, depth: number, holes: THREE.Vector2[][], x0 = -w / 2, y0 = 0) {
  const s = new THREE.Shape([new THREE.Vector2(x0, y0), new THREE.Vector2(x0 + w, y0), new THREE.Vector2(x0 + w, y0 + h), new THREE.Vector2(x0, y0 + h)])
  for (const hole of holes) s.holes.push(new THREE.Path(hole))
  return extrude(s, depth)
}

/** Matrix that maps local (x along wall, y up, z out of wall) onto a wall whose outward normal is at angle ry. */
export function wallFrame(x: number, y: number, z: number, ry: number) {
  return mat(x, y, z, ry)
}

/** Lathe (round) geometry from [r, y] profile. */
export function lathe(profile: [number, number][], seg = 16) {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)),
    seg,
  )
}

/** Deterministic pseudo-random generator for stable procedural variation. */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
