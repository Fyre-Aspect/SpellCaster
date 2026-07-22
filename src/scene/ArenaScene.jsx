import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, Stars } from "@react-three/drei";

const PLAYER_X = -2.5;
const ENEMY_X = 2.5;
const ORB_HEIGHT = 0.95;

const SPELL_COLORS = {
  firebolt: "#ff8a2a",
  meteor: "#ff4d26",
  venom: "#3ed598",
  mend: "#5fe89b",
  ward: "#57b1ff",
};

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

function Wizard({
  x,
  facing, // +1 faces right (player), -1 faces left (enemy)
  robeColor,
  hatColor,
  headColor,
  label,
  labelTone,
  casting,
  hurtSeq,
  finished,
  celebrating,
  shield,
  poisoned,
  reducedMotion,
  ramp,
}) {
  const group = useRef();
  const orbMat = useRef();
  const shieldMesh = useRef();
  const poisonGroup = useRef();
  const hurt = useRef({ seen: hurtSeq, delay: 0, wobble: 0 });

  useFrame((frameState, dt) => {
    const g = group.current;
    if (!g) return;
    const t = frameState.clock.elapsedTime;

    if (hurtSeq !== hurt.current.seen) {
      hurt.current.seen = hurtSeq;
      // Wait for the incoming projectile to arrive before flinching
      if (hurtSeq != null) hurt.current.delay = 0.45;
    }
    if (hurt.current.delay > 0) {
      hurt.current.delay -= dt;
      if (hurt.current.delay <= 0) hurt.current.wobble = 0.32;
    }

    if (finished) {
      if (celebrating) {
        if (reducedMotion) {
          g.position.y = 0;
          g.rotation.set(0, 0, 0);
        } else {
          g.position.y = Math.abs(Math.sin(t * 6)) * 0.3;
          g.rotation.y += dt * 3.2;
          g.rotation.z = 0;
        }
        if (orbMat.current) {
          orbMat.current.emissiveIntensity =
            2.6 + (reducedMotion ? 0 : Math.sin(t * 9));
        }
      } else {
        // Slump: tip over and go dim
        g.rotation.y = 0;
        g.rotation.z +=
          (facing * -0.5 - g.rotation.z) * Math.min(1, dt * 4);
        g.position.y = 0;
        if (orbMat.current) orbMat.current.emissiveIntensity = 0.3;
      }
    } else {
      g.rotation.y = 0;
      let wobbleTilt = 0;
      if (hurt.current.wobble > 0 && !reducedMotion) {
        hurt.current.wobble -= dt;
        wobbleTilt =
          Math.sin(hurt.current.wobble * 40) *
          hurt.current.wobble *
          0.6 *
          facing;
      }
      // Lean toward the foe while chanting a spell
      const lean = casting ? facing * -0.14 : 0;
      g.rotation.z += (lean + wobbleTilt - g.rotation.z) * Math.min(1, dt * 10);
      g.position.y = reducedMotion
        ? 0
        : Math.abs(Math.sin(t * (casting ? 7 : 3.2) + x)) * 0.05;
      if (orbMat.current) {
        orbMat.current.emissiveIntensity = casting
          ? 2.4 + (reducedMotion ? 0 : Math.sin(t * 10))
          : 0.8;
      }
    }

    if (shieldMesh.current) {
      shieldMesh.current.visible = shield > 0;
      if (shield > 0) {
        const pulse = reducedMotion ? 0 : Math.sin(t * 3) * 0.04;
        shieldMesh.current.scale.setScalar(1 + pulse);
      }
    }
    if (poisonGroup.current) {
      poisonGroup.current.visible = poisoned;
      if (poisoned && !reducedMotion) {
        poisonGroup.current.rotation.y = t * 1.6;
      }
    }
  });

  return (
    <group ref={group} position={[x, 0, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.42, 1.05, 7]} />
        <meshToonMaterial color={robeColor} gradientMap={ramp} />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshToonMaterial color={headColor} gradientMap={ramp} />
      </mesh>
      <mesh position={[facing * 0.03, 1.5, 0]} rotation={[0, 0, facing * -0.14]}>
        <coneGeometry args={[0.24, 0.5, 7]} />
        <meshToonMaterial color={hatColor} gradientMap={ramp} />
      </mesh>
      {/* Staff held toward the middle of the arena */}
      <mesh
        position={[facing * 0.38, 0.55, 0]}
        rotation={[0, 0, facing * -0.28]}
      >
        <cylinderGeometry args={[0.035, 0.045, 1.1, 8]} />
        <meshToonMaterial color="#7a4a22" gradientMap={ramp} />
      </mesh>
      <mesh position={[facing * 0.52, ORB_HEIGHT + 0.18, 0]}>
        <sphereGeometry args={[0.11, 14, 12]} />
        <meshToonMaterial
          ref={orbMat}
          color={hatColor}
          emissive={hatColor}
          emissiveIntensity={0.8}
          gradientMap={ramp}
        />
      </mesh>
      {/* Ward bubble while a shield is up */}
      <mesh ref={shieldMesh} position={[0, 0.75, 0]} visible={false}>
        <sphereGeometry args={[0.85, 20, 16]} />
        <meshBasicMaterial
          color="#57b1ff"
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
      {/* Venom bubbles while poisoned */}
      <group ref={poisonGroup} visible={false}>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i / 4) * Math.PI * 2) * 0.55,
              0.6 + (i % 2) * 0.4,
              Math.sin((i / 4) * Math.PI * 2) * 0.55,
            ]}
          >
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#3ed598" transparent opacity={0.7} />
          </mesh>
        ))}
      </group>
      <Html center position={[0, 1.95, 0]} className="racer-label-anchor">
        <div className={`racer-label ${labelTone}`}>{label}</div>
      </Html>
    </group>
  );
}

