import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html } from "@react-three/drei";

const START_X = -4.5;
const TRACK_LENGTH = 9;
const FINISH_X = START_X + TRACK_LENGTH;

// Chunky 3-4 step cel shading instead of the default smooth ramp
function useToonRamp() {
  return useMemo(() => {
    const steps = [90, 150, 210, 255];
    const data = new Uint8Array(steps.flatMap((v) => [v, v, v, 255]));
    const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);
}

function Racer({
  progress,
  lane,
  robeColor,
  hatColor,
  headColor,
  label,
  leading,
  finished,
  celebrating,
  reducedMotion,
  ramp,
}) {
  const group = useRef();
  const orbMat = useRef();
  const prevX = useRef(START_X);

  useFrame((frameState, dt) => {
    const g = group.current;
    if (!g) return;
    const clamped = Math.min(1, Math.max(0, progress));
    const targetX = START_X + clamped * TRACK_LENGTH;
    g.position.x += (targetX - g.position.x) * Math.min(1, dt * 10);
    const speed = dt > 0 ? (g.position.x - prevX.current) / dt : 0;
    prevX.current = g.position.x;
    const t = frameState.clock.elapsedTime;

    if (finished) {
      if (celebrating) {
        if (reducedMotion) {
          g.position.y = 0;
          g.rotation.set(0, 0, 0);
        } else {
          g.position.y = Math.abs(Math.sin(t * 6)) * 0.28;
          g.rotation.y += dt * 3.2;
          g.rotation.z = 0;
        }
        g.scale.setScalar(1);
        if (orbMat.current) {
          orbMat.current.emissiveIntensity =
            2.4 + (reducedMotion ? 0 : Math.sin(t * 9));
        }
      } else {
        // Slump: tip over slightly and go dim
        g.rotation.y = 0;
        g.rotation.z += (0.34 - g.rotation.z) * Math.min(1, dt * 4);
        g.position.y = 0;
        g.scale.setScalar(1);
        if (orbMat.current) orbMat.current.emissiveIntensity = 0.35;
      }
      return;
    }

    // Lean into the run proportional to actual speed
    const lean = Math.max(-0.3, Math.min(0, -speed * 0.12));
    g.rotation.z += (lean - g.rotation.z) * Math.min(1, dt * 8);
    g.rotation.y = 0;
    if (reducedMotion) {
      g.position.y = 0;
      g.scale.setScalar(1);
    } else {
      g.position.y = Math.abs(Math.sin(t * 5 + lane * 3)) * 0.06;
      g.scale.setScalar(leading ? 1 + Math.sin(t * 7) * 0.045 : 1);
    }
    if (orbMat.current) {
      orbMat.current.emissiveIntensity = leading
        ? 2.2 + (reducedMotion ? 0 : Math.sin(t * 8) * 0.8)
        : 0.7;
    }
  });

  return (
    <group ref={group} position={[START_X, 0, lane]}>
      <mesh position={[0, 0.42, 0]}>
        <coneGeometry args={[0.34, 0.85, 7]} />
        <meshToonMaterial color={robeColor} gradientMap={ramp} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.17, 16, 12]} />
        <meshToonMaterial color={headColor} gradientMap={ramp} />
      </mesh>
      <mesh position={[0.02, 1.26, 0]} rotation={[0, 0, -0.12]}>
        <coneGeometry args={[0.21, 0.44, 7]} />
        <meshToonMaterial color={hatColor} gradientMap={ramp} />
      </mesh>
      <mesh position={[0.4, 0.85, 0.12]}>
        <sphereGeometry args={[0.09, 12, 10]} />
        <meshToonMaterial
          ref={orbMat}
          color={hatColor}
          emissive={hatColor}
          emissiveIntensity={0.7}
          gradientMap={ramp}
        />
      </mesh>
      <Html center position={[0, 1.72, 0]} className="racer-label-anchor">
        <div className={`racer-label ${label === "YOU" ? "you" : "bot"}`}>
          {label}
        </div>
      </Html>
    </group>
  );
}

