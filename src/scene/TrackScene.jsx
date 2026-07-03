import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html } from "@react-three/drei";

const START_X = -4.5;
const TRACK_LENGTH = 9;
const FINISH_X = START_X + TRACK_LENGTH;

function Racer({ progress, lane, robeColor, hatColor, label, leading, reducedMotion }) {
  const group = useRef();
  const orbMat = useRef();

  useFrame((frameState, dt) => {
    const g = group.current;
    if (!g) return;
    const clamped = Math.min(1, Math.max(0, progress));
    const targetX = START_X + clamped * TRACK_LENGTH;
    g.position.x += (targetX - g.position.x) * Math.min(1, dt * 10);
    const t = frameState.clock.elapsedTime;
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
        <meshStandardMaterial color={robeColor} flatShading />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.17, 16, 12]} />
        <meshStandardMaterial color="#f2d5b1" />
      </mesh>
      <mesh position={[0.02, 1.26, 0]} rotation={[0, 0, -0.12]}>
        <coneGeometry args={[0.21, 0.44, 7]} />
        <meshStandardMaterial color={hatColor} flatShading />
      </mesh>
      <mesh position={[0.4, 0.85, 0.12]}>
        <sphereGeometry args={[0.09, 12, 10]} />
        <meshStandardMaterial
          ref={orbMat}
          color={hatColor}
          emissive={hatColor}
          emissiveIntensity={0.7}
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

function Track() {
  const checkers = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 2; col++) {
      checkers.push(
        <mesh
          key={`check-${row}-${col}`}
          position={[FINISH_X + (col - 0.5) * 0.3, 0.004, -1.4 + row * 0.4]}
        >
          <boxGeometry args={[0.3, 0.006, 0.4]} />
          <meshStandardMaterial
            color={(row + col) % 2 === 0 ? "#e8ecf8" : "#141a30"}
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
          <meshStandardMaterial
            color="#8b5cf6"
            emissive="#8b5cf6"
            emissiveIntensity={1.4}
          />
        </mesh>
      );
    }
  }

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.21, 0]}>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#0d1122" />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[11, 0.2, 3.6]} />
        <meshStandardMaterial color="#1b2138" />
      </mesh>
      <mesh position={[0, 0.003, 0]}>
        <boxGeometry args={[10.6, 0.005, 0.04]} />
        <meshStandardMaterial color="#2b3355" />
      </mesh>
      <mesh position={[START_X, 0.004, 0]}>
        <boxGeometry args={[0.08, 0.006, 3.2]} />
        <meshStandardMaterial color="#e8ecf8" transparent opacity={0.65} />
      </mesh>
      {checkers}
      {dots}
      {[-1.9, 1.9].map((z) => (
        <mesh key={`post-${z}`} position={[FINISH_X, 0.8, z]}>
          <cylinderGeometry args={[0.06, 0.06, 1.6, 10]} />
          <meshStandardMaterial color="#222b4a" />
        </mesh>
      ))}
      <mesh position={[FINISH_X, 1.62, 0]}>
        <boxGeometry args={[0.08, 0.08, 3.9]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={1.1}
        />
      </mesh>
    </group>
  );
}

export default function TrackScene({ playerProgress, botProgress, reducedMotion }) {
  const playerLeading = playerProgress >= botProgress;
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 2.7, 8.8], fov: 36 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}
    >
      <color attach="background" args={["#0b0e1a"]} />
      <fog attach="fog" args={["#0b0e1a", 14, 26]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 4]} intensity={1.1} />
      <pointLight position={[-6, 3, 3]} intensity={25} distance={25} color="#7c5cff" />
      <Track />
      <Racer
        progress={playerProgress}
        lane={0.85}
        robeColor="#1e6f8f"
        hatColor="#4de3ff"
        label="YOU"
        leading={playerLeading}
        reducedMotion={reducedMotion}
      />
      <Racer
        progress={botProgress}
        lane={-0.85}
        robeColor="#8f4a1e"
        hatColor="#ff8a4d"
        label="BOT"
        leading={!playerLeading}
        reducedMotion={reducedMotion}
      />
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.45}
        scale={14}
        blur={2.5}
        far={2.5}
      />
    </Canvas>
  );
}
