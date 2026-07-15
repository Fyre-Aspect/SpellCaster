import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SPELLS, SPELL_ORDER } from "../logic/battle.js";
import CodePanel from "./CodePanel.jsx";

const TIER_TAGS = {
  short: "⚡ short & easy",
  medium: "✍ medium chant",
  long: "\u{1F4DC} long & hard",
};

function HpBar({ label, hp, max, tone, shield = 0, poisonLeft = 0 }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div className={`hp-block ${tone}`}>
      <div className="hp-head">
        <span className="hp-name">{label}</span>
        <span className="hp-value">
          {hp}/{max}
          {shield > 0 && <span className="hp-shield">🛡{shield}</span>}
          {poisonLeft > 0 && <span className="hp-poison">🐍{poisonLeft}s</span>}
        </span>
      </div>
      <div className={`bar hp-bar ${tone}`}>
        <div className={`bar-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function castPopText(lastCast) {
  const spell = SPELLS[lastCast.spellId];
  if (lastCast.type === "heal") return `${spell.icon} +${lastCast.amount} HP`;
  if (lastCast.type === "shield") return `${spell.icon} ${lastCast.amount} ward`;
  if (lastCast.type === "poison") return `${spell.icon} poisoned! ~${lastCast.amount}`;
  return `${spell.icon} -${lastCast.amount}${lastCast.crit ? " CRIT!" : ""}`;
}

export default function BattleScreen({ game }) {
  const reduced = useReducedMotion();
  const b = game.live.battle;
  if (!b) return null;
  const enemySpell = b.enemyCast ? SPELLS[b.enemyCast.spellId] : null;
  return (
    <motion.div
      className="race-screen battle-screen"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="battle-arena">
        <HpBar
          label="🧙 You"
          hp={b.playerHp}
          max={b.playerMax}
          tone="player"
          shield={b.playerShield}
          poisonLeft={b.playerPoisonLeft}
        />
        <div className="battle-vs">VS</div>
        <HpBar
          label="🧛 Rival"
          hp={b.enemyHp}
          max={b.enemyMax}
          tone="bot"
          poisonLeft={b.enemyPoisonLeft}
        />
        <AnimatePresence>
          {b.lastCast && (
            <motion.div
              key={b.lastCast.seq}
              className={`cast-pop ${b.lastCast.crit ? "crit" : ""}`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.7 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {castPopText(b.lastCast)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="enemy-telegraph">
        {enemySpell ? (
          <>
            <span>
              🔮 Rival chants <strong>{enemySpell.name}</strong>…
            </span>
            <div className="bar telegraph-bar">
              <div
                className="bar-fill bot"
                style={{ width: `${Math.round(b.enemyCast.progress * 100)}%` }}
              />
            </div>
          </>
        ) : (
          <span className="telegraph-idle">The rival wizard gathers mana…</span>
        )}
      </div>
      {b.selectedSpell && b.incantation ? (
        <CodePanel
          game={{
            challenge: {
              segments: [{ type: "blank", index: 0 }],
              answers: [b.incantation],
            },
            live: game.live,
            peekHeld: false,
            peekPenalty: 0,
            showAnswers: true,
            content: "battle",
            round: `${b.selectedSpell}-${b.castSeq}`,
          }}
        />
      ) : (
        <div className="pick-spell">
          <p className="pick-spell-title">Choose your spell!</p>
          <p className="pick-spell-hint">
            Press 1–5 or click a card — fast, flawless chanting hits harder
          </p>
        </div>
      )}
      <div className="spell-row">
        {SPELL_ORDER.map((id, i) => {
          const spell = SPELLS[id];
          return (
            <button
              key={id}
              type="button"
              className={`spell-card ${b.selectedSpell === id ? "selected" : ""}`}
              onClick={(e) => {
                e.currentTarget.blur();
                game.selectSpell(id);
              }}
            >
              <span className="spell-key">{i + 1}</span>
              <span className="spell-icon">{spell.icon}</span>
              <span className="spell-name">{spell.name}</span>
              <span className="spell-desc">{spell.desc}</span>
              <span className="spell-tier">{TIER_TAGS[spell.tier]}</span>
            </button>
          );
        })}
      </div>
      <footer className="race-footer">
        <span>1–5 picks a spell · switching restarts the chant</span>
        <span>Accuracy × speed = spell power</span>
        <span>Esc pauses</span>
      </footer>
    </motion.div>
  );
}
