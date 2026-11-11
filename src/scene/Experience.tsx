import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { createMaterials } from '../lib/materials'
import { buildStadium, STADIUM_SIZE } from '../models/stadium'
import { buildChurch, CHURCH_SIZE } from '../models/church'
import { buildManor, MANOR_SIZE } from '../models/manor'
import { buildGarage, GARAGE_SIZE } from '../models/garage'
import { tableState, useStore } from '../store'
import { CameraRig } from './CameraRig'
import { SLOTS } from './layout'
import { ModelSlot } from './ModelSlot'
import { Studio } from './Studio'
import { Table } from './Table'
import { TableRotator } from './TableRotator'

const BUILD = {
  stadium: { build: buildStadium, scale: STADIUM_SIZE.scale },
  church: { build: buildChurch, scale: CHURCH_SIZE.scale },
  manor: { build: buildManor, scale: MANOR_SIZE.scale },
  garage: { build: buildGarage, scale: GARAGE_SIZE.scale },
}

function ReadySignal() {
  const frames = useRef(0)
  const three = useThree()
  useEffect(() => {
    // dev-only handle for inspection tools
    if (import.meta.env.DEV) Object.assign(window, { __three: three, __store: useStore, __table: tableState })
  }, [three])
  useFrame(() => {
    frames.current++
    if (frames.current === 3) useStore.getState().setReady()
  })
  return null
}

export function Experience({ quality }: { quality: 'high' | 'low' }) {
  const materialSet = useMemo(() => createMaterials(), [])
  useEffect(() => () => materialSet.dispose(), [materialSet])
  const zincFinish = useStore((s) => s.zincFinish)
  useEffect(() => materialSet.zincFinish(zincFinish), [zincFinish, materialSet])

  return (
    <>
      <Studio quality={quality} />
      <Table>
        {SLOTS.map((slot, i) => (
          <ModelSlot key={slot.id} slot={slot} index={i} build={BUILD[slot.id].build} scale={BUILD[slot.id].scale} mats={materialSet.mats} />
        ))}
      </Table>
      <CameraRig />
      <TableRotator />
      <ReadySignal />
    </>
  )
}