function Cloud({ position, speed, scale = 1, reducedMotion, ramp }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (reducedMotion || !ref.current) return;
    ref.current.position.x += dt * speed;
    if (ref.current.position.x > 17) ref.current.position.x = -17;
  });
  const puffs = [
    [-0.75, 0, 0.55],
    [0, 0.28, 0.78],
    [0.8, 0.02, 0.6],
  ];
  return (
    <group ref={ref} position={position} scale={scale}>
      {puffs.map(([x, y, r], i) => (
        <mesh key={i} position={[x, y, 0]} scale={[1.4, 0.72, 1]}>
          <sphereGeometry args={[r, 14, 10]} />
          <meshToonMaterial color="#ffffff" gradientMap={ramp} />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ position, height = 1.1, ramp }) {
  return (
    <group position={position}>
      <mesh position={[0, height * 0.35, 0]}>
        <cylinderGeometry args={[0.09, 0.13, height * 0.7, 8]} />
        <meshToonMaterial color="#8a5a2b" gradientMap={ramp} />
      </mesh>
      <mesh position={[0, height * 0.92, 0]}>
        <sphereGeometry args={[height * 0.45, 12, 10]} />
        <meshToonMaterial color="#3f9e3f" gradientMap={ramp} />
      </mesh>
    </group>
  );
}

function Scenery({ reducedMotion, ramp }) {
  return (
    <group>
      {/* Horizon hills */}
      <mesh position={[-8, -0.5, -13]} scale={[7, 2.2, 2.5]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshToonMaterial color="#4e9e3d" gradientMap={ramp} />
      </mesh>
      <mesh position={[7, -0.6, -14]} scale={[9, 2.8, 2.5]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshToonMaterial color="#579f45" gradientMap={ramp} />
      </mesh>
      {/* Lollipop trees flanking the track */}
      <Tree position={[-6.5, -0.2, -3.6]} height={1.4} ramp={ramp} />
      <Tree position={[-3, -0.2, -4.4]} height={1.1} ramp={ramp} />
      <Tree position={[1.5, -0.2, -3.9]} height={1.3} ramp={ramp} />
      <Tree position={[5.8, -0.2, -4.6]} height={1.0} ramp={ramp} />
      <Tree position={[-7.5, -0.2, 2.8]} height={1.2} ramp={ramp} />
      <Tree position={[7.6, -0.2, 3.1]} height={1.35} ramp={ramp} />
      {/* Drifting clouds */}
      <Cloud position={[-6, 4.2, -8]} speed={0.32} scale={1.25} reducedMotion={reducedMotion} ramp={ramp} />
      <Cloud position={[2, 4.9, -10]} speed={0.2} scale={1.6} reducedMotion={reducedMotion} ramp={ramp} />
      <Cloud position={[8, 3.7, -7]} speed={0.42} scale={0.95} reducedMotion={reducedMotion} ramp={ramp} />
    </group>
  );
}

function Track({ ramp }) {
  const checkers = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 2; col++) {
      checkers.push(
        <mesh
          key={`check-${row}-${col}`}
          position={[FINISH_X + (col - 0.5) * 0.3, 0.004, -1.4 + row * 0.4]}
        >
          <boxGeometry args={[0.3, 0.006, 0.4]} />
          <meshToonMaterial
            color={(row + col) % 2 === 0 ? "#fffdf5" : "#1c1c28"}
          />
        </mesh>
      );
    }
  }

  const dots = [];
  for (let x = START_X; x <= FINISH_X + 0.01; x += 1.5) {
    for (const z of [-1.75, 1.75]) {
      dots.push(
        <mesh key={`dot-${x}-${z}`} position={[x, 0.05, z]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshToonMaterial
            color="#ffd23f"
            emissive="#ffd23f"
            emissiveIntensity={1.2}
          />
        </mesh>
      );
    }
  }

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.21, 0]}>
        <planeGeometry args={[60, 30]} />
        <meshToonMaterial color="#6abf4b" gradientMap={ramp} />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[11, 0.2, 3.6]} />
        <meshToonMaterial color="#d9a066" gradientMap={ramp} />
      </mesh>
      <mesh position={[0, 0.003, 0]}>
        <boxGeometry args={[10.6, 0.005, 0.04]} />
        <meshToonMaterial color="#fff3d6" />
      </mesh>
      <mesh position={[START_X, 0.004, 0]}>
        <boxGeometry args={[0.08, 0.006, 3.2]} />
        <meshToonMaterial color="#fffdf5" transparent opacity={0.85} />
      </mesh>
      {checkers}
      {dots}
      {[-1.9, 1.9].map((z) => (
        <mesh key={`post-${z}`} position={[FINISH_X, 0.8, z]}>
          <cylinderGeometry args={[0.06, 0.06, 1.6, 10]} />
          <meshToonMaterial color="#ef476f" gradientMap={ramp} />
        </mesh>
      ))}
      <mesh position={[FINISH_X, 1.62, 0]}>
        <boxGeometry args={[0.08, 0.08, 3.9]} />
        <meshToonMaterial
          color="#ffd23f"
          emissive="#ffd23f"
          emissiveIntensity={0.6}
        />
      </mesh>
      <Html center position={[FINISH_X, 1.3, 0]} zIndexRange={[10, 0]}>
        <div className="finish-banner">FINISH</div>
      </Html>
    </group>
  );
}

