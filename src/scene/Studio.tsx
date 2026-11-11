import { useEffect, useMemo, useRef } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { blobTexture } from '../lib/textures'
import { TABLE } from './layout'

/** Bright, warm-white seamless studio (cyclorama). */
export const BG = '#dedbd5'

/**
 * White showroom: a seamless cyclorama (the floor only receives shadows, so it
 * melts into the background), soft daylight key light with high-resolution
 * shadows, generous fill, and an in-scene lightformer environment for natural
 * metal reflections (no HDR download).
 */
export function Studio({ quality }: { quality: 'high' | 'low' }) {
  const key = useRef<THREE.DirectionalLight>(null!)
  const { scene } = useThree()
  const blob = useMemo(() => blobTexture(), [])
  useEffect(() => () => blob.dispose(), [blob])

  useEffect(() => {
    scene.background = new THREE.Color(BG)
    scene.fog = new THREE.Fog(BG, 12, 30)
    return () => {
      scene.fog = null
    }
  }, [scene])

  useEffect(() => {
    const l = key.current
    const s = quality === 'high' ? 4096 : 2048
    l.shadow.mapSize.set(s, s)
    if (l.shadow.map) {
      l.shadow.map.dispose()
      l.shadow.map = null
    }
    const cam = l.shadow.camera as THREE.OrthographicCamera
    cam.left = -3.0
    cam.right = 3.0
    cam.top = 3.0
    cam.bottom = -3.0
    cam.near = 2
    cam.far = 16
    cam.updateProjectionMatrix()
    l.shadow.bias = -0.00012
    l.shadow.normalBias = 0.0012
    l.shadow.radius = 4
    l.target.position.set(0, TABLE.height, 0)
    l.target.updateMatrixWorld()
  }, [quality])

  return (
    <>
      {/* environment for reflections and image-based fill: a light studio */}
      <Environment resolution={256} frames={1} environmentIntensity={1.0}>
        <color attach="background" args={['#8f8c87']} />
        {/* overhead softbox */}
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[9, 9, 1]} />
        {/* tall vertical strip lights around the set: crisp glints on the sheet-metal facets */}
        {[45, 135, 225, 315, 0].map((a, i) => {
          const r = 6.5
          const th = (a * Math.PI) / 180
          return (
            <Lightformer
              key={a}
              form="rect"
              intensity={i === 4 ? 1.4 : 2.6}
              color={i % 2 ? '#f1f5fb' : '#fff5e8'}
              position={[Math.sin(th) * r, 2.2, Math.cos(th) * r]}
              rotation={[0, th + Math.PI, 0]}
              scale={i === 4 ? [9, 0.9, 1] : [1.3, 7, 1]}
            />
          )
        })}
        {/* white cyclorama wall behind the set */}
        <Lightformer form="rect" intensity={0.9} color="#ffffff" position={[0, 2, -8]} scale={[16, 5, 1]} />
        {/* subdued floor bounce: keeps a light-to-dark gradient on downward-facing panels */}
        <Lightformer form="rect" intensity={0.35} color="#f4efe6" position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[14, 14, 1]} />
      </Environment>

      <hemisphereLight args={['#ffffff', '#e2ddd4', 0.85]} />
      <directionalLight ref={key} castShadow position={[-3.2, 6.8, 3.6]} intensity={2.6} color="#fffaf2" />
      <directionalLight position={[2.5, 3.5, -5]} intensity={0.6} color="#ffffff" />
      <directionalLight position={[3.5, 2.2, 4.5]} intensity={0.55} color="#ffffff" />

      {/* seamless floor: receives shadows only */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <shadowMaterial color="#4f483f" opacity={0.3} />
      </mesh>
      {/* ambient-occlusion style contact shadow under the table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} renderOrder={1}>
        <planeGeometry args={[3.3, 3.3]} />
        <meshBasicMaterial map={blob} transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </>
  )
}
