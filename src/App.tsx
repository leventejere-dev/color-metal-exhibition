import { Suspense, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Experience } from './scene/Experience'
import { BG } from './scene/Studio'
import { useStore } from './store'
import { Overlay } from './ui/Overlay'

function detectQuality(): 'high' | 'low' {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const small = Math.min(window.innerWidth, window.innerHeight) < 700
  return coarse || small ? 'low' : 'high'
}

export default function App() {
  const quality = useMemo(detectQuality, [])
  const down = useRef<{ x: number; y: number } | null>(null)

  return (
    <div
      className="app"
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY }
      }}
    >
      <Canvas
        className="viewport"
        shadows="percentage"
        dpr={quality === 'high' ? [1, 2] : [1, 1.6]}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
        camera={{ fov: 32, near: 0.03, far: 80, position: [1.8, 3.2, 3.7] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping
          gl.toneMappingExposure = 1.0
          gl.setClearColor(BG)
        }}
        onPointerMissed={(e) => {
          const d = down.current
          if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) useStore.getState().select(null)
        }}
      >
        <Suspense fallback={null}>
          <Experience quality={quality} />
        </Suspense>
      </Canvas>
      <Overlay />
    </div>
  )
}
