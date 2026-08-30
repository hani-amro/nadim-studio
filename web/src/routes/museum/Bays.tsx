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

import { memo } from 'react'

export type RegisterBay = (key: string, z: number, stagger: boolean) => (el: HTMLDivElement | null) => void

const BAY_COUNT = 10
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
        margin: `${-62 * scale}px ${-60 * scale}px`,
        transform: `translateX(${x}px) translateZ(${z}px)`,
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
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 1400,
        height: 980,
        margin: '-560px -700px',
        transform: `translateX(${side * 882}px) translateZ(${spec.wz}px) rotateY(${side * -90}deg)`,
        backfaceVisibility: 'hidden',
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
    </div>
  )
}

function BayGeometry({ spec }: { spec: BaySpec }) {
  return (
    <>
      {/* Floor slab, with the red runner and a pool of lamplight on it. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 340,
          width: 1900,
          height: 1400,
          marginLeft: -950,
          transform: `translateZ(${spec.fz}px) rotateX(-90deg)`,
          transformOrigin: 'top center',
          background: 'linear-gradient(#1a1208, #0e0a06)',
        }}
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
            borderLeft: '3px solid #d9a441',
            borderRight: '3px solid #d9a441',
            boxSizing: 'border-box',
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
      </div>

      {/* Shaft of daylight falling in from the clerestory window. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: -520,
          width: 430,
          height: 790,
          marginLeft: -215,
          transform: `translateX(${spec.shaftX}px) translateZ(${spec.z}px) rotateY(${spec.shaftRy}deg) skewX(${spec.shaftSkew}deg)`,
          background: 'linear-gradient(180deg, rgba(255,236,196,.15), rgba(255,236,196,.05) 52%, transparent 90%)',
        }}
      />

      {/* Coffered ceiling with its skylight. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: -556,
          width: 1790,
          height: 1400,
          marginLeft: -895,
          transform: `translateZ(${spec.fz}px) rotateX(-90deg)`,
          transformOrigin: 'top center',
          background: CEILING_TEXTURE,
        }}
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
      </div>

      {/* The arch across the corridor, its lamp and its two piers. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1760,
          height: 980,
          margin: '-560px -880px',
          transform: `translateZ(${spec.z}px)`,
          border: '3px solid rgba(217,164,65,.55)',
          borderBottom: 'none',
          borderRadius: '520px 520px 0 0',
          opacity: 0.75,
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
      </div>

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
              transform: `translateZ(${spec.wz}px) rotateX(-90deg)`,
              transformOrigin: 'top center',
              background: 'linear-gradient(#a3242f, #6d1220)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 250,
              width: 300,
              height: 28,
              marginLeft: spec.benchX,
              transform: `translateZ(${spec.wz}px)`,
              background: 'linear-gradient(#7a1420, #4a0d13)',
              borderTop: '2px solid #d9a441',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 278,
              width: 16,
              height: 62,
              marginLeft: spec.benchX + 26,
              transform: `translateZ(${spec.wz}px)`,
              background: 'linear-gradient(#312514, #140d07)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 278,
              width: 16,
              height: 62,
              marginLeft: spec.benchX + 258,
              transform: `translateZ(${spec.wz}px)`,
              background: 'linear-gradient(#312514, #140d07)',
            }}
          />
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
          ref={registerBay(`bay-${i}`, spec.z, true)}
          style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d', pointerEvents: 'none' }}
        >
          <BayGeometry spec={spec} />
        </div>
      ))}

      {/* The rotunda colonnade, where the two wings meet. */}
      <div
        ref={registerBay('rotunda', -6820, false)}
        style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d', pointerEvents: 'none' }}
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
                transform: `translateX(${c.x}px) translateZ(${c.z}px)`,
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
                transform: `translateX(${c.x}px) translateZ(${c.z}px) rotateY(90deg)`,
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
        ref={registerBay('figures-near', -3600, false)}
        style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d', pointerEvents: 'none' }}
      >
        <Figure x={-170} z={-3560} scale={1} />
      </div>

      <div
        ref={registerBay('figures-far', -8000, false)}
        style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d', pointerEvents: 'none' }}
      >
        <Figure x={268} z={-7980} scale={0.97} />
        <Figure x={392} z={-8180} scale={0.9} />
      </div>
    </>
  )
})