// One-shot spell effect: remounts per cast (key = cast.seq) and animates a
// projectile toward the target (or a burst on the caster for heal/shield).
function SpellFX({ cast, fromX, toX, reducedMotion }) {
  const projectile = useRef();
  const burst = useRef();
  const burstMat = useRef();
  const light = useRef();
  const age = useRef(0);
  const color = SPELL_COLORS[cast.spellId] ?? "#ffd23f";
  const selfCast = cast.type === "heal" || cast.type === "shield";
  const meteor = cast.spellId === "meteor";
  const travel = selfCast ? 0 : reducedMotion ? 0 : meteor ? 0.55 : 0.45;
  const targetX = selfCast ? fromX : toX;
  const burstSize = (meteor ? 1.6 : cast.type === "heal" ? 1 : 1.05) *
    (cast.crit ? 1.45 : 1);

  useFrame((_, dt) => {
    age.current += dt;
    const a = age.current;
    const p = projectile.current;
    const b = burst.current;
    if (a < travel) {
      const k = a / travel;
      if (p) {
        p.visible = true;
        if (meteor) {
          // Meteor drops out of the sky onto the target
          p.position.set(
            targetX + (1 - k) * 0.6 * Math.sign(fromX - toX),
            4.2 - k * k * (4.2 - 0.7),
            0
          );
        } else {
          const arc = cast.type === "poison" ? Math.sin(k * Math.PI) * 1.1 : 0;
          p.position.set(
            fromX + (targetX - fromX) * k,
            ORB_HEIGHT + 0.18 + arc,
            0
          );
        }
        const s = meteor ? 0.34 : 0.16;
        p.scale.setScalar(s * (1 + Math.sin(a * 30) * 0.15));
      }
      if (light.current) {
        light.current.position.copy(p ? p.position : light.current.position);
        light.current.intensity = 2.2;
      }
    } else {
      if (p) p.visible = false;
      const k = Math.min(1, (a - travel) / 0.4);
      if (b && burstMat.current) {
        b.visible = k < 1;
        b.position.set(targetX, selfCast ? 0.9 : 0.85, 0);
        b.scale.setScalar(0.2 + k * burstSize);
        burstMat.current.opacity = 0.75 * (1 - k);
      }
      if (light.current) {
        light.current.position.set(targetX, 1.1, 0.4);
        light.current.intensity = Math.max(0, 2.6 * (1 - k));
      }
    }
  });

  return (
    <group>
      <mesh ref={projectile} visible={false}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={burst} visible={false}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial
          ref={burstMat}
          color={color}
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        ref={light}
        color={color}
        intensity={0}
        distance={6}
        decay={2}
      />
    </group>
  );
}

