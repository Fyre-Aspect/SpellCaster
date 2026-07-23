import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { CAMPAIGN } from "../data/campaign.js";
import { isLevelUnlocked } from "../logic/campaignStore.js";

const KIND_TAG = { horde: "Horde", boss: "Boss", duel: "Duel" };

function Stars({ n }) {
  return (
    <span className="lvl-stars" aria-label={`${n} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`lvl-star ${i < n ? "on" : ""}`}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function CampaignMap({ open, campaign, onStartLevel, onClose }) {
  const reduced = useReducedMotion();
  const cleared = campaign?.cleared ?? {};

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay campaign-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="campaign-card"
            onClick={(e) => e.stopPropagation()}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 20 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
          >
            <div className="campaign-head">
              <div>
                <h2 className="campaign-title">Campaign</h2>
                <p className="campaign-sub">Beat each wizard to unlock the next</p>
              </div>
              <div className="campaign-head-right">
                <span className="gold-chip" title="Gold">
                  🪙 {campaign?.gold ?? 0}
                </span>
                <button
                  type="button"
                  className="account-close"
                  onClick={onClose}
                  aria-label="Close"
                  autoFocus
                >
                  ✕
                </button>
              </div>
            </div>

            <ul className="lvl-list">
              {CAMPAIGN.map((level, i) => {
                const stars = cleared[level.id] ?? 0;
                const unlocked = isLevelUnlocked(i, cleared);
                const done = stars > 0;
                const isNext = unlocked && !done;
                return (
                  <li key={level.id}>
                    <button
                      type="button"
                      className={`lvl-row ${unlocked ? "" : "locked"} ${
                        isNext ? "next" : ""
                      } ${done ? "done" : ""}`}
                      disabled={!unlocked}
                      onClick={() => onStartLevel(i)}
                    >
                      <span className="lvl-index">{i + 1}</span>
                      <span className="lvl-icon">{unlocked ? level.icon : "🔒"}</span>
                      <span className="lvl-text">
                        <span className="lvl-name">
                          {level.name}
                          <span className={`lvl-kind ${level.kind}`}>
                            {KIND_TAG[level.kind]}
                          </span>
                        </span>
                        <span className="lvl-sub">{level.subtitle}</span>
                      </span>
                      <span className="lvl-right">
                        {done ? (
                          <Stars n={stars} />
                        ) : unlocked ? (
                          <span className="lvl-cta">{isNext ? "▶ Play" : "Play"}</span>
                        ) : (
                          <span className="lvl-reward">🪙 {level.baseGold}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
