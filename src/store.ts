import { create } from 'zustand'

export type ModelId = 'stadium' | 'church' | 'manor'
export type Mode = 'orbit' | 'rotate'
export type ViewPreset = 'overview' | 'top' | 'front' | ModelId

export interface ModelInfo {
  id: ModelId
  index: string
  name: string
  nameRo: string
  location: string
  material: string
  materialRo: string
  application: string
  swatch: string
  note: string
}

export const MODELS: ModelInfo[] = [
  {
    id: 'stadium',
    index: '01',
    name: 'Sepsi OSK Stadium',
    nameRo: 'Stadionul Sepsi OSK',
    location: 'Sfântu Gheorghe, Romania',
    material: 'Titanium-zinc',
    materialRo: 'Titan-zinc',
    application: 'Architectural metal cladding / roofing — subject to reference verification.',
    swatch: 'linear-gradient(135deg,#d6c072,#a88f45 55%,#cdb76a)',
    note: 'Half-section model: cut along the pitch centre line, keeping the main stand and the gold-tone zinc facade, set against a backdrop panel.'
  },
  {
    id: 'church',
    index: '02',
    name: 'Tășnad Church',
    nameRo: 'Biserica din Tășnad',
    location: 'Tășnad, Romania',
    material: 'Anthracite aluminium',
    materialRo: 'Aluminiu antracit',
    application: 'Standing-seam roofing.',
    swatch: 'linear-gradient(135deg,#4a4f55,#2c3034 55%,#43484d)',
    note: 'Roof and tower helm in anthracite aluminium (tower: PREFA anthracite). Standing seams at ~0.55 m spacing (real scale).',
  },
  {
    id: 'manor',
    index: '03',
    name: 'Răscruci Historic Building',
    nameRo: 'Clădire istorică, Răscruci',
    location: 'Răscruci, Romania',
    material: 'Copper',
    materialRo: 'Cupru',
    application: 'Copper roofing.',
    swatch: 'linear-gradient(135deg,#c07d58,#8a4f39 55%,#b06e4d)',
    note: 'Warm brown-red copper as photographed — no green patina.',
  },
]

export const modelById = (id: ModelId) => MODELS.find((m) => m.id === id)!

interface State {
  ready: boolean
  mode: Mode
  selected: ModelId | null
  hovered: ModelId | null
  lifted: Record<ModelId, boolean>
  exploded: boolean
  zincFinish: 'asBuilt' | 'natural'
  view: { preset: ViewPreset; nonce: number }
  rotateRequest: { delta: number; absolute?: number; nonce: number }
  aboutOpen: boolean
  setReady: () => void
  setMode: (m: Mode) => void
  select: (id: ModelId | null) => void
  hover: (id: ModelId | null) => void
  toggleLift: (id: ModelId) => void
  restoreAll: () => void
  setExploded: (v: boolean) => void
  setZincFinish: (f: 'asBuilt' | 'natural') => void
  goTo: (preset: ViewPreset) => void
  rotateBy: (delta: number) => void
  rotateTo: (absolute: number) => void
  setAbout: (v: boolean) => void
}

export const useStore = create<State>((set) => ({
  ready: false,
  mode: 'orbit',
  selected: null,
  hovered: null,
  lifted: { stadium: false, church: false, manor: false },
  exploded: false,
  zincFinish: 'asBuilt',
  view: { preset: 'overview', nonce: 0 },
  rotateRequest: { delta: 0, nonce: 0 },
  aboutOpen: false,
  setReady: () => set({ ready: true }),
  setMode: (mode) => set({ mode }),
  select: (selected) => set({ selected }),
  hover: (hovered) => set({ hovered }),
  toggleLift: (id) => set((s) => ({ lifted: { ...s.lifted, [id]: !s.lifted[id] } })),
  restoreAll: () => set({ lifted: { stadium: false, church: false, manor: false }, exploded: false }),
  setExploded: (exploded) => set(exploded ? { exploded } : { exploded, lifted: { stadium: false, church: false, manor: false } }),
  setZincFinish: (zincFinish) => set({ zincFinish }),
  goTo: (preset) => set((s) => ({ view: { preset, nonce: s.view.nonce + 1 } })),
  rotateBy: (delta) => set((s) => ({ rotateRequest: { delta, nonce: s.rotateRequest.nonce + 1 } })),
  rotateTo: (absolute) => set((s) => ({ rotateRequest: { delta: 0, absolute, nonce: s.rotateRequest.nonce + 1 } })),
  setAbout: (aboutOpen) => set({ aboutOpen }),
}))

/**
 * Tabletop rotation state lives outside React (mutated every frame) so the
 * dial UI and the 3D scene can read it without re-rendering.
 */
export const tableState = {
  angle: 0, // current rotation (radians)
  velocity: 0, // rad/s (inertia after a manual push)
  target: null as number | null, // animated target for step buttons
  dragging: false,
}
