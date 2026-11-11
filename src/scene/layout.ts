import type { ModelId } from '../store'
import { MODEL_LENGTH } from '../models/common'

/** Base footprints, backdrop and focus heights are authored for 1 m models and scale with them. */
const M = MODEL_LENGTH

/**
 * Conceptual visualisation parameters (metres). Not approved construction
 * dimensions — tune freely.
 */
export const TABLE = {
  radius: 1.4, // Ø 2.80 m rotating top
  bodyRadius: 1.32, // fixed body (reference radius under the top)
  plinthRadius: 1.08, // recessed toe plinth (shadow gap)
  plinthH: 0.08,
  bodyTop: 0.99,
  topY0: 1.002, // underside of the rotating top
  height: 1.05, // overall height (raised presentation height)
  /**
   * Fixed body: 12-sided, slightly tapered (wider at the top) and clad in
   * metal sheets; two side panels are compartment doors.
   */
  body: { facets: 12, rTop: 1.34, rBottom: 1.15, y0: 0.08, y1: 0.985 },
}

export interface SlotDef {
  id: ModelId
  angleDeg: number // position around the table (0° = front, towards +z)
  radius: number // distance of the base centre from the axis
  base: [number, number] // base footprint (w × d) in metres
  centerY: number // typical model centre height (for camera focus)
  /** shift of the model inside its base (z, metres) */
  offsetZ?: number
  /** vertical backdrop panel along the base's inner edge (half-section models) */
  backdrop?: { h: number }
}

/**
 * Four models in a cross-shaped composition, each facing outward with its main
 * elevation. The two shallow bases (stadium, church) sit on one axis just
 * outside the ends of the two deep bases (garage, manor) on the other, so all
 * four fit on the Ø 2.80 m top with ~12 cm between neighbouring bases and
 * their outer edges ~1.12 m from the axis.
 */
export const SLOTS: SlotDef[] = [
  {
    id: 'stadium',
    angleDeg: 65,
    radius: 0.87,
    base: [1.07 * M, 0.55 * M],
    centerY: 0.09 * M,
    offsetZ: -0.0235 * M,
    backdrop: { h: 0.29 * M },
  },
  { id: 'church', angleDeg: -115, radius: 0.88, base: [1.09 * M, 0.49 * M], centerY: 0.41 * M },
  { id: 'manor', angleDeg: 155, radius: 0.74, base: [1.08 * M, 0.83 * M], centerY: 0.15 * M },
  { id: 'garage', angleDeg: -25, radius: 0.78, base: [1.08 * M, 0.74 * M], centerY: 0.13 * M },
]

export const BASE_H = 0.035
export const LIFT_HEIGHT = 0.36
export const EXPLODE_HEIGHT = 0.22
