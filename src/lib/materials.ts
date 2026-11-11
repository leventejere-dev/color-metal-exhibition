/**
 * Physically based material library for the installation.
 *
 * The three architectural metals are the visual protagonists:
 *  - Titanium-zinc (Sepsi OSK) — the reference photographs show a gold-tone
 *    coloured zinc; a natural pre-weathered grey variant is also provided.
 *  - Anthracite aluminium (Tășnad) — coated standing-seam, satin finish.
 *  - Copper (Răscruci) — warm brown-red copper with per-tray variation,
 *    as photographed (no green patina).
 */
import * as THREE from 'three'
import { brushedTexture, glazingTexture, linesTexture, noiseTexture, panelTexture, pitchTexture, seatsTexture } from './textures'
import { brickTexture, expandedMeshTexture, formworkTexture, shutterTexture } from './siteTextures'

/** Expanded-metal diamond (long way × short way, metres). Enlarged ~2× for legibility at model scale. */
export const MESH_DIAMOND = { lwd: 0.26, swd: 0.12 }

export type Mats = Record<string, THREE.Material>

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p)
const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p)

/** Clone a texture and set its metric repeat (UVs are in metres). */
function tiled(t: THREE.Texture, uMetres: number, vMetres: number) {
  const c = t.clone()
  c.repeat.set(1 / uMetres, 1 / vMetres)
  c.needsUpdate = true
  return c
}

export interface MaterialSet {
  mats: Mats
  zincFinish: (finish: 'asBuilt' | 'natural') => void
  dispose: () => void
}

