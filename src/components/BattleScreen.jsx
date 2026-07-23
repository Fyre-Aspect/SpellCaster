import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SPELLS, SPELL_ORDER } from "../logic/battle.js";
import ArenaScene from "../scene/ArenaScene.jsx";
import CodePanel from "./CodePanel.jsx";
import PowerupBar from "./PowerupBar.jsx";

const TIER_TAGS = {
  short: "Short · easy",
  medium: "Medium",
  long: "Long · hard",
};

function castPopText(cast) {
  const spell = SPELLS[cast.spellId];
  if (cast.type === "heal") return `${spell.icon} +${cast.amount} HP`;
  if (cast.type === "shield") return `${spell.icon} +${cast.amount} shield`;
  if (cast.type === "poison") return `${spell.icon} poisoned!`;
  return `${spell.icon} -${cast.amount}${cast.crit ? " CRIT!" : ""}`;
}

function HpCard({ label, hp, max, tone, shield = 0, poisonLeft = 0, active }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div className={`hp-card ${tone} ${active ? "active-turn" : ""}`}>
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

function CastPop({ cast, side, reduced }) {
  return (
    <AnimatePresence>
      {cast && (
        <motion.div
          key={`${cast.side}-${cast.seq}`}
          className={`cast-pop ${side} ${cast.crit ? "crit" : ""}`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.7 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {castPopText(cast)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function BattleScreen({ game }) {
  const reduced = useReducedMotion();
  const b = game.live.battle;
  if (!b) return null;
  const pvp = b.pvp;
  const online = b.online;
  const labels = pvp
    ? { player: "P1", enemy: "P2" }
    : online
      ? { player: "YOU", enemy: "FOE" }
      : { player: "YOU", enemy: "RIVAL" };
  const finished = game.screen === "finished";
  const winner = game.result?.winner ?? "player";
  const enemySpell = b.enemyCast ? SPELLS[b.enemyCast.spellId] : null;
  const turnLabel = b.turn === "player" ? "Player 1" : "Player 2";
  // Pops appear over whoever the cast affected: attacks over the target,
  // heals and shields over the caster
  const selfCast = (c) => c && (c.type === "heal" || c.type === "shield");
  const leftPop =
    (b.lastEnemyCast && !selfCast(b.lastEnemyCast) ? b.lastEnemyCast : null) ??
    (selfCast(b.lastCast) ? b.lastCast : null);
  const rightPop =
    (b.lastCast && !selfCast(b.lastCast) ? b.lastCast : null) ??
    (selfCast(b.lastEnemyCast) ? b.lastEnemyCast : null);

  return (
    <motion.div
      className="race-screen battle-screen"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="track-wrap battle-stage">
        <ArenaScene
          pvp={pvp}
          turn={b.turn}
          playerCasting={
            !!b.selectedSpell && (!pvp || b.turn === "player") && !finished
          }
          enemyCasting={
            pvp
              ? !!b.selectedSpell && b.turn === "enemy" && !finished
              : !!b.enemyCast && !finished
          }
          playerCast={b.lastCast}
          enemyCast={b.lastEnemyCast}
          playerShield={b.playerShield}
          enemyShield={b.enemyShield}
          playerPoisoned={b.playerPoisonLeft > 0}
          enemyPoisoned={b.enemyPoisonLeft > 0}
          finished={finished}
          winner={winner}
          labels={labels}
          reducedMotion={!!reduced}
        />
        <div className="battle-overlay">
          <div className="hp-side left">
            <HpCard
              label={pvp ? "🧙 Player 1" : "🧙 You"}
              hp={b.playerHp}
              max={b.playerMax}
              tone="player"
              shield={b.playerShield}
              poisonLeft={b.playerPoisonLeft}
              active={pvp && b.turn === "player" && !finished}
            />
            <CastPop cast={leftPop} side="left" reduced={reduced} />
          </div>
          <div className="hp-side right">
            <HpCard
              label={
                pvp
                  ? "🧙 Player 2"
                  : online
                    ? "🧙 Opponent"
                    : b.enemyName
                      ? `🧙 ${b.enemyName}`
                      : "🧛 Rival"
              }
              hp={b.enemyHp}
              max={b.enemyMax}
              tone="bot"
              shield={b.enemyShield}
              poisonLeft={b.enemyPoisonLeft}
              active={pvp && b.turn === "enemy" && !finished}
            />
            {b.campaign && b.campaign.foeCount > 1 && (
              <div className="foe-counter">
                Foe {b.campaign.foeIndex + 1} / {b.campaign.foeCount}
              </div>
            )}
            <CastPop cast={rightPop} side="right" reduced={reduced} />
          </div>
        </div>
      </div>
      <div className="battle-status">
        {pvp ? (
          <span className={`turn-banner ${b.turn}`}>
            {b.selectedSpell
              ? `⚡ ${turnLabel} is casting…`
              : `🎲 ${turnLabel}'s turn — pick a spell!`}
          </span>
        ) : enemySpell ? (
          <>
            <span>
              ⚠️ {online ? "Opponent" : (b.enemyName ?? "Rival")} is casting{" "}
              <strong>{enemySpell.name}</strong>
            </span>
            <div className="bar telegraph-bar">
              <div
                className="bar-fill bot"
                style={{ width: `${Math.round(b.enemyCast.progress * 100)}%` }}
              />
            </div>
          </>
        ) : (
          <span className="telegraph-idle">
            {online
              ? "Cast fast — your opponent is too!"
              : `${b.enemyName ?? "Rival"} is thinking…`}
          </span>
        )}
      </div>
      {b.selectedSpell && b.incantation ? (
        <>
          {b.synopsis && (
            <div className="synopsis-chip">
              <span className="synopsis-label">What it does:</span> {b.synopsis}
            </div>
          )}
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
              content: b.style === "code" ? "full" : "battle",
              round: `${b.selectedSpell}-${b.castSeq}`,
            }}
          />
        </>
      ) : (
        <div className="pick-spell">
          <p className="pick-spell-title">
            {pvp ? `${turnLabel}, choose your spell!` : "Choose your spell!"}
          </p>
          <p className="pick-spell-hint">
            Press 1–5 or click a card — type it fast and clean to hit harder
          </p>
        </div>
      )}
      {game.mode === "battle" && <PowerupBar game={game} />}
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
        <span>Longer spells are stronger but slower to type</span>
        <span>Perfect + fast = CRIT</span>
        <span>Esc pauses</span>
      </footer>
    </motion.div>
  );
}
