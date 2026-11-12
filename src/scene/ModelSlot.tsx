import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { Builder } from '../lib/geo'
import type { Mats } from '../lib/materials'
import { flutingNormal, labelTexture } from '../lib/textures'
import { landscapeTexture } from '../lib/siteTextures'
import { modelById, useStore, type ModelId } from '../store'
import { BASE_H, EXPLODE_HEIGHT, LIFT_HEIGHT, TABLE, type SlotDef } from './layout'

interface Props {
  slot: SlotDef
  index: number
  build: () => Builder
  scale: number
  mats: Mats
}

const baseMat = new THREE.MeshStandardMaterial({ color: '#a9abad', roughness: 0.38, metalness: 0.6 })
const dockMat = new THREE.MeshStandardMaterial({ color: '#b39652', metalness: 1, roughness: 0.35 })
const backdropMat = (() => {
  const n = flutingNormal(1)
  n.repeat.set(110, 1)
  return new THREE.MeshStandardMaterial({ color: '#dcd9d4', roughness: 0.5, metalness: 0.1, normalMap: n, normalScale: new THREE.Vector2(0.45, 0.45) })
})()
const brassMat = new THREE.MeshStandardMaterial({ color: '#c0a062', metalness: 1, roughness: 0.28 })
/** Matte print of the real surroundings (farmland, villages, horizon) on the backdrop's front face. */
const printMat = new THREE.MeshStandardMaterial({ map: landscapeTexture(), roughness: 0.78, metalness: 0 })
const shadowTex = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  return t
})()

