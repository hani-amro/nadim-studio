/**
 * The corridor itself: ten repeating bays (floor, carpet, ceiling coffers,
 * light shafts, arches, side walls, benches), the rotunda colonnade and the
 * two visitor silhouettes.
 *
 * Everything here is pure geometry with no text, so the component is memoised
 * and never re-renders. That is load-bearing, not an optimisation: the engine
 * writes `visibility` directly onto these nodes as bays are culled in and out,
 * and a React re-render of the same subtree would be free to overwrite it.
 *
 * Physical `left`/`right`/`translateX` throughout is deliberate. This is
 * world-space in a 3D scene — a wall is on the west side of the corridor
 * whichever way the page's text happens to read — so the logical-property rule
 * that governs the page chrome does not apply here.
 */

import { memo, type CSSProperties } from 'react'
import { Surface } from './Surface'

export type RegisterBay = (
  key: string,
  z: number,
  options?: { x?: number; inertWhenParked?: boolean },
) => (el: HTMLDivElement | null) => void

/**
 * A bay's wrapper. It carries no transform of its own here: the engine owns
 * it (useCorridor's BIRTH_FRAMES and PARKED), first to stand the bay ahead of
 * the camera while its textures are made, then to park it when out of range.
 */
const BAY: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transformStyle: 'preserve-3d',
  pointerEvents: 'none',
}

const BAY_COUNT = 10
/** Where the runner's two gold edges lie, left of centre and right of it. */
const CARPET_EDGES = [-190, 187] as const
/** Depth of bay 0; bays repeat every 1400px, in step with CORRIDOR.STEP. */
const BAY_FIRST = -500
const BAY_STEP = 1400

const WALL_TEXTURE =
  'repeating-linear-gradient(90deg, rgba(0,0,0,.36) 0 12px, rgba(217,164,65,.13) 12px 18px, rgba(239,231,216,.05) 18px 48px, rgba(0,0,0,.2) 48px 60px, transparent 60px 350px), linear-gradient(180deg, #120c06 0 4%, #2b2012 4% 6%, #1d1409 6% 69%, #2b2012 69% 72%, #120c06 72% 78%, #0e0905 78% 100%)'

const CEILING_TEXTURE =
  'repeating-linear-gradient(0deg, rgba(217,164,65,.12) 0 9px, rgba(0,0,0,.5) 9px 30px, transparent 30px 700px), linear-gradient(#100b07, #1d1409)'

interface BaySpec {
  z: number
  /** Depth of the side walls (half a bay behind the arch). */
  wz: number
  /** Depth of the floor and ceiling slabs (half a bay in front). */
  fz: number
  poolX: number
  windowLeft: boolean
  shaftX: number
  shaftRy: number
  shaftSkew: number
  doorLeft: boolean
  doorRight: boolean
  bench: boolean
  benchX: number
}

const BAYS: readonly BaySpec[] = Array.from({ length: BAY_COUNT }, (_, i): BaySpec => {
  const z = BAY_FIRST - i * BAY_STEP
  const left = i % 2 === 0
  return {
    z,
    wz: z - 700,
    fz: z + 700,
    poolX: left ? 80 : 1240,
    windowLeft: left,
    shaftX: left ? -650 : 650,
    shaftRy: left ? 26 : -26,
    shaftSkew: left ? -12 : 12,
    // Bay 3's left doorway is left out: that is where the study room's own
    // archway stands, and two overlapping arches read as a rendering fault.
    doorLeft: i % 2 === 1 && i !== 3,
    doorRight: i % 2 === 0,
    bench: i % 2 === 1 && i < 8,
    benchX: i % 4 === 1 ? 410 : -710,
  }
})

const ROTUNDA_COLUMNS: readonly { x: number; z: number }[] = [
  { x: -620, z: -7180 },
  { x: 620, z: -7180 },
  { x: -620, z: -6460 },
  { x: 620, z: -6460 },
]

/** A visitor standing in the hall, seen as a silhouette against the light. */
function Figure({ x, z, scale }: { x: number; z: number; scale: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 120 * scale,
        height: 402 * scale,
        margin: `${String(-62 * scale)}px ${String(-60 * scale)}px`,
        transform: `translateX(${String(x)}px) translateZ(${String(z)}px)`,
        willChange: 'transform',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: 46 * scale,
          height: 52 * scale,
          marginLeft: -23 * scale,
          borderRadius: '50% 50% 46% 46%',
          background: '#0b0906',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 46 * scale,
          width: 98 * scale,
          height: 212 * scale,
          marginLeft: -49 * scale,
          borderRadius: `${42 * scale}px ${42 * scale}px 14px 14px`,
          background: 'linear-gradient(#0e0b08, #070504)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 252 * scale,
          width: 76 * scale,
          height: 150 * scale,
          marginLeft: -38 * scale,
          background: 'linear-gradient(#0a0806, #050403)',
        }}
      />
    </div>
  )
}