export function createMaterials(): MaterialSet {
  const textures: THREE.Texture[] = []
  const T = <X extends THREE.Texture>(t: X) => {
    textures.push(t)
    return t
  }

  /* ---------------- titanium-zinc (Sepsi OSK) ---------------- */
  const zincGoldTex = T(
    panelTexture({ seed: 11, strips: 32, palette: ['#c9b062', '#bfa456', '#cdb66c'], variation: 0.05, streaks: 0.025, seamShade: 0.72 }),
  )
  const zincNaturalTex = T(
    panelTexture({ seed: 12, strips: 32, palette: ['#a7aaab', '#9ea2a4', '#adb0b0'], variation: 0.05, streaks: 0.03, seamShade: 0.74 }),
  )
  const zincPanel = 0.6 // tray width (m) on the real building
  const zincMapGold = T(tiled(zincGoldTex, 32 * zincPanel, 6))
  const zincMapNatural = T(tiled(zincNaturalTex, 32 * zincPanel, 6))
  const zinc = std({ color: '#ffffff', map: zincMapGold, metalness: 0.88, roughness: 0.36, envMapIntensity: 1.1 })
  const zincRough = T(tiled(T(noiseTexture(21, 200, 30)), 3, 3))
  zinc.roughnessMap = zincRough

  /* ---------------- anthracite aluminium (Tășnad) ---------------- */
  const aluTex = T(panelTexture({ seed: 31, strips: 32, palette: ['#3d4145', '#383c40', '#40444a'], variation: 0.035, streaks: 0.02, seamShade: 0.85 }))
  const alu = phys({
    color: '#ffffff',
    map: T(tiled(aluTex, 32 * 0.55, 8)),
    metalness: 0.55,
    roughness: 0.42,
    clearcoat: 0.35,
    clearcoatRoughness: 0.38,
    envMapIntensity: 1.15,
  })

  /* ---------------- copper (Răscruci) ---------------- */
  const copperTex = T(
    panelTexture({
      seed: 51,
      strips: 32,
      palette: ['#7f4637', '#93533f', '#a45f48', '#86503f', '#6f4038', '#9a5a46'],
      variation: 0.09,
      streaks: 0.07,
      seamShade: 0.78,
    }),
  )
  const copper = std({
    color: '#ffffff',
    map: T(tiled(copperTex, 32 * 0.55, 7)),
    metalness: 1,
    roughness: 0.38,
    envMapIntensity: 1.2,
  })
  copper.roughnessMap = T(tiled(T(noiseTexture(52, 205, 45)), 2, 2))
  const copperDark = std({ color: '#6b3f2d', metalness: 1, roughness: 0.42 })

  /* ---------------- stadium ---------------- */
  const glazingTex = T(glazingTexture(1, 2))
  const mats: Mats = {
    zinc,
    zincDark: std({ color: '#2b2924', metalness: 0.5, roughness: 0.6 }),
    stadDark: std({ color: '#4b4f55', metalness: 0.3, roughness: 0.6 }),
    stadMesh: std({ color: '#5c6066', metalness: 0.5, roughness: 0.5 }),
    stadRoof: std({ color: '#62666b', metalness: 0.3, roughness: 0.62 }),
    steel: std({ color: '#7a7e84', metalness: 0.65, roughness: 0.42 }),
    white: std({ color: '#ece9e2', roughness: 0.86 }),
    concrete: std({ color: '#d3d0ca', roughness: 0.9 }),
    glass: std({ color: '#ffffff', map: T(tiled(glazingTex, 3, 4)), metalness: 0.35, roughness: 0.14, envMapIntensity: 1.2 }),
    glassPlain: std({ color: '#33404b', metalness: 0.4, roughness: 0.12, envMapIntensity: 1.3 }),
    pitch: std({ map: T(pitchTexture()), roughness: 0.95 }),
    seats: std({ map: T(tiled(T(seatsTexture()), 1, 3.2)), roughness: 0.8 }),
    slate: std({ map: T(tiled(T(linesTexture('#5a616b', '#3f444c', 4)), 1, 1.4)), roughness: 0.6, metalness: 0.25 }),
    rail: std({ color: '#b9bdc1', metalness: 0.7, roughness: 0.4 }),
    lamp: std({ color: '#d9dcdf', emissive: '#fff6e0', emissiveIntensity: 0.25, roughness: 0.3 }),
    red: std({ color: '#b5243a', roughness: 0.6 }),

    /* ---------------- church ---------------- */
    alu,
    helm: std({ color: '#a7abad', metalness: 0.78, roughness: 0.42 }),
    wallC: std({ color: '#e9e4d9', roughness: 0.9 }),
    towerW: std({ color: '#e2dfd8', roughness: 0.88 }),
    stone: std({ color: '#cdc1a3', roughness: 0.85 }),
    glassC: std({ color: '#1e2428', metalness: 0.45, roughness: 0.22, envMapIntensity: 1.1 }),
    lead: std({ color: '#6c7176', metalness: 0.6, roughness: 0.5 }),
    gilt: std({ color: '#d1ad5c', metalness: 1, roughness: 0.28 }),
    clock: std({ color: '#25282b', roughness: 0.5 }),
    wood: std({ color: '#5a4334', roughness: 0.75 }),

    /* ---------------- manor ---------------- */
    copper,
    copperDark,
    wallM: std({ color: '#ddd0ae', roughness: 0.88 }),
    trim: std({ color: '#efe8d6', roughness: 0.82 }),
    frame: std({ color: '#b38a3c', roughness: 0.6 }),
    glassM: std({ color: '#262e35', metalness: 0.45, roughness: 0.14, envMapIntensity: 1.2 }),
    socle: std({ color: '#d2c9b3', roughness: 0.9 }),
    paving: std({ color: '#b3afa8', roughness: 0.92 }),
    skylight: std({ color: '#3d5a75', metalness: 0.5, roughness: 0.1, envMapIntensity: 1.4 }),
    iron: std({ color: '#23252a', metalness: 0.6, roughness: 0.5 }),
  }

  /* ---------------- parking garage (Satu Mare) ---------------- */
  // gold-painted expanded aluminium mesh: alpha-to-coverage keeps the see-through
  // diamonds stable without transparency sorting; it casts no shadow (the
  // structure behind it stays lit, as in the photographs)
  const meshMap = T(tiled(T(expandedMeshTexture(false)), MESH_DIAMOND.lwd, MESH_DIAMOND.swd))
  const meshAlpha = T(tiled(T(expandedMeshTexture(true)), MESH_DIAMOND.lwd, MESH_DIAMOND.swd))
  const expMesh = std({
    color: '#dcc7a0',
    map: meshMap,
    alphaMap: meshAlpha,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
    metalness: 0.5,
    roughness: 0.36,
    envMapIntensity: 1.25,
  })
  expMesh.userData.noCast = true
  Object.assign(mats, {
    expMesh,
    goldPaint: std({ color: '#c99a3d', metalness: 0.5, roughness: 0.36, envMapIntensity: 1.15 }),
    brick: std({ map: T(tiled(T(brickTexture(81)), 2.0, 1.2)), roughness: 0.86 }),
    brickLattice: std({ map: T(tiled(T(brickTexture(82, true)), 2.0, 1.2)), roughness: 0.86 }),
    concG: std({ color: '#bcb8b0', roughness: 0.92 }),
    voidG: std({ color: '#3e3b36', roughness: 0.95 }),
    concRaw: std({ map: T(tiled(T(formworkTexture()), 5, 2.5)), roughness: 0.9 }),
    membrane: std({ map: T(tiled(T(linesTexture('#c6c7c4', '#b6b7b4', 1)), 1, 2.0)), roughness: 0.72 }),
    shutter: std({ map: T(tiled(T(shutterTexture()), 1, 1)), roughness: 0.45, metalness: 0.3 }),
    galv: std({ color: '#c6cacd', metalness: 0.85, roughness: 0.32, envMapIntensity: 1.2 }),
    glassG: std({ color: '#a9bcc8', metalness: 0.6, roughness: 0.06, envMapIntensity: 1.5 }),
    asphalt: std({ color: '#5b5d60', roughness: 0.95 }),
    walkway: std({ color: '#bdbab3', roughness: 0.9 }),
  })
  ;(mats.galv as THREE.MeshStandardMaterial).roughnessMap = T(tiled(T(brushedTexture(13, true)), 2, 2))

  // helm & secondary metal surfaces get a light brushed roughness break-up
  const brushed = T(brushedTexture(9, false))
  ;(mats.helm as THREE.MeshStandardMaterial).roughnessMap = T(tiled(brushed, 2, 2))

  return {
    mats,
    zincFinish(finish) {
      zinc.map = finish === 'asBuilt' ? zincMapGold : zincMapNatural
      zinc.roughness = finish === 'asBuilt' ? 0.36 : 0.46
      zinc.metalness = finish === 'asBuilt' ? 0.88 : 0.82
      zinc.needsUpdate = true
    },
    dispose() {
      Object.values(mats).forEach((m) => m.dispose())
      textures.forEach((t) => t.dispose())
    },
  }
}
