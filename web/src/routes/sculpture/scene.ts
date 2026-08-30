/**
 * "The Stroke" — the three.js scene, with no React in it.
 *
 * The previous build ran this inside a vendor <three-d-stage> web component
 * that loaded three.js from a CDN through an import map, rendered an English
 * "Download OBJ + MTL / Download GLB" toolbar into its shadow DOM on an
 * otherwise Arabic RTL page, and never released its WebGL context. three.js is
 * a real dependency now, the exporters are gone, and `dispose()` gives the
 * route a way to hand the context back on unmount.
 *
 * Model units are metres, y-up, standing on the origin.
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * The piece as it is catalogued, in centimetres — the caption is built from
 * these numbers so the words on the page and the geometry below cannot drift
 * apart.
 *
 * The width is 65, not the 81 the old page's <noscript> block quoted. The heel
 * used to be a 0.17 m radius cylinder at x=-0.28, reaching x=-0.45 while the
 * plinth cap edge is at -0.32 — a third of the bronze hung in mid-air and the
 * model measured 81 cm across. The model was corrected to fit inside the
 * 0.64 m cap rather than the caption corrected to fit the broken model.
 */
export const SCULPTURE = { heightCm: 215, widthCm: 65, depthCm: 65, year: 2026 } as const

/** Warm near-black behind the bronze: dark enough for the page vignette to
 *  read, light enough that the marble plinth keeps an edge against it. */
const BACKGROUND = 0x171009

export interface Stage {
  /** Turntable, opt-in. The old page span with no way to stop it. */
  setAutoRotate(on: boolean): void
  dispose(): void
}

type Vec3Tuple = readonly [number, number, number]

const curveThrough = (points: readonly Vec3Tuple[]): THREE.CatmullRomCurve3 =>
  new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])))

/** Thick at the heel, whipping thin towards the tip. */
const taper = (t: number): number =>
  t < 0.18 ? 0.55 + (t / 0.18) * 0.45 : 1 - 0.9 * Math.pow((t - 0.18) / 0.82, 1.7)

/**
 * A TubeGeometry re-tapered ring by ring and flattened across its sweep, so a
 * round tube reads as a brushstroke ribbon.
 *
 * This walks the vertex buffer by hand and it is correct as written: three.js
 * builds a tube by sampling `curve.getPointAt(i / tubularSegments)` for i in
 * [0, tubularSegments] and writing each ring's vertices at
 * `i * (radialSegments + 1) + j`. Both assumptions still hold in r185 — do not
 * "modernise" this into something that looks safer but samples differently.
 */
function strokeGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  segs: number,
  radius: number,
  radial: number,
  flat: number,
): THREE.TubeGeometry {
  const geo = new THREE.TubeGeometry(curve, segs, radius, radial, false)
  const pos = geo.getAttribute('position')
  // A geometry that silently lost its positions would render as nothing at
  // all; the route turns this into the visible Arabic failure message.
  if (!pos) throw new Error('strokeGeometry: TubeGeometry produced no position attribute')

  for (let i = 0; i <= segs; i++) {
    const c = curve.getPointAt(i / segs)
    const k = taper(i / segs)
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j
      const ox = (pos.getX(idx) - c.x) * k
      const oy = (pos.getY(idx) - c.y) * k
      const oz = (pos.getZ(idx) - c.z) * k * flat
      pos.setXYZ(idx, c.x + ox, c.y + oy, c.z + oz)
    }
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

/** Splashes at the foot of the stroke: [x, y, z, radius]. The middle one is
 *  the oxide-red drop. */
const DROPS: readonly (readonly [number, number, number, number])[] = [
  [0.22, 0.03, 0.15, 0.03],
  [-0.24, 0.022, -0.11, 0.022],
  [0.26, 0.017, -0.18, 0.017],
]

/**
 * There is no environment map in this scene, so metalness has nothing to
 * reflect and anything much above 0.4 renders near-black. The metals read as
 * metal through a bright base colour instead.
 *
 * Mesh and material names are gone along with the OBJ/GLB exporters that were
 * their only consumer.
 */
function buildModel(): { model: THREE.Group; materials: THREE.Material[] } {
  const bronze = new THREE.MeshStandardMaterial({ color: 0xb98d4d, roughness: 0.36, metalness: 0.38 })
  const oxide = new THREE.MeshStandardMaterial({ color: 0xa8492f, roughness: 0.62, metalness: 0.12 })
  const marble = new THREE.MeshStandardMaterial({ color: 0xe7e1d3, roughness: 0.55, metalness: 0.04 })
  const brass = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.28, metalness: 0.4 })

  const model = new THREE.Group()

  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.62), marble)
  foot.position.y = 0.025

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.5), marble)
  body.position.y = 0.4

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.055, 0.64), marble)
  cap.position.y = 0.7775

  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.015), brass)
  plaque.position.set(0, 0.52, 0.258)

  const stroke = new THREE.Group()
  stroke.position.y = 0.806

  // Both curves start inside the cap footprint (x=-0.17 and x=0.20) so the
  // bronze rests on stone instead of overhanging it.
  const mainCurve = curveThrough([
    [-0.17, 0.0, 0.06],
    [-0.02, 0.26, -0.06],
    [0.22, 0.5, 0.06],
    [0.02, 0.82, -0.05],
    [-0.22, 1.06, 0.05],
    [0.1, 1.34, 0.0],
  ])
  const main = new THREE.Mesh(strokeGeometry(mainCurve, 200, 0.1, 30, 0.42), bronze)

  const accentCurve = curveThrough([
    [0.2, 0.04, -0.12],
    [0.06, 0.36, 0.12],
    [-0.18, 0.62, -0.08],
    [0.06, 0.92, 0.1],
    [-0.05, 1.12, 0.0],
  ])
  const accent = new THREE.Mesh(strokeGeometry(accentCurve, 150, 0.048, 26, 0.5), oxide)

  const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.145, 0.032, 40), bronze)
  heel.position.set(-0.17, 0.016, 0.05)

  stroke.add(main, accent, heel)
  DROPS.forEach(([x, y, z, r], i) => {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), i === 1 ? oxide : bronze)
    drop.position.set(x, y + 0.001, z)
    stroke.add(drop)
  })

  model.add(foot, body, cap, plaque, stroke)
  return { model, materials: [bronze, oxide, marble, brass] }
}