function SideWall({ spec, side }: { spec: BaySpec; side: -1 | 1 }) {
  const showDoor = side === -1 ? spec.doorLeft : spec.doorRight
  const showWindow = side === -1 ? spec.windowLeft : !spec.windowLeft
  return (
    <Surface
      w={1400}
      h={980}
      top="50%"
      marginLeft={-700}
      marginTop={-560}
      transform={`translateX(${String(side * 882)}px) translateZ(${String(spec.wz)}px) rotateY(${String(side * -90)}deg)`}
      backfaceHidden
      paint={{
        background: WALL_TEXTURE,
        borderTop: '1px solid rgba(217,164,65,.28)',
        borderBottom: '2px solid rgba(217,164,65,.4)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '19%',
          width: 54,
          height: 54,
          marginLeft: -27,
          background:
            'radial-gradient(circle, #fff4d6 8%, rgba(255,231,178,.6) 15%, rgba(255,214,130,.2) 36%, transparent 68%)',
        }}
      />
      {showDoor && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '29%',
            width: 330,
            height: 570,
            marginLeft: -165,
            border: '3px solid rgba(217,164,65,.45)',
            boxSizing: 'border-box',
            background:
              'radial-gradient(ellipse at 50% 100%, rgba(255,214,130,.28), transparent 60%), linear-gradient(180deg, #060402, #150e07 62%, #241a0c)',
          }}
        />
      )}
      {showWindow && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '5%',
            width: 340,
            height: 76,
            marginLeft: -170,
            border: '2px solid rgba(217,164,65,.45)',
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, rgba(255,248,228,.55), rgba(255,229,180,.2))',
          }}
        />
      )}
    </Surface>
  )
}

