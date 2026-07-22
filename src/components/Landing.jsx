import { motion, useReducedMotion } from "motion/react";

// Drifting magical motes behind the title — purely decorative
const MOTES = [
  { left: "8%", char: "✦", size: 22, delay: 0, dur: 7, drift: 18 },
  { left: "18%", char: "✧", size: 14, delay: 1.6, dur: 9, drift: -14 },
  { left: "30%", char: "✨", size: 20, delay: 0.8, dur: 8, drift: 10 },
  { left: "44%", char: "✦", size: 12, delay: 2.4, dur: 10, drift: -8 },
  { left: "58%", char: "✧", size: 24, delay: 0.3, dur: 7.5, drift: 16 },
  { left: "70%", char: "✨", size: 16, delay: 1.1, dur: 9.5, drift: -12 },
  { left: "82%", char: "✦", size: 20, delay: 2.0, dur: 8.5, drift: 12 },
  { left: "92%", char: "✧", size: 13, delay: 0.6, dur: 11, drift: -10 },
];

export default function Landing({ onEnter }) {
  const reduced = useReducedMotion();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: reduced ? { duration: 0.2 } : { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };
  const rise = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 28 },
    show: reduced
      ? { opacity: 1 }
      : { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 18 } },
  };

  return (
    <motion.section
      className="landing"
      variants={container}
      initial="hidden"
      animate="show"
      exit={
        reduced
          ? { opacity: 0 }
          : { opacity: 0, scale: 1.12, filter: "blur(6px)", transition: { duration: 0.45, ease: "easeIn" } }
      }
    >
      {!reduced && (
        <div className="landing-motes" aria-hidden="true">
          {MOTES.map((m, i) => (
            <motion.span
              key={i}
              className="mote"
              style={{ left: m.left, fontSize: m.size }}
              initial={{ opacity: 0, y: 40 }}
              animate={{
                opacity: [0, 0.9, 0.9, 0],
                y: [40, -220],
                x: [0, m.drift, 0],
              }}
              transition={{
                duration: m.dur,
                delay: m.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {m.char}
            </motion.span>
          ))}
        </div>
      )}

      <motion.div
        className="landing-hat"
        variants={rise}
        animate={
          reduced
            ? undefined
            : { y: [0, -10, 0], rotate: [-4, 4, -4] }
        }
        transition={
          reduced
            ? undefined
            : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
        }
      >
        🧙
      </motion.div>

      <motion.h1 className="landing-title" variants={rise}>
        SPELLCASTER
      </motion.h1>

      <motion.p className="landing-sub" variants={rise}>
        Type spells. Duel wizards. Cast fast, cast clean.
      </motion.p>

      <motion.button
        type="button"
        className="landing-enter"
        variants={rise}
        onClick={onEnter}
        autoFocus
        whileHover={reduced ? undefined : { scale: 1.06, rotate: -1.5 }}
        whileTap={reduced ? undefined : { scale: 0.94 }}
      >
        {!reduced && (
          <motion.span
            className="enter-glow"
            aria-hidden="true"
            animate={{ opacity: [0.35, 0.8, 0.35], scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <span className="enter-label">Enter</span>
      </motion.button>

      <motion.p
        className="landing-hint"
        variants={rise}
        animate={reduced ? undefined : { opacity: [0.5, 1, 0.5] }}
        transition={reduced ? undefined : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        Press Enter or tap to begin
      </motion.p>
    </motion.section>
  );
}
