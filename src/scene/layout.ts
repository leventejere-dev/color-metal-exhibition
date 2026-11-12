import type { ModelId } from '../store'
import { MODEL_LENGTH } from '../models/common'

/** Base footprints, backdrop and focus heights are authored for 1 m models and scale with them. */
const M = MODEL_LENGTH

/**
 * Conceptual visualisation parameters (metres). Not approved construction
 * dimensions — tune freely.
 */
export const TABLE = {
  radius: 1.4, // Ø 2.80 m tabletop (assembled)
  bodyRadius: 1.32, // body reference radius under the top
  bodyTop: 0.99,
  topY0: 1.002, // underside of the tabletop
  height: 1.05, // overall height
  /**
   * Body: 12-sided, slightly tapered (wider at the top), clad in thin metal
   * sheets; each quarter module carries three of the twelve facets.
   */
  body: { facets: 12, rTop: 1.34, rBottom: 1.15, y0: 0.08, y1: 0.985 },
  /** half of the joint between two modules (each side face is set back by this much) */
  joint: 0.003,
  /** concave notch at the tabletop apex — the four notches hold the central locking hub */
  notch: 0.062,
  /** concave apex of the body (room for the floor pivot spigot) */
  bodyNotch: 0.1,
  /** toe-kick recess: the dark skirt is set back from the cladding on all sides */
  skirtInset: 0.07,
  skirtSideInset: 0.05,
  floorGap: 0.012,
}

/** Four identical 90° modules. Module k is centred on its bisector angle (0° = front, +z). */
export interface ModuleDef {
  model: ModelId
  no: string
  angleDeg: number
}

export const MODULES: ModuleDef[] = [
  { model: 'stadium', no: '01', angleDeg: 90 },
  { model: 'church', no: '02', angleDeg: 270 },
  { model: 'manor', no: '03', angleDeg: 180 },
  { model: 'garage', no: '04', angleDeg: 0 },
]
export const moduleOf = (id: ModelId) => MODULES.find((m) => m.model === id)!

/** How far each module rolls out along its bisector when fully separated (m). */
export const SEPARATION = 1.15
/** Modules that are not part of a configuration roll away to this distance and are parked out of view. */
export const PARK_DISTANCE = 7.5

export interface SlotDef {
  id: ModelId
  angleDeg: number // bisector of the furniture module carrying the model
  radius: number // distance of the base centre from the axis, along the bisector
  base: [number, number] // base footprint (w × d) in metres
  centerY: number // typical model centre height (for camera focus)
  /** shift of the model inside its base (z, metres) */
  offsetZ?: number
  /** vertical backdrop panel along the base's inner edge (half-section models) */
  backdrop?: { h: number }
}

/**
 * Each model faces outward along its module's bisector. The bases were checked
 * against the 90° sectors: inner corners stay ≥ 4 cm clear of the joint lines,
 * outer corners within r ≈ 1.34 m (inside the engraved tick ring), so no base
 * crosses a separation line and every model fits its own quarter.
 */
export const SLOTS: SlotDef[] = [
  {
    id: 'stadium',
    angleDeg: 90,
    radius: 0.95,
    base: [1.07 * M, 0.55 * M],
    centerY: 0.09 * M,
    offsetZ: -0.0235 * M,
    backdrop: { h: 0.29 * M },
  },
  { id: 'church', angleDeg: 270, radius: 0.972, base: [1.09 * M, 0.49 * M], centerY: 0.41 * M },
  // base trimmed close to the manor's site board so it fits its quarter
  { id: 'manor', angleDeg: 180, radius: 0.89, base: [1.032 * M, 0.78 * M], centerY: 0.15 * M },
  { id: 'garage', angleDeg: 0, radius: 0.895, base: [1.08 * M, 0.74 * M], centerY: 0.13 * M },
]

/** Swivel casters per module (module frame: r from the axis, angle from the bisector). */
export const CASTERS = [
  { r: 1.04, deg: -33, brake: true },
  { r: 1.04, deg: 0, brake: true },
  { r: 1.04, deg: 33, brake: true },
  { r: 0.32, deg: 0, brake: false },
]
export const CASTER = { wheelR: 0.025, mountY: 0.078 }

export const BASE_H = 0.035
export const LIFT_HEIGHT = 0.36
export const EXPLODE_HEIGHT = 0.22
