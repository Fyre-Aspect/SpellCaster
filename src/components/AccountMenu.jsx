import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Sparkline from "./Sparkline.jsx";

function GoogleG() {
  return (
    <svg className="google-g" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function StatsPanel({ summary }) {
  if (!summary || summary.count === 0) {
    return (
      <p className="panel-empty">No games yet — play a round to start your record!</p>
    );
  }
  const winPct =
    summary.racePlayed > 0
      ? Math.round((summary.raceWins / summary.racePlayed) * 100)
      : null;
  return (
    <>
      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="tile-value">{summary.count}</span>
          <span className="tile-label">Games</span>
        </div>
        <div className="stat-tile">
          <span className="tile-value">{Math.round(summary.avgWpm)}</span>
          <span className="tile-label">Avg speed</span>
        </div>
        <div className="stat-tile">
          <span className="tile-value">{Math.round(summary.bestWpm)}</span>
          <span className="tile-label">Best speed</span>
        </div>
        <div className="stat-tile">
          <span className="tile-value">{Math.round(summary.avgAccuracy)}%</span>
          <span className="tile-label">Accuracy</span>
        </div>
        {winPct != null && (
          <div className="stat-tile">
            <span className="tile-value">{winPct}%</span>
            <span className="tile-label">Race wins</span>
          </div>
        )}
      </div>
      {summary.recentWpm?.length > 1 && (
        <div className="panel-spark">
          <span className="tile-label">Recent speed</span>
          <Sparkline values={summary.recentWpm} />
        </div>
      )}
    </>
  );
}

function SettingsPanel({ muted, onToggleMute, showAnswers, onToggleAnswers }) {
  return (
    <div className="settings-list">
      <div className="setting-row">
        <div className="setting-text">
          <span className="setting-name">Sound</span>
          <span className="setting-desc">Typing ticks, casts and fanfares</span>
        </div>
        <button
          type="button"
          className={`switch ${muted ? "" : "on"}`}
          onClick={onToggleMute}
          role="switch"
          aria-checked={!muted}
        >
          <span className="switch-knob" />
          <span className="switch-text">{muted ? "Off" : "On"}</span>
        </button>
      </div>
      <div className="setting-row">
        <div className="setting-text">
          <span className="setting-name">Show answers</span>
          <span className="setting-desc">Reveal missing code faintly in blanks</span>
        </div>
        <button
          type="button"
          className={`switch ${showAnswers ? "on" : ""}`}
          onClick={onToggleAnswers}
          role="switch"
          aria-checked={showAnswers}
        >
          <span className="switch-knob" />
          <span className="switch-text">{showAnswers ? "On" : "Off"}</span>
        </button>
      </div>
    </div>
  );
}

// Account navigation: a name/avatar trigger that opens a Stats / Settings /
// Log out dropdown, with the stats and settings themselves shown in modals.
export default function AccountMenu({
  user,
  onSignIn,
  onSignOut,
  busy,
  summary,
  muted,
  onToggleMute,
  showAnswers,
  onToggleAnswers,
  onOverlayChange,
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(null); // null | "stats" | "settings"
  const rootRef = useRef(null);

  const active = open || panel != null;
  const prevActive = useRef(active);
  useEffect(() => {
    onOverlayChange?.(active);
    // A body flag the global key handler checks — cleared the instant the
    // panel closes, independent of the modal's exit animation
    if (active) document.body.dataset.menuLock = "1";
    else delete document.body.dataset.menuLock;
    // On close, drop focus off the (still exit-animating) menu controls so
    // Enter/arrow keys go straight back to the game menu
    if (prevActive.current && !active) {
      const el = document.activeElement;
      if (el && rootRef.current?.contains(el) && el.blur) el.blur();
    }
    prevActive.current = active;
    return () => {
      delete document.body.dataset.menuLock;
    };
  }, [active, onOverlayChange]);

  // Close the dropdown on an outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (panel) setPanel(null);
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, panel]);

  const firstName = user?.name?.split(" ")[0] ?? "Guest";
  const initial = (user?.name?.charAt(0) ?? "G").toUpperCase();

  const dropAnim = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: -8, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -8, scale: 0.96 },
      };

  return (
    <div className="account" ref={rootRef}>
      <button
        type="button"
        className={`account-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user?.photo ? (
          <img className="user-avatar" src={user.photo} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="user-avatar user-avatar-fallback">{initial}</span>
        )}
        <span className="account-name">{firstName}</span>
        <span className={`account-caret ${open ? "up" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="account-dropdown"
            role="menu"
            {...dropAnim}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <button
              type="button"
              className="account-item"
              role="menuitem"
              onClick={() => {
                setPanel("stats");
                setOpen(false);
              }}
            >
              <span className="account-item-icon">📊</span> Stats
            </button>
            <button
              type="button"
              className="account-item"
              role="menuitem"
              onClick={() => {
                setPanel("settings");
                setOpen(false);
              }}
            >
              <span className="account-item-icon">⚙️</span> Settings
            </button>
            <div className="account-divider" />
            {user ? (
              <button
                type="button"
                className="account-item danger"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSignOut?.();
                }}
              >
                <span className="account-item-icon">🚪</span> Log out
              </button>
            ) : (
              <button
                type="button"
                className="account-item signin"
                role="menuitem"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  onSignIn?.();
                }}
              >
                <GoogleG /> {busy ? "Signing in…" : "Sign in with Google"}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel && (
          <motion.div
            className="overlay account-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setPanel(null)}
          >
            <motion.div
              className="account-card"
              onClick={(e) => e.stopPropagation()}
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 16 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <div className="account-card-head">
                <h2 className="account-card-title">
                  {panel === "stats" ? "Your Stats" : "Settings"}
                </h2>
                <button
                  type="button"
                  className="account-close"
                  onClick={() => setPanel(null)}
                  aria-label="Close"
                  autoFocus
                >
                  ✕
                </button>
              </div>
              {panel === "stats" ? (
                <StatsPanel summary={summary} />
              ) : (
                <SettingsPanel
                  muted={muted}
                  onToggleMute={onToggleMute}
                  showAnswers={showAnswers}
                  onToggleAnswers={onToggleAnswers}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
