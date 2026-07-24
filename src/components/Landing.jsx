import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Drifting magical motes behind the title — CSS-drawn sparkles, no emoji
const MOTES = [
  { left: "8%", size: 18, delay: 0, dur: 7, drift: 18 },
  { left: "18%", size: 11, delay: 1.6, dur: 9, drift: -14 },
  { left: "30%", size: 16, delay: 0.8, dur: 8, drift: 10 },
  { left: "44%", size: 9, delay: 2.4, dur: 10, drift: -8 },
  { left: "58%", size: 20, delay: 0.3, dur: 7.5, drift: 16 },
  { left: "70%", size: 13, delay: 1.1, dur: 9.5, drift: -12 },
  { left: "82%", size: 16, delay: 2.0, dur: 8.5, drift: 12 },
  { left: "92%", size: 10, delay: 0.6, dur: 11, drift: -10 },
];

// The sticker-style wizard hat that crowns the splash screen. Drawn rather
// than typed so it matches the game's thick-ink look on every platform.
function WizardHat() {
  return (
    <svg className="hat-svg" viewBox="0 0 100 92" role="img" aria-label="Wizard hat">
      <path
        className="hat-cone"
        d="M53 6c-2 16-6 33-13 47-3 6-7 12-11 17h44c-6-11-11-24-14-37-2-9-4-19-6-27z"
      />
      <path className="hat-band" d="M39 48h24l5 13H34z" />
      <ellipse className="hat-brim" cx="50" cy="72" rx="39" ry="10" />
      <path
        className="hat-star"
        d="M52 35.5l2.4 6.1L60.5 44l-6.1 2.4L52 52.5l-2.4-6.1L43.5 44l6.1-2.4z"
      />
    </svg>
  );
}

function GoogleG() {
  return (
    <svg className="google-g" viewBox="0 0 18 18" width="20" height="20" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function Landing({
  onEnter,
  user,
  ready,
  busy,
  error,
  onSignIn,
  onSignOut,
}) {
  const reduced = useReducedMotion();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: reduced
        ? { duration: 0.2 }
        : { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };
  const rise = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 28 },
    show: reduced
      ? { opacity: 1 }
      : { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 18 } },
  };
  const swap = {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: reduced ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, y: -12 },
    transition: { duration: 0.28, ease: "easeOut" },
  };
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <motion.section
      className="landing"
      variants={container}
      initial="hidden"
      animate="show"
      exit={
        reduced
          ? { opacity: 0 }
          : {
              opacity: 0,
              scale: 1.12,
              filter: "blur(6px)",
              transition: { duration: 0.45, ease: "easeIn" },
            }
      }
    >
      {!reduced && (
        <div className="landing-motes" aria-hidden="true">
          {MOTES.map((m, i) => (
            <motion.span
              key={i}
              className="mote"
              style={{ left: m.left, width: m.size, height: m.size }}
              initial={{ opacity: 0, y: 40 }}
              animate={{
                opacity: [0, 0.9, 0.9, 0],
                y: [40, -220],
                x: [0, m.drift, 0],
                rotate: [0, 90],
              }}
              transition={{ duration: m.dur, delay: m.delay, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="landing-hat"
        variants={rise}
        animate={reduced ? undefined : { y: [0, -10, 0], rotate: [-4, 4, -4] }}
        transition={reduced ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <WizardHat />
      </motion.div>

      <motion.h1 className="landing-title" variants={rise}>
        SPELLCASTER
      </motion.h1>

      <motion.p className="landing-sub" variants={rise}>
        Type spells. Duel wizards. Cast fast, cast clean.
      </motion.p>

      <motion.div className="landing-action" variants={rise}>
        <AnimatePresence mode="wait">
          {!ready ? (
            <motion.div key="loading" className="landing-loading" {...swap}>
              Loading…
            </motion.div>
          ) : user ? (
            <motion.div key="signed-in" className="landing-signed" {...swap}>
              <div className="user-hello">
                {user.photo ? (
                  <img className="user-avatar" src={user.photo} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="user-avatar user-avatar-fallback">
                    {firstName.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
                <span className="user-welcome">
                  Welcome, <strong>{firstName}</strong>!
                </span>
              </div>
              <button
                type="button"
                className="landing-enter enter-game"
                onClick={onEnter}
                autoFocus
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
              </button>
              <button type="button" className="landing-textlink" onClick={onSignOut}>
                Not you? Sign out
              </button>
            </motion.div>
          ) : (
            <motion.div key="signed-out" className="landing-signed" {...swap}>
              <button
                type="button"
                className="google-btn"
                onClick={onSignIn}
                disabled={busy}
                autoFocus
              >
                <GoogleG />
                <span>{busy ? "Signing in…" : "Sign in with Google"}</span>
              </button>
              <button type="button" className="landing-guest enter-game" onClick={onEnter}>
                Play as guest
              </button>
              {error && <p className="landing-error">{error}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.p className="landing-hint" variants={rise}>
        {user
          ? "Press Enter or Space to begin"
          : "Sign in to save your progress · Enter or Space to play now"}
      </motion.p>
    </motion.section>
  );
}
