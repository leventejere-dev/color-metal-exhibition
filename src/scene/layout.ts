import type { ModelId } from '../store'

/**
 * Conceptual visualisation parameters (metres). Not approved construction
 * dimensions — tune freely.
 */
export const TABLE = {
  radius: 1.3, // Ø 2.60 m rotating top
  bodyRadius: 1.22, // fixed cylindrical body
  plinthRadius: 1.0, // recessed toe plinth (shadow gap)
  plinthH: 0.08,
  bodyTop: 0.99,
  topY0: 1.002, // underside of the rotating top
  height: 1.05, // overall height (raised presentation height)
  /**
   * Fixed body: 12-sided, slightly tapered (wider at the top) and clad in
   * metal sheets; two side panels are compartment doors.
   */
  body: { facets: 12, rTop: 1.24, rBottom: 1.06, y0: 0.08, y1: 0.985 },
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
  backdrop?: { h: number; title: string; subtitle: string }
}

/** Triangular composition: each model faces outward with its main elevation. */
export const SLOTS: SlotDef[] = [
  {
    id: 'stadium',
    angleDeg: 25,
    radius: 0.8,
    base: [0.87, 0.44],
    centerY: 0.07,
    offsetZ: -0.0155,
    backdrop: { h: 0.23, title: 'SEPSI OSK', subtitle: 'SECȚIUNE · TITAN-ZINC' },
  },
  { id: 'church', angleDeg: 145, radius: 0.8, base: [0.89, 0.4], centerY: 0.33 },
  { id: 'manor', angleDeg: -95, radius: 0.74, base: [0.87, 0.67], centerY: 0.12 },
]

export const BASE_H = 0.03
export const LIFT_HEIGHT = 0.32
export const EXPLODE_HEIGHT = 0.2
