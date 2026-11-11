import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { tableState, useStore } from '../store'
import { TABLE } from './layout'

const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/**
 * ROTATE TABLE mode: dragging turns the upper display assembly about its
 * vertical axis. The point grabbed on the tabletop follows the pointer (as if
 * pushing the rim by hand); releasing leaves a little momentum that decays like
 * a heavy, manually operated turntable. The camera stays still.
 */
export function TableRotator() {
  const { gl, camera } = useThree()
  const mode = useStore((s) => s.mode)

  useEffect(() => {
    if (mode !== 'rotate') return
    const el = gl.domElement
    const ray = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TABLE.height)
    const hit = new THREE.Vector3()
    const ndc = new THREE.Vector2()
    let active = false
    let pid = -1
    let lastAngle = 0
    let lastX = 0
    let lastT = 0
    let usePlane = true

    const angleAt = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      if (!ray.ray.intersectPlane(plane, hit)) return null
      const d = Math.hypot(hit.x, hit.z)
      if (d < 0.18 || d > 5) return null
      return Math.atan2(hit.x, hit.z)
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (active) return
      active = true
      pid = e.pointerId
      const a = angleAt(e)
      usePlane = a !== null
      lastAngle = a ?? 0
      lastX = e.clientX
      lastT = performance.now()
      tableState.dragging = true
      tableState.velocity = 0
      tableState.target = null
      el.style.cursor = 'grabbing'
    }
    const move = (e: PointerEvent) => {
      if (!active || e.pointerId !== pid) return
      let d: number
      if (usePlane) {
        const a = angleAt(e)
        if (a === null) {
          usePlane = false
          d = ((e.clientX - lastX) / el.clientWidth) * Math.PI
        } else {
          d = wrapPi(a - lastAngle)
          lastAngle = a
        }
      } else {
        d = ((e.clientX - lastX) / el.clientWidth) * Math.PI * 1.2
      }
      lastX = e.clientX
      const now = performance.now()
      const dt = Math.max(8, now - lastT) / 1000
      lastT = now
      tableState.angle += d
      tableState.velocity = tableState.velocity * 0.5 + (d / dt) * 0.5
    }
    const up = (e: PointerEvent) => {
      if (!active || e.pointerId !== pid) return
      active = false
      tableState.dragging = false
      if (performance.now() - lastT > 90) tableState.velocity = 0
      tableState.velocity = THREE.MathUtils.clamp(tableState.velocity, -2.5, 2.5)
      el.style.cursor = ''
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.style.touchAction = 'none'
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      tableState.dragging = false
      el.style.cursor = ''
    }
  }, [mode, gl, camera])

  return null
}