// Subtle x-pan toward the race leader, clamped so the track stays framed
function CameraRig({ leaderProgress, reducedMotion }) {
  useFrame(({ camera }, dt) => {
    const clamped = Math.min(1, Math.max(0, leaderProgress));
    const leadX = START_X + clamped * TRACK_LENGTH;
    const targetX = reducedMotion
      ? 0
      : Math.max(-1.5, Math.min(1.5, leadX * 0.3));
    camera.position.x += (targetX - camera.position.x) * Math.min(1, dt * 2.5);
    camera.lookAt(camera.position.x * 0.55, 0.4, 0);
  });
  return null;
}

export default function TrackScene({
  playerProgress,
  botProgress,
  showBot,
  reducedMotion,
  finished = false,
  winner = "player",
}) {
  const playerLeading = !showBot || playerProgress >= botProgress;
  const leaderProgress = showBot
    ? Math.max(playerProgress, botProgress)
    : playerProgress;
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 2.7, 8.8], fov: 36 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}
    >
      <ToonScene
        playerProgress={playerProgress}
        botProgress={botProgress}
        showBot={showBot}
        reducedMotion={reducedMotion}
        finished={finished}
        winner={winner}
        playerLeading={playerLeading}
        leaderProgress={leaderProgress}
      />
    </Canvas>
  );
}

function ToonScene({
  playerProgress,
  botProgress,
  showBot,
  reducedMotion,
  finished,
  winner,
  playerLeading,
  leaderProgress,
}) {
  const ramp = useToonRamp();
  return (
    <>
      <color attach="background" args={["#7ec8f7"]} />
      <fog attach="fog" args={["#7ec8f7", 14, 27]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 8, 4]} intensity={1.2} />
      <CameraRig leaderProgress={leaderProgress} reducedMotion={reducedMotion} />
      <Scenery reducedMotion={reducedMotion} ramp={ramp} />
      <Track ramp={ramp} />
      <Racer
        progress={playerProgress}
        lane={0.85}
        robeColor="#2f6fe4"
        hatColor="#ffd23f"
        headColor="#f2d5b1"
        label="YOU"
        leading={playerLeading}
        finished={finished}
        celebrating={winner === "player"}
        reducedMotion={reducedMotion}
        ramp={ramp}
      />
      {showBot && (
        <Racer
          progress={botProgress}
          lane={-0.85}
          robeColor="#ef476f"
          hatColor="#5a2ca0"
          headColor="#cfd4dc"
          label="BOT"
          leading={!playerLeading}
          finished={finished}
          celebrating={winner === "bot"}
          reducedMotion={reducedMotion}
          ramp={ramp}
        />
      )}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.3}
        scale={14}
        blur={2.5}
        far={2.5}
      />
    </>
  );
}