/**
 * Build the room inside `host` and start rendering.
 *
 * Throws if a WebGL context cannot be created — the caller is expected to
 * catch that and describe the piece in words rather than leave a black
 * rectangle on screen.
 */
export function createStage(host: HTMLElement): Stage {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true })
  } catch (err) {
    throw new Error('createStage: could not create a WebGL context', { cause: err })
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  // PCFSoftShadowMap is deprecated in three r185 and silently falls back to
  // PCFShadowMap while logging a console warning. Ask for it directly.
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.style.display = 'block'
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BACKGROUND)

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 500)
  camera.position.set(3, 2.2, 4)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.autoRotate = false
  controls.autoRotateSpeed = 1.2

  // Neutral studio: a sky/ground wash, one shadow-casting key, and a dim fill
  // from behind so the silhouette never goes black.
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.0)
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(4, 7, 5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.bias = -0.0002
  const fill = new THREE.DirectionalLight(0xfff4e6, 0.5)
  fill.position.set(-5, 3, -4)
  scene.add(hemisphere, key, fill)

  const groundGeometry = new THREE.PlaneGeometry(200, 200)
  const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.18 })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const { model, materials } = buildModel()
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  scene.add(model)

  // Frame the camera on the model's bounding sphere, and rest the shadow plane
  // on its lowest point so the plinth stands on the floor instead of hovering.
  const box = new THREE.Box3().setFromObject(model)
  const sphere = box.getBoundingSphere(new THREE.Sphere())
  ground.position.y = box.min.y
  const distance = (sphere.radius / Math.tan((camera.fov * Math.PI) / 360)) * 1.35
  const direction = new THREE.Vector3(1, 0.55, 1.25).normalize()
  camera.position.copy(sphere.center).add(direction.multiplyScalar(distance))
  camera.near = Math.max(distance / 100, 0.01)
  camera.far = distance * 100
  camera.updateProjectionMatrix()
  controls.target.copy(sphere.center)
  controls.update()
  const span = sphere.radius * 3
  key.shadow.camera.left = -span
  key.shadow.camera.right = span
  key.shadow.camera.top = span
  key.shadow.camera.bottom = -span
  key.shadow.camera.updateProjectionMatrix()

  const fit = () => {
    const w = host.clientWidth || 1
    const h = host.clientHeight || 1
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  fit()
  const resizeObserver = new ResizeObserver(fit)
  resizeObserver.observe(host)

  renderer.setAnimationLoop(() => {
    controls.update()
    renderer.render(scene, camera)
  })

  let disposed = false
  return {
    setAutoRotate(on) {
      controls.autoRotate = on
    },
    dispose() {
      // A route change must not leave a live context behind: browsers cap how
      // many WebGL contexts one document may hold, and the vendor component
      // kept its renderer alive for the life of the page.
      if (disposed) return
      disposed = true
      renderer.setAnimationLoop(null)
      resizeObserver.disconnect()
      controls.dispose()
      model.traverse((o) => {
        // Mesh is generic, so `o.geometry` widens to any without this second
        // narrow — and an unchecked .dispose() would throw on a stub geometry.
        if (o instanceof THREE.Mesh && o.geometry instanceof THREE.BufferGeometry) {
          o.geometry.dispose()
        }
      })
      for (const material of materials) material.dispose()
      groundGeometry.dispose()
      groundMaterial.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
