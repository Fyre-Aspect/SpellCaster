import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { castWhoosh } from "../audio/sfx.js";

// Embers that stream off the fireball while it charges at center
const EMBERS = [
  { x: -34, size: 9, delay: 0, dur: 0.9 },
  { x: 30, size: 7, delay: 0.12, dur: 1.0 },
  { x: -14, size: 6, delay: 0.24, dur: 0.8 },
  { x: 20, size: 10, delay: 0.06, dur: 1.1 },
  { x: -26, size: 5, delay: 0.3, dur: 0.85 },
  { x: 38, size: 6, delay: 0.18, dur: 0.95 },
  { x: 8, size: 8, delay: 0.36, dur: 1.05 },
  { x: -8, size: 6, delay: 0.42, dur: 0.9 },
];

// A spell-cast wipe: a fireball rises from below, holds and charges at
// screen center (the moment the screen behind swaps), then blasts out
// through the top to reveal the new screen.
export default function FireballTransition({ onMidpoint, onDone }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState("rise"); // rise -> hold -> exit
  const midFired = useRef(false);
  const doneFired = useRef(false);
  const holdTimer = useRef(null);

  const fireMid = () => {
    if (midFired.current) return;
    midFired.current = true;
    onMidpoint?.();
  };
  const fireDone = () => {
    if (doneFired.current) return;
    doneFired.current = true;
    onDone?.();
  };

  useEffect(() => {
    castWhoosh();
  }, []);

  // Reduced motion: quick veil, swap, and out — no flying fireball
  useEffect(() => {
    if (!reduced) return;
    fireMid();
    const t = setTimeout(fireDone, 440);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, []);

  // Safety net: never leave the overlay stuck if an animation event is missed
  useEffect(() => {
    const t = setTimeout(() => {
      fireMid();
      fireDone();
    }, 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduced) {
    return (
      <motion.div
        className="cast-transition"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        aria-hidden="true"
      >
        <div className="cast-veil" />
        <div className="cast-fireball static" />
      </motion.div>
    );
  }

  const veilOpacity = phase === "exit" ? 0 : 1;

  return (
    <motion.div className="cast-transition" aria-hidden="true">
      <motion.div
        className="cast-veil"
        initial={{ opacity: 0 }}
        animate={{ opacity: veilOpacity }}
        transition={{ duration: phase === "exit" ? 0.4 : 0.42, ease: "easeOut" }}
      />

      {phase === "hold" && (
        <motion.div
          className="cast-ring"
          initial={{ opacity: 0.9, scale: 0.2 }}
          animate={{ opacity: 0, scale: 2.4 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      )}

      <motion.div
        className="cast-fireball-wrap"
        initial={{ y: "62vh" }}
        animate={
          phase === "rise"
            ? { y: "0vh" }
            : phase === "hold"
              ? { y: "0vh" }
              : { y: "-88vh" }
        }
        transition={
          phase === "rise"
            ? { duration: 0.5, ease: [0.16, 0.8, 0.4, 1] }
            : phase === "exit"
              ? { duration: 0.5, ease: [0.6, 0, 0.9, 0.4] }
              : { duration: 0 }
        }
        onAnimationComplete={() => {
          if (phase === "rise") {
            fireMid();
            setPhase("hold");
            holdTimer.current = setTimeout(() => setPhase("exit"), 420);
          } else if (phase === "exit") {
            fireDone();
          }
        }}
      >
        <motion.div
          className={`cast-fireball ${phase}`}
          animate={
            phase === "hold"
              ? { scale: [1, 1.12, 1] }
              : { scale: 1 }
          }
          transition={
            phase === "hold"
              ? { duration: 0.42, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.2 }
          }
        >
          <span className="cast-core" />
          {phase === "hold" &&
            EMBERS.map((e, i) => (
              <motion.span
                key={i}
                className="cast-ember"
                style={{ width: e.size, height: e.size, left: `calc(50% + ${e.x}px)` }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: [0, 1, 0], y: [10, -70] }}
                transition={{
                  duration: e.dur,
                  delay: e.delay,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
