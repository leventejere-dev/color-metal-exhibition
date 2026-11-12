import { useEffect, useMemo, useRef } from 'react'
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { tableState, useStore, type ModelId, type ViewPreset } from '../store'
import { furnitureColliders, moduleTargets } from './Installation'
import { BASE_H, EXPLODE_HEIGHT, LIFT_HEIGHT, MODULES, PARK_DISTANCE, SLOTS, TABLE, moduleOf } from './layout'

const { ACTION } = CameraControlsImpl
const DEG = Math.PI / 180

const FOCUS: Record<ModelId, { dist: number; elev: number; az: number }> = {
  stadium: { dist: 2.1, elev: 22, az: 12 },
  church: { dist: 2.55, elev: 11, az: 28 },
  manor: { dist: 2.2, elev: 22, az: 18 },
  garage: { dist: 2.05, elev: 20, az: 30 },
}

/** World position of a point given in a module's own frame (uses the module's target offset). */
function moduleWorld(id: ModelId, lx: number, lz: number) {
  const t = moduleTargets(useStore.getState())[id]
  const a = moduleOf(id).angleDeg * DEG
  const ix = t[0] + lx * Math.cos(a) + lz * Math.sin(a)
  const iz = t[1] - lx * Math.sin(a) + lz * Math.cos(a)
  const A = tableState.angle
  return { x: ix * Math.cos(A) + iz * Math.sin(A), z: -ix * Math.sin(A) + iz * Math.cos(A), bisector: a + A }
}

/** Camera looking at `t` from horizontal angle `az`, elevation `el`, distance `d`. */
const orbit = (tx: number, ty: number, tz: number, az: number, el: number, d: number) => [
  tx + Math.sin(az) * Math.cos(el) * d,
  ty + Math.sin(el) * d,
  tz + Math.cos(az) * Math.cos(el) * d,
  tx,
  ty,
  tz,
]

/** Camera position/target for a preset: [px, py, pz, tx, ty, tz]. */
export function presetLookAt(preset: ViewPreset, aspect: number): number[] {
  const fit = Math.max(1, 1.55 / aspect)
  const st = useStore.getState()
  const focus = st.focus
  switch (preset) {
    case 'overview':
      return orbit(0, 1.0, 0, 30 * DEG, 28 * DEG, 6.1 * Math.max(1, 1.1 / aspect))
    case 'top': {
      // frame whatever is on the floor
      const targets = moduleTargets(st)
      let ext = 1.45
      for (const m of MODULES) {
        const d = Math.hypot(...targets[m.model])
        if (d < PARK_DISTANCE - 1) ext = Math.max(ext, d + 1.45)
      }
      return [0, TABLE.height + 4.3 * ext * fit, 0.02, 0, TABLE.height, 0]
    }
    case 'front':
      return [0, 1.45, 6.0 * fit, 0, 1.02, 0]
    case 'separated':
      return orbit(0, 0.6, 0, 30 * DEG, 34 * DEG, 10.2 * Math.max(1, 0.95 / aspect))
    case 'layout': {
      // frame the modules that are on the floor (semicircle, three-quarter, two semicircles)
      const targets = moduleTargets(st)
      const pts: { x: number; z: number }[] = []
      for (const m of MODULES) {
        const d = Math.hypot(...targets[m.model])
        if (d < PARK_DISTANCE - 1) pts.push(moduleWorld(m.model, 0, 0.62))
      }
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
      const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length
      const ext = Math.max(...pts.map((p) => Math.hypot(p.x - cx, p.z - cz))) + 0.9
      const fa = moduleWorld(focus, 0, 1).bisector
      const az = st.config === 'pairs' ? fa + 45 * DEG + 90 * DEG : Math.hypot(cx, cz) > 0.05 ? Math.atan2(cx, cz) + 20 * DEG : fa + 20 * DEG
      return orbit(cx, 0.7, cz, az, 30 * DEG, (2.6 + ext * 2.6) * fit)
    }
    case 'podium': {
      const c = moduleWorld(focus, 0, 0.68)
      return orbit(c.x, 0.72, c.z, c.bisector + 22 * DEG, 26 * DEG, 3.7 * fit)
    }
    case 'casters': {
      // the middle perimeter caster, seen low from straight outside the module (clear of the neighbours)
      const c = moduleWorld(focus, 0, 1.04)
      const az = c.bisector + 16 * DEG
      const d = 1.45 * Math.max(1, 1.3 / aspect)
      return [c.x + Math.sin(az) * d, 0.2, c.z + Math.cos(az) * d, c.x, 0.08, c.z]
    }
    case 'connection': {
      const a = moduleWorld(focus, 0, 0)
      const b = moduleWorld(MODULES.find((m) => ((m.angleDeg - moduleOf(focus).angleDeg + 360) % 360) === 90)!.model, 0, 0)
      const joint = a.bisector + 45 * DEG
      // look straight into the opened joint: pins and latch on one face, bushings and keeper on the other
      const mx = (a.x + b.x) / 2 + Math.sin(joint) * 0.75
      const mz = (a.z + b.z) / 2 + Math.cos(joint) * 0.75
      return orbit(mx, 0.66, mz, joint + 2 * DEG, 17 * DEG, 3.0 * Math.max(1, 1.25 / aspect))
    }
    case 'construction': {
      const c = moduleWorld(focus, 0, 0.75)
      return orbit(c.x, 0.55, c.z, c.bisector + 26 * DEG, 18 * DEG, 3.1 * Math.max(1, 1.3 / aspect))
    }
    default: {
      const slot = SLOTS.find((s) => s.id === preset)!
      const lift = st.lifted[slot.id] ? LIFT_HEIGHT : st.exploded ? EXPLODE_HEIGHT : 0
      const p = moduleWorld(slot.id, 0, slot.radius)
      const f = FOCUS[slot.id]
      const d = f.dist * Math.max(1, 1.25 / aspect)
      return orbit(p.x, TABLE.height + BASE_H + slot.centerY + lift, p.z, p.bisector + f.az * DEG, f.elev * DEG, d)
    }
  }
}

