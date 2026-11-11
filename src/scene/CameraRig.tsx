import { useEffect, useMemo, useRef } from 'react'
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { tableState, useStore, type ViewPreset } from '../store'
import { BASE_H, EXPLODE_HEIGHT, LIFT_HEIGHT, SLOTS, TABLE } from './layout'

const { ACTION } = CameraControlsImpl
const DEG = Math.PI / 180

const FOCUS: Record<string, { dist: number; elev: number; az: number }> = {
  stadium: { dist: 2.1, elev: 22, az: 12 },
  church: { dist: 2.55, elev: 11, az: 28 },
  manor: { dist: 2.2, elev: 22, az: 18 },
  garage: { dist: 2.05, elev: 20, az: 30 },
}

/** Camera position/target for a preset: [px, py, pz, tx, ty, tz]. */
export function presetLookAt(preset: ViewPreset, aspect: number): number[] {
  const fit = Math.max(1, 1.55 / aspect)
  switch (preset) {
    case 'overview': {
      const t = new THREE.Vector3(0, 1.0, 0)
      const d = 6.1 * fit
      const az = 25 * DEG
      const pol = 62 * DEG
      return [t.x + d * Math.sin(pol) * Math.sin(az), t.y + d * Math.cos(pol), t.z + d * Math.sin(pol) * Math.cos(az), t.x, t.y, t.z]
    }
    case 'top':
      return [0, TABLE.height + 6.2 * fit, 0.02, 0, TABLE.height, 0]
    case 'front':
      return [0, 1.45, 6.0 * fit, 0, 1.02, 0]
    default: {
      const slot = SLOTS.find((s) => s.id === preset)!
      const st = useStore.getState()
      const lift = st.lifted[slot.id] ? LIFT_HEIGHT : st.exploded ? EXPLODE_HEIGHT : 0
      const wa = slot.angleDeg * DEG + tableState.angle
      const t = new THREE.Vector3(Math.sin(wa) * slot.radius, TABLE.height + BASE_H + slot.centerY + lift, Math.cos(wa) * slot.radius)
      const f = FOCUS[slot.id]
      const da = wa + f.az * DEG
      const d = f.dist * Math.max(1, 1.25 / aspect)
      const e = f.elev * DEG
      return [t.x + Math.sin(da) * d * Math.cos(e), t.y + d * Math.sin(e), t.z + Math.cos(da) * d * Math.cos(e), t.x, t.y, t.z]
    }
  }
}

export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null!)
  const { size } = useThree()
  const view = useStore((s) => s.view)
  const mode = useStore((s) => s.mode)

  // invisible collision proxies: the camera never passes through the table or floor
  const colliders = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ visible: false })
    const table = new THREE.Mesh(new THREE.CylinderGeometry(TABLE.radius + 0.05, TABLE.radius + 0.05, TABLE.height, 48), m)
    table.position.y = TABLE.height / 2
    const floor = new THREE.Mesh(new THREE.BoxGeometry(40, 0.1, 40), m)
    floor.position.y = -0.05
    ;[table, floor].forEach((o) => o.updateMatrixWorld())
    return [table, floor]
  }, [])

  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.minDistance = 0.3
    c.maxDistance = 11
    c.minPolarAngle = 0.01
    c.maxPolarAngle = 86 * DEG
    c.smoothTime = 0.32
    c.draggingSmoothTime = 0.1
    c.dollyToCursor = true
    c.dollySpeed = 0.55
    c.azimuthRotateSpeed = 0.75
    c.polarRotateSpeed = 0.75
    c.truckSpeed = 1.4
    c.colliderMeshes = colliders
    c.setBoundary(new THREE.Box3(new THREE.Vector3(-2.4, 0.15, -2.4), new THREE.Vector3(2.4, 2.6, 2.4)))
    c.mouseButtons.right = ACTION.TRUCK
    c.mouseButtons.middle = ACTION.DOLLY
    c.mouseButtons.wheel = ACTION.DOLLY
    c.touches.two = ACTION.TOUCH_DOLLY_TRUCK
    c.touches.three = ACTION.TOUCH_TRUCK
    const p = presetLookAt('overview', size.width / size.height)
    c.setLookAt(p[0], p[1], p[2], p[3], p[4], p[5], false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colliders])

  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.mouseButtons.left = mode === 'rotate' ? ACTION.NONE : ACTION.ROTATE
    c.touches.one = mode === 'rotate' ? ACTION.NONE : ACTION.TOUCH_ROTATE
  }, [mode])

  useEffect(() => {
    if (view.nonce === 0) return
    const c = ref.current
    const aspect = size.width / size.height
    const p = presetLookAt(view.preset, aspect)
    c.setLookAt(p[0], p[1], p[2], p[3], p[4], p[5], true)

    // only react to explicit requests
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  return <CameraControls ref={ref} makeDefault />
}
