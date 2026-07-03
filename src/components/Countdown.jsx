import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export default function Countdown({ value }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="overlay countdown"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode="popLayout">
        {value != null && (
          <motion.div
            key={String(value)}
            className={`count ${value === "GO" ? "go" : ""}`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 2.1 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.55 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {value}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