export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null!)
  const { size } = useThree()
  const view = useStore((s) => s.view)
  const mode = useStore((s) => s.mode)

  // invisible floor collider; the furniture modules register their own quarter colliders
  const floor = useMemo(() => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(60, 0.1, 60), new THREE.MeshBasicMaterial({ visible: false }))
    f.position.y = -0.05
    f.updateMatrixWorld()
    return f
  }, [])

  useEffect(() => {
    const c = ref.current
    if (!c) return
    if (!furnitureColliders.includes(floor)) furnitureColliders.push(floor)
    c.minDistance = 0.3
    c.maxDistance = 24
    c.minPolarAngle = 0.01
    c.maxPolarAngle = 88 * DEG
    c.smoothTime = 0.38
    c.draggingSmoothTime = 0.1
    c.dollyToCursor = true
    c.dollySpeed = 0.55
    c.azimuthRotateSpeed = 0.75
    c.polarRotateSpeed = 0.75
    c.truckSpeed = 1.4
    c.colliderMeshes = furnitureColliders
    c.setBoundary(new THREE.Box3(new THREE.Vector3(-14, 0.05, -14), new THREE.Vector3(14, 16, 14)))
    c.mouseButtons.right = ACTION.TRUCK
    c.mouseButtons.middle = ACTION.DOLLY
    c.mouseButtons.wheel = ACTION.DOLLY
    c.touches.two = ACTION.TOUCH_DOLLY_TRUCK
    c.touches.three = ACTION.TOUCH_TRUCK
    const p = presetLookAt('overview', size.width / size.height)
    c.setLookAt(p[0], p[1], p[2], p[3], p[4], p[5], false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor])

  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.mouseButtons.left = mode === 'rotate' ? ACTION.NONE : ACTION.ROTATE
    c.touches.one = mode === 'rotate' ? ACTION.NONE : ACTION.TOUCH_ROTATE
  }, [mode])

  useEffect(() => {
    if (view.nonce === 0) return
    const c = ref.current
    const p = presetLookAt(view.preset, size.width / size.height)
    c.setLookAt(p[0], p[1], p[2], p[3], p[4], p[5], true)
    // only react to explicit requests
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  return <CameraControls ref={ref} makeDefault />
}
