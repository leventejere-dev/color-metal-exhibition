import { create } from 'zustand'

export type ModelId = 'stadium' | 'church' | 'manor' | 'garage'
export type Mode = 'orbit' | 'rotate'
/** Furniture configurations of the four quarter modules. */
export type Config = 'assembled' | 'separated' | 'single' | 'semi' | 'threeQuarter' | 'pairs'
/** Inspection overlays: connection hardware (joints opened slightly) or a construction cutaway. */
export type Detail = 'none' | 'connections' | 'construction'
export type ViewPreset =
  | 'overview'
  | 'top'
  | 'front'
  | 'separated'
  | 'layout'
  | 'podium'
  | 'casters'
  | 'connection'
  | 'construction'
  | ModelId

export interface ModelInfo {
  id: ModelId
  index: string
  /** interface texts (Hungarian) */
  name: string
  location: string
  material: string
  application: string
  note: string
  /** engraved plaque on the model base (official Romanian names) */
  nameRo: string
  materialRo: string
  cityRo: string
  swatch: string
}

export const MODELS: ModelInfo[] = [
  {
    id: 'stadium',
    index: '01',
    name: 'Sepsi OSK Stadion',
    location: 'Sepsiszentgyörgy, Románia',
    material: 'Titán-cink',
    application: 'Építészeti fémburkolat és tetőfedés — referenciák alapján ellenőrizendő.',
    note: 'Félmetszet: a pálya középvonalán elvágva, a főlelátóval és az aranyszínű cinkhomlokzattal, a környéket ábrázoló hátfal előtt.',
    nameRo: 'Stadionul Sepsi OSK',
    materialRo: 'Titan-zinc',
    cityRo: 'Sfântu Gheorghe',
    swatch: 'linear-gradient(135deg,#d6c072,#a88f45 55%,#cdb76a)',
  },
  {
    id: 'church',
    index: '02',
    name: 'Tasnádi templom',
    location: 'Tasnád, Románia',
    material: 'Antracit alumínium',
    application: 'Állókorcos tetőfedés.',
    note: 'A tető és a toronysisak antracit alumínium (torony: PREFA antracit). Korctávolság kb. 0,55 m (valós léptékben).',
    nameRo: 'Biserica din Tășnad',
    materialRo: 'Aluminiu antracit',
    cityRo: 'Tășnad',
    swatch: 'linear-gradient(135deg,#4a4f55,#2c3034 55%,#43484d)',
  },
  {
    id: 'manor',
    index: '03',
    name: 'Válaszúti történelmi épület',
    location: 'Válaszút (Răscruci), Románia',
    material: 'Réz',
    application: 'Réz tetőfedés.',
    note: 'Meleg, barnásvörös réz, ahogy a fotókon látszik — zöld patina nélkül.',
    nameRo: 'Clădire istorică, Răscruci',
    materialRo: 'Cupru',
    cityRo: 'Răscruci',
    swatch: 'linear-gradient(135deg,#c07d58,#8a4f39 55%,#b06e4d)',
  },
  {
    id: 'garage',
    index: '04',
    name: 'Szatmárnémeti parkolóház',
    location: 'Szatmárnémeti, Románia',
    material: 'Festett expandált alumínium',
    application: 'Homlokzati háló — arany színre festett expandált alumíniumháló az összes rögzítőelemmel, a COLOR METAL szállításában.',
    note: 'A háló váltakozó (sűrű–ritka) ritmusú függőleges profilokon áll a betonváz előtt; téglalábazat áttört mezőkkel; a tetőn gépészet arany hálós kerítéssel.',
    nameRo: 'Parcare etajată, Satu Mare',
    materialRo: 'Aluminiu expandat vopsit',
    cityRo: 'Satu Mare',
    swatch: 'linear-gradient(135deg,#e3b553,#b8862c 55%,#d9a742)',
  },
]

const NONE_LIFTED: Record<ModelId, boolean> = { stadium: false, church: false, manor: false, garage: false }

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
  /** furniture configuration and its parameters */
  config: Config
  spread: number // 0 = joined … 1 = fully separated (separate-modules mode)
  focus: ModelId // module used for single / semicircle / cutaway views
  detail: Detail
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
  setConfig: (c: Config) => void
  setSpread: (v: number) => void
  setFocus: (id: ModelId) => void
  setDetail: (d: Detail) => void
}

export const useStore = create<State>((set) => ({
  ready: false,
  mode: 'orbit',
  selected: null,
  hovered: null,
  lifted: { ...NONE_LIFTED },
  exploded: false,
  zincFinish: 'asBuilt',
  view: { preset: 'overview', nonce: 0 },
  rotateRequest: { delta: 0, nonce: 0 },
  aboutOpen: false,
  config: 'assembled',
  spread: 1,
  focus: 'garage',
  detail: 'none',
  setReady: () => set({ ready: true }),
  setMode: (mode) => set({ mode }),
  select: (selected) => set({ selected }),
  hover: (hovered) => set({ hovered }),
  toggleLift: (id) => set((s) => ({ lifted: { ...s.lifted, [id]: !s.lifted[id] } })),
  restoreAll: () => set({ lifted: { ...NONE_LIFTED }, exploded: false }),
  setExploded: (exploded) => set(exploded ? { exploded } : { exploded, lifted: { ...NONE_LIFTED } }),
  setZincFinish: (zincFinish) => set({ zincFinish }),
  goTo: (preset) => set((s) => ({ view: { preset, nonce: s.view.nonce + 1 } })),
  rotateBy: (delta) => set((s) => ({ rotateRequest: { delta, nonce: s.rotateRequest.nonce + 1 } })),
  rotateTo: (absolute) => set((s) => ({ rotateRequest: { delta: 0, absolute, nonce: s.rotateRequest.nonce + 1 } })),
  setAbout: (aboutOpen) => set({ aboutOpen }),
  // turning is only possible while all four modules are joined around the pivot
  setConfig: (config) => set((s) => ({ config, mode: config === 'assembled' ? s.mode : 'orbit', detail: s.detail === 'connections' ? 'none' : s.detail })),
  setSpread: (spread) => set({ spread }),
  setFocus: (focus) => set({ focus }),
  setDetail: (detail) => set((s) => ({ detail, mode: detail === 'none' ? s.mode : 'orbit' })),
}))

/** True when the four modules are joined (central hub in place, rotation possible). */
export const isJoined = (s: { config: Config; detail: Detail }) => s.config === 'assembled' && s.detail !== 'connections'

/**
 * Furniture module motion (installation frame, metres). Written by the
 * installation's frame loop, read by the camera presets.
 */
export const moduleState: Record<ModelId, { x: number; z: number; tx: number; tz: number }> = {
  stadium: { x: 0, z: 0, tx: 0, tz: 0 },
  church: { x: 0, z: 0, tx: 0, tz: 0 },
  manor: { x: 0, z: 0, tx: 0, tz: 0 },
  garage: { x: 0, z: 0, tx: 0, tz: 0 },
}

/**
 * Installation rotation state lives outside React (mutated every frame) so the
 * dial UI and the 3D scene can read it without re-rendering.
 */
export const tableState = {
  angle: 0, // current rotation (radians)
  velocity: 0, // rad/s (inertia after a manual push)
  target: null as number | null, // animated target for step buttons
  dragging: false,
}