function BayGeometry({ spec }: { spec: BaySpec }) {
  return (
    <>
      {/* Floor slab, with the red runner and a pool of lamplight on it. */}
      <Surface
        w={1900}
        h={1400}
        top={340}
        marginLeft={-950}
        hinged
        transform={`translateZ(${String(spec.fz)}px) rotateX(-90deg)`}
        paint={{ background: 'linear-gradient(#1a1208, #0e0a06)' }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width: 380,
            height: '100%',
            marginLeft: -190,
            background: 'linear-gradient(#7a1420, #4d0d14)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: spec.poolX,
            top: 420,
            width: 580,
            height: 540,
            background:
              'radial-gradient(ellipse, rgba(255,236,196,.2), rgba(255,236,196,.05) 52%, transparent 74%)',
          }}
        />
      </Surface>

      {/* The runner's gold edges. On the low-resolution floor a 3px line is
          half a texel, and under the camera it smeared into a dim band. These
          two are full resolution, and at 3x1400 that costs almost nothing.
          They lie a pixel above the slab so the two never fight for depth. */}
      {CARPET_EDGES.map((x) => (
        <div
          key={x}
          style={{
            position: 'absolute',
            left: '50%',
            top: 339,
            width: 3,
            height: 1400,
            marginLeft: x,
            transform: `translateZ(${String(spec.fz)}px) rotateX(-90deg)`,
            transformOrigin: 'top center',
            background: '#d9a441',
            willChange: 'transform',
          }}
        />
      ))}

      {/* Shaft of daylight falling in from the clerestory window. */}
      <Surface
        w={430}
        h={790}
        top={-520}
        marginLeft={-215}
        transform={`translateX(${String(spec.shaftX)}px) translateZ(${String(spec.z)}px) rotateY(${String(spec.shaftRy)}deg) skewX(${String(spec.shaftSkew)}deg)`}
        paint={{
          background: 'linear-gradient(180deg, rgba(255,236,196,.15), rgba(255,236,196,.05) 52%, transparent 90%)',
        }}
      />

      {/* Coffered ceiling with its skylight. */}
      <Surface
        w={1790}
        h={1400}
        top={-556}
        marginLeft={-895}
        hinged
        transform={`translateZ(${String(spec.fz)}px) rotateX(-90deg)`}
        paint={{ background: CEILING_TEXTURE }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 625,
            width: 540,
            height: 150,
            marginLeft: -270,
            border: '1px solid rgba(217,164,65,.35)',
            background:
              'radial-gradient(ellipse, rgba(255,238,196,.5), rgba(255,214,130,.12) 58%, transparent 80%)',
          }}
        />
      </Surface>

      {/* The arch across the corridor, its lamp and its two piers. */}
      <Surface
        w={1760}
        h={980}
        top="50%"
        marginLeft={-880}
        marginTop={-560}
        transform={`translateZ(${String(spec.z)}px)`}
        opacity={0.75}
        paint={{
          border: '3px solid rgba(217,164,65,.55)',
          borderBottom: 'none',
          borderRadius: '520px 520px 0 0',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -40,
            left: '50%',
            marginLeft: -34,
            width: 68,
            height: 68,
            background:
              'radial-gradient(circle, #fff6dd 9%, rgba(255,231,178,.75) 16%, rgba(255,214,130,.28) 38%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -110,
            left: -60,
            width: 56,
            height: 620,
            background: 'linear-gradient(#2b2012, #17100a)',
            borderTop: '4px solid #d9a441',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -110,
            right: -60,
            width: 56,
            height: 620,
            background: 'linear-gradient(#2b2012, #17100a)',
            borderTop: '4px solid #d9a441',
          }}
        />
      </Surface>

      <SideWall spec={spec} side={-1} />
      <SideWall spec={spec} side={1} />

      {spec.bench && (
        <>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 250,
              width: 300,
              height: 132,
              marginLeft: spec.benchX,
              transform: `translateZ(${String(spec.wz)}px) rotateX(-90deg)`,
              transformOrigin: 'top center',
              background: 'linear-gradient(#a3242f, #6d1220)',
              willChange: 'transform',
            }}
          />
          {/* The front board and both legs stand in one plane, so they are
              one element — one texture — rather than the three they were. */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 250,
              width: 300,
              height: 90,
              marginLeft: spec.benchX,
              transform: `translateZ(${String(spec.wz)}px)`,
              willChange: 'transform',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 300,
                height: 28,
                boxSizing: 'border-box',
                background: 'linear-gradient(#7a1420, #4a0d13)',
                borderTop: '2px solid #d9a441',
              }}
            />
            <div style={{ position: 'absolute', left: 26, top: 28, width: 16, height: 62, background: 'linear-gradient(#312514, #140d07)' }} />
            <div style={{ position: 'absolute', left: 258, top: 28, width: 16, height: 62, background: 'linear-gradient(#312514, #140d07)' }} />
          </div>
        </>
      )}
    </>
  )
}

export const Bays = memo(function Bays({ registerBay }: { registerBay: RegisterBay }) {
  return (
    <>
      {BAYS.map((spec, i) => (
        <div
          key={spec.z}
          ref={registerBay(`bay-${String(i)}`, spec.z)}
          style={BAY}
        >
          <BayGeometry spec={spec} />
        </div>
      ))}

      {/* The rotunda colonnade, where the two wings meet. */}
      <div
        ref={registerBay('rotunda', -6820)}
        style={BAY}
      >
        {ROTUNDA_COLUMNS.map((c) => (
          <div key={`${c.x}:${c.z}`} style={{ transformStyle: 'preserve-3d' }}>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 96,
                height: 880,
                margin: '-530px -48px',
                transform: `translateX(${String(c.x)}px) translateZ(${String(c.z)}px)`,
                willChange: 'transform',
                background: 'linear-gradient(90deg, #0d0904, #241a0c 20%, #4a3c22 46%, #241a0c 74%, #0b0704)',
                borderTop: '12px solid #d9a441',
                borderBottom: '14px solid #5c4622',
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 96,
                height: 880,
                margin: '-530px -48px',
                transform: `translateX(${String(c.x)}px) translateZ(${String(c.z)}px) rotateY(90deg)`,
                willChange: 'transform',
                background: 'linear-gradient(90deg, #0b0704, #1d1409 22%, #3a2e1a 48%, #1d1409 76%, #0b0704)',
                borderTop: '12px solid #b98d3c',
                borderBottom: '14px solid #4a3c22',
                boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
      </div>

      <div
        ref={registerBay('figures-near', -3600)}
        style={BAY}
      >
        <Figure x={-170} z={-3560} scale={1} />
      </div>

      <div
        ref={registerBay('figures-far', -8000)}
        style={BAY}
      >
        <Figure x={268} z={-7980} scale={0.97} />
        <Figure x={392} z={-8180} scale={0.9} />
      </div>
    </>
  )
})