function Torch({ x, ramp }) {
  const flame = useRef();
  const glow = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = 1 + Math.sin(t * 11 + x) * 0.18 + Math.sin(t * 23) * 0.08;
    if (flame.current) flame.current.scale.setScalar(flicker);
    if (glow.current) glow.current.intensity = 0.9 * flicker;
  });
  return (
    <group position={[x, 0, -2.2]}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 1.8, 8]} />
        <meshToonMaterial color="#5d4a33" gradientMap={ramp} />
      </mesh>
      <mesh ref={flame} position={[0, 1.95, 0]}>
        <coneGeometry args={[0.14, 0.4, 8]} />
        <meshBasicMaterial color="#ffb347" />
      </mesh>
      <pointLight
        ref={glow}
        position={[0, 2.1, 0.3]}
        color="#ff9d47"
        intensity={0.9}
        distance={5}
        decay={2}
      />
    </group>
  );
}

function Crystal({ position, color, speed = 1, reducedMotion }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return;
    const t = clock.elapsedTime * speed;
    ref.current.position.y = position[1] + Math.sin(t) * 0.25;
    ref.current.rotation.y = t * 0.8;
  });
  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[0.22]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}

function CastRing({ x, color, reducedMotion }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return;
    ref.current.rotation.z = clock.elapsedTime * 2.4;
  });
  return (
    <mesh ref={ref} position={[x, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.72, 0.045, 8, 40]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}

function Arena({ ramp }) {
  return (
    <group>
      {/* Void floor far below the platform */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.5, 0]}>
        <planeGeometry args={[70, 40]} />
        <meshToonMaterial color="#231a3e" gradientMap={ramp} />
      </mesh>
      {/* Stone dueling platform */}
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[4.4, 4.7, 0.32, 36]} />
        <meshToonMaterial color="#4c4370" gradientMap={ramp} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.4, 36]} />
        <meshToonMaterial color="#585083" gradientMap={ramp} />
      </mesh>
      {/* Glowing rune ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.6, 0.06, 8, 60]} />
        <meshBasicMaterial color="#9d6bff" transparent opacity={0.9} />
      </mesh>
      {/* Centre sigil */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.04, 8, 40]} />
        <meshBasicMaterial color="#ffd23f" transparent opacity={0.65} />
      </mesh>
      {/* Moon */}
      <mesh position={[5.5, 5.4, -12]}>
        <sphereGeometry args={[1.1, 20, 16]} />
        <meshBasicMaterial color="#fff3c9" />
      </mesh>
    </group>
  );
}

// Gentle sway plus a decaying shake when a hit lands
function CameraRig({ playerCast, enemyCast, reducedMotion }) {
  const shake = useRef(0);
  const seen = useRef({ p: null, e: null, pDelay: 0, eDelay: 0 });
  useFrame(({ camera, clock }, dt) => {
    const s = seen.current;
    const isHit = (c) => c && (c.type === "attack" || c.type === "poison");
    if (playerCast?.seq !== s.p) {
      s.p = playerCast?.seq ?? null;
      if (isHit(playerCast)) s.pDelay = 0.45;
    }
    if (enemyCast?.seq !== s.e) {
      s.e = enemyCast?.seq ?? null;
      if (isHit(enemyCast)) s.eDelay = 0.45;
    }
    for (const key of ["pDelay", "eDelay"]) {
      if (s[key] > 0) {
        s[key] -= dt;
        if (s[key] <= 0) shake.current = 0.22;
      }
    }
    const t = clock.elapsedTime;
    let ox = 0;
    let oy = 0;
    if (!reducedMotion) {
      ox = Math.sin(t * 0.4) * 0.12;
      oy = Math.sin(t * 0.53) * 0.05;
      if (shake.current > 0) {
        shake.current = Math.max(0, shake.current - dt);
        const k = shake.current;
        ox += (Math.random() - 0.5) * k * 0.7;
        oy += (Math.random() - 0.5) * k * 0.5;
      }
    }
    camera.position.set(ox, 2.35 + oy, 7.3);
    camera.lookAt(0, 0.95, 0);
  });
  return null;
}