export function ModelSlot({ slot, index, build, scale, mats }: Props) {
  const lift = useRef<THREE.Group>(null!)
  const shadow = useRef<THREE.MeshBasicMaterial>(null!)
  const inlay = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c0a062', metalness: 1, roughness: 0.3, emissive: '#c0a062', emissiveIntensity: 0 }), [])
  const plaqueMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.9, roughness: 0.38 }), [])
  const info = modelById(slot.id)
  const [bw, bd] = slot.base

  const model = useMemo(() => {
    const g = build().build(mats, slot.id)
    g.scale.setScalar(scale)
    g.traverse((o) => {
      o.userData.modelId = slot.id
    })
    return g
  }, [build, mats, scale, slot.id])

  useEffect(
    () => () => {
      model.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose()
      })
      inlay.dispose()
      plaqueMat.map?.dispose()
      plaqueMat.dispose()
    },
    [model, inlay, plaqueMat],
  )

  // engraved brass plaque
  useEffect(() => {
    let alive = true
    labelTexture(
      [
        { text: info.nameRo.toUpperCase(), size: 74, weight: 600, color: '#2a2418', spacing: 0.16 },
        { text: `${info.materialRo.toUpperCase()}  ·  ${info.cityRo.toUpperCase()}`, size: 50, weight: 500, color: '#3d3524', spacing: 0.2 },
      ],
      1600,
      240,
      '#b89b5e',
    ).then((t) => {
      if (!alive) return t.dispose()
      plaqueMat.map = t
      plaqueMat.needsUpdate = true
    })
    return () => {
      alive = false
    }
  }, [info, plaqueMat])

  const timeline = useRef({ y: 0, explodedAt: 0 })
  const exploded = useStore((s) => s.exploded)
  useEffect(() => {
    timeline.current.explodedAt = performance.now()
  }, [exploded])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const st = useStore.getState()
    const isLifted = st.lifted[slot.id]
    const delay = index * 140
    const explodeActive = st.exploded && performance.now() - timeline.current.explodedAt > delay
    const target = isLifted ? LIFT_HEIGHT : explodeActive ? EXPLODE_HEIGHT : 0
    const y = THREE.MathUtils.damp(timeline.current.y, target, 3.0, dt)
    timeline.current.y = Math.abs(y - target) < 1e-5 ? target : y
    lift.current.position.y = timeline.current.y
    // contact shadow fades as the model rises
    shadow.current.opacity = 0.4 * Math.max(0, 1 - timeline.current.y / 0.45)
    const selected = st.selected === slot.id
    const hovered = st.hovered === slot.id
    const glowTarget = selected ? 0.55 : hovered ? 0.22 : 0
    inlay.emissiveIntensity = THREE.MathUtils.damp(inlay.emissiveIntensity, glowTarget, 6, dt)
  })

  // module frame: the model sits on its module's bisector, facing outward
  const pos: [number, number, number] = [0, TABLE.height, slot.radius]

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    useStore.getState().hover(slot.id)
    document.body.style.cursor = 'pointer'
  }
  const onOut = () => {
    if (useStore.getState().hovered === slot.id) useStore.getState().hover(null)
    document.body.style.cursor = ''
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 6) return
    useStore.getState().select(slot.id as ModelId)
  }

  const inset = 0.006
  const bdrop = slot.backdrop
  return (
    <group position={pos}>
      {/* dock marking on the tabletop (stays when the model is lifted) */}
      <group position={[0, 0.0007, 0]}>
        <mesh material={dockMat} position={[0, 0, bd / 2 + 0.012]}>
          <boxGeometry args={[bw + 0.024, 0.0012, 0.0025]} />
        </mesh>
        <mesh material={dockMat} position={[0, 0, -bd / 2 - 0.012]}>
          <boxGeometry args={[bw + 0.024, 0.0012, 0.0025]} />
        </mesh>
        <mesh material={dockMat} position={[bw / 2 + 0.012, 0, 0]}>
          <boxGeometry args={[0.0025, 0.0012, bd + 0.024]} />
        </mesh>
        <mesh material={dockMat} position={[-bw / 2 - 0.012, 0, 0]}>
          <boxGeometry args={[0.0025, 0.0012, bd + 0.024]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0004, 0]} renderOrder={1}>
          <planeGeometry args={[bw * 1.25, bd * 1.25]} />
          <meshBasicMaterial ref={shadow} color="#3a3128" alphaMap={shadowTex} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      </group>

      {/* removable unit: presentation base + architectural model */}
      <group ref={lift} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        <RoundedBox args={[bw, BASE_H, bd]} radius={0.004} smoothness={3} position={[0, BASE_H / 2, 0]} material={baseMat} castShadow receiveShadow />
        {/* fine brass inlay around the base top (lights up on selection) */}
        <group position={[0, BASE_H + 0.0004, 0]}>
          <mesh material={inlay} position={[0, 0, bd / 2 - inset]}>
            <boxGeometry args={[bw - inset * 2, 0.0008, 0.0016]} />
          </mesh>
          <mesh material={inlay} position={[0, 0, -bd / 2 + inset]}>
            <boxGeometry args={[bw - inset * 2, 0.0008, 0.0016]} />
          </mesh>
          <mesh material={inlay} position={[bw / 2 - inset, 0, 0]}>
            <boxGeometry args={[0.0016, 0.0008, bd - inset * 2]} />
          </mesh>
          <mesh material={inlay} position={[-bw / 2 + inset, 0, 0]}>
            <boxGeometry args={[0.0016, 0.0008, bd - inset * 2]} />
          </mesh>
        </group>
        {/* plaque on the front edge (angled) */}
        <mesh position={[0, BASE_H / 2, bd / 2 + 0.0008]} material={plaqueMat}>
          <planeGeometry args={[0.19, 0.0285]} />
        </mesh>
        <primitive object={model} position={[0, BASE_H + 0.4 * scale + 0.0005, slot.offsetZ ?? 0]} />
        {bdrop && (
          <group position={[0, BASE_H, -bd / 2 + 0.007]}>
            {/* backdrop panel with a landscape print of the surroundings and brass capping */}
            <mesh material={backdropMat} position={[0, bdrop.h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[bw, bdrop.h, 0.014]} />
            </mesh>
            <mesh material={printMat} position={[0, bdrop.h / 2, 0.0072]} receiveShadow>
              <planeGeometry args={[bw - 0.006, bdrop.h - 0.004]} />
            </mesh>
            <mesh material={brassMat} position={[0, bdrop.h + 0.002, 0]} castShadow>
              <boxGeometry args={[bw + 0.002, 0.004, 0.018]} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  )
}
