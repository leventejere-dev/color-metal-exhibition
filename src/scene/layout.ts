import type { ModelId } from '../store'

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

/** Triangular composition: each model faces outward with its main elevation. */
export const SLOTS: SlotDef[] = [
  {
    id: 'stadium',
    angleDeg: 25,
    radius: 0.87,
    base: [1.07, 0.55],
    centerY: 0.09,
    offsetZ: -0.0235,
    backdrop: { h: 0.29 },
  },
  { id: 'church', angleDeg: 145, radius: 0.92, base: [1.09, 0.49], centerY: 0.41 },
  { id: 'manor', angleDeg: -95, radius: 0.8, base: [1.08, 0.83], centerY: 0.15 },
]

export const BASE_H = 0.035
export const LIFT_HEIGHT = 0.36
export const EXPLODE_HEIGHT = 0.22