export default function ArenaScene({
  pvp,
  turn,
  playerCasting,
  enemyCasting,
  playerCast,
  enemyCast,
  playerShield,
  enemyShield,
  playerPoisoned,
  enemyPoisoned,
  finished,
  winner,
  labels,
  reducedMotion,
}) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 2.35, 7.3], fov: 38 }}>
      <ArenaInner
        pvp={pvp}
        turn={turn}
        playerCasting={playerCasting}
        enemyCasting={enemyCasting}
        playerCast={playerCast}
        enemyCast={enemyCast}
        playerShield={playerShield}
        enemyShield={enemyShield}
        playerPoisoned={playerPoisoned}
        enemyPoisoned={enemyPoisoned}
        finished={finished}
        winner={winner}
        labels={labels}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}

function ArenaInner({
  pvp,
  turn,
  playerCasting,
  enemyCasting,
  playerCast,
  enemyCast,
  playerShield,
  enemyShield,
  playerPoisoned,
  enemyPoisoned,
  finished,
  winner,
  labels,
  reducedMotion,
}) {
  const ramp = useToonRamp();
  return (
    <>
      <color attach="background" args={["#1c1533"]} />
      <fog attach="fog" args={["#1c1533", 12, 26]} />
      <Stars radius={40} depth={20} count={900} factor={3} fade speed={0.6} />
      <ambientLight intensity={0.55} color="#b7a8ff" />
      <directionalLight position={[4, 8, 5]} intensity={0.9} color="#cfd6ff" />
      <CameraRig
        playerCast={playerCast}
        enemyCast={enemyCast}
        reducedMotion={reducedMotion}
      />
      <Arena ramp={ramp} />
      <Torch x={-4} ramp={ramp} />
      <Torch x={4} ramp={ramp} />
      <Crystal position={[-3.4, 1.6, -1.6]} color="#7f5bff" speed={0.9} reducedMotion={reducedMotion} />
      <Crystal position={[3.5, 1.9, -1.4]} color="#ff5b9d" speed={1.2} reducedMotion={reducedMotion} />
      <Crystal position={[0, 2.6, -2.6]} color="#4adfff" speed={0.7} reducedMotion={reducedMotion} />
      {playerCasting && (
        <CastRing x={PLAYER_X} color="#ffd23f" reducedMotion={reducedMotion} />
      )}
      {enemyCasting && (
        <CastRing x={ENEMY_X} color="#ff5b7b" reducedMotion={reducedMotion} />
      )}
      {pvp && !finished && (
        <mesh
          position={[turn === "player" ? PLAYER_X : ENEMY_X, 0.04, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.95, 0.035, 8, 44]} />
          <meshBasicMaterial color="#ffd23f" transparent opacity={0.55} />
        </mesh>
      )}
      <Wizard
        x={PLAYER_X}
        facing={1}
        robeColor="#2f6fe4"
        hatColor="#ffd23f"
        headColor="#f2d5b1"
        label={labels.player}
        labelTone="you"
        casting={playerCasting}
        hurtSeq={
          enemyCast && (enemyCast.type === "attack" || enemyCast.type === "poison")
            ? enemyCast.seq
            : null
        }
        finished={finished}
        celebrating={winner === "player"}
        shield={playerShield}
        poisoned={playerPoisoned}
        reducedMotion={reducedMotion}
        ramp={ramp}
      />
      <Wizard
        x={ENEMY_X}
        facing={-1}
        robeColor="#a13b8f"
        hatColor="#ff5b7b"
        headColor="#d9c6f2"
        label={labels.enemy}
        labelTone="bot"
        casting={enemyCasting}
        hurtSeq={
          playerCast && (playerCast.type === "attack" || playerCast.type === "poison")
            ? playerCast.seq
            : null
        }
        finished={finished}
        celebrating={winner === "enemy"}
        shield={enemyShield}
        poisoned={enemyPoisoned}
        reducedMotion={reducedMotion}
        ramp={ramp}
      />
      {playerCast && (
        <SpellFX
          key={`p${playerCast.seq}`}
          cast={playerCast}
          fromX={PLAYER_X + 0.52}
          toX={ENEMY_X}
          reducedMotion={reducedMotion}
        />
      )}
      {enemyCast && (
        <SpellFX
          key={`e${enemyCast.seq}`}
          cast={enemyCast}
          fromX={ENEMY_X - 0.52}
          toX={PLAYER_X}
          reducedMotion={reducedMotion}
        />
      )}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.35}
        scale={12}
        blur={2.4}
        far={2.5}
      />
    </>
  );
}
