import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MODES, MODE_GROUPS } from "../logic/machine.js";
import { BATTLE_STYLES } from "../logic/battle.js";
import { BOT_DIFFICULTIES, DIFFICULTY_ORDER } from "../logic/race.js";
import { CONTENT_TYPES } from "../data/challenges.js";
import { CAMPAIGN } from "../data/campaign.js";
import Lobby from "./Lobby.jsx";
import ModeCarousel from "./ModeCarousel.jsx";
import AccountMenu from "./AccountMenu.jsx";
import CampaignMap from "./CampaignMap.jsx";

const CONTENT_HINTS = {
  blanks: null,
  full: "Type the whole snippet line by line — it's shown faintly",
  sentences: "Type the whole sentence — punctuation counts!",
};

function bestText(mode, best) {
  if (mode === "pvp") return "Winner takes the bragging rights!";
  if (!best) return "No record yet — set one!";
  if (mode === "race") {
    return `Best win: speed ${Math.round(best.wpm)} in ${best.timeSeconds.toFixed(1)}s`;
  }
  if (mode === "battle") {
    return `Best duel win: speed ${Math.round(best.wpm)} in ${best.timeSeconds.toFixed(1)}s`;
  }
  if (mode === "endless") {
    return `Best run: speed ${Math.round(best.wpm)} · ${best.snippets} finished`;
  }
  return `Best trial: ${best.chars} points (speed ${Math.round(best.wpm)})`;
}

// Cycle a selection within an ordered list, clamped to the ends
function step(order, current, dir) {
  const i = order.indexOf(current);
  const next = Math.min(order.length - 1, Math.max(0, i + dir));
  return order[next];
}

export default function Menu({
  best,
  selectedMode,
  onSelectMode,
  difficulty,
  onSelectDifficulty,
  content,
  onSelectContent,
  showAnswers,
  onToggleAnswers,
  onStart,
  summary,
  battleStyle,
  onSelectBattleStyle,
  net,
  onHostOnline,
  onJoinOnline,
  onCancelOnline,
  user,
  onSignIn,
  onSignOut,
  busy,
  muted,
  onToggleMute,
  campaign,
  onStartCampaignLevel,
}) {
  const reduced = useReducedMotion();
  const isOnline = selectedMode === "online";
  const isCampaign = selectedMode === "campaign";
  const isBattle = selectedMode === "battle" || selectedMode === "pvp" || isOnline;
  const isBattleLike = isBattle || isCampaign;
  const showDifficulty = selectedMode === "race" || selectedMode === "battle";

  // Modes split into Solo / Versus; the active tab follows the selected mode
  const activeTab = MODES[selectedMode]?.group ?? "solo";
  const tabModes = useMemo(
    () => Object.values(MODES).filter((m) => m.group === activeTab),
    [activeTab]
  );
  const tabModeIds = tabModes.map((m) => m.id);

  const selectTab = (groupId) => {
    if (groupId === activeTab) return;
    const first = Object.values(MODES).find((m) => m.group === groupId);
    if (first) onSelectMode(first.id);
  };

  const [campaignOpen, setCampaignOpen] = useState(false);
  const [accountActive, setAccountActive] = useState(false);
  const overlayOpenRef = useRef(false);
  overlayOpenRef.current = campaignOpen || accountActive;

  // Rows the arrow keys rove through, top to bottom
  const rows = useMemo(() => {
    const r = ["modes"];
    if (showDifficulty) r.push("difficulty");
    r.push("options");
    if (!isOnline) r.push("start");
    return r;
  }, [showDifficulty, isOnline]);

  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    setActiveIdx((i) => Math.min(i, rows.length - 1));
  }, [rows]);
  const activeRow = rows[activeIdx];
  const rowClass = (id) => `nav-row${activeRow === id ? " nav-active" : ""}`;

  const openCampaign = () => {
    if (!isCampaign) onSelectMode("campaign");
    setCampaignOpen(true);
  };

  // Full keyboard navigation: up/down pick a row, left/right change its value
  useEffect(() => {
    const onKey = (e) => {
      if (overlayOpenRef.current) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Enter" && isCampaign) {
        e.preventDefault();
        setCampaignOpen(true);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(rows.length - 1, i + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const row = rows[activeIdx];
        if (row === "modes") {
          e.preventDefault();
          onSelectMode(step(tabModeIds, selectedMode, dir));
        } else if (row === "difficulty") {
          e.preventDefault();
          onSelectDifficulty(step(DIFFICULTY_ORDER, difficulty, dir));
        } else if (row === "options") {
          e.preventDefault();
          if (isBattleLike) {
            onSelectBattleStyle(step(Object.keys(BATTLE_STYLES), battleStyle, dir));
          } else {
            onSelectContent(step(Object.keys(CONTENT_TYPES), content, dir));
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    rows,
    activeIdx,
    selectedMode,
    tabModeIds,
    difficulty,
    content,
    battleStyle,
    isBattleLike,
    isCampaign,
    onSelectMode,
    onSelectDifficulty,
    onSelectContent,
    onSelectBattleStyle,
  ]);

  const clearedCount = campaign
    ? Object.values(campaign.cleared).filter((s) => s > 0).length
    : 0;

  return (
    <motion.section
      className="menu"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <AccountMenu
        user={user}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        busy={busy}
        summary={summary}
        muted={muted}
        onToggleMute={onToggleMute}
        showAnswers={showAnswers}
        onToggleAnswers={onToggleAnswers}
        onOverlayChange={setAccountActive}
      />

      <button
        type="button"
        className="gold-chip gold-corner"
        onClick={openCampaign}
        title="Campaign gold"
      >
        🪙 {campaign?.gold ?? 0}
      </button>

      <h1 className="title">SPELLCASTER</h1>
      <p className="tagline">Type spells. Outcast your rival.</p>

      <div className="mode-tabs" role="tablist">
        {MODE_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={activeTab === g.id}
            className={`mode-tab ${activeTab === g.id ? "active" : ""}`}
            onClick={() => selectTab(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className={rowClass("modes")}>
        <ModeCarousel
          modes={tabModes}
          selectedMode={selectedMode}
          onSelectMode={onSelectMode}
        />
      </div>

      {showDifficulty && (
        <div className={`option-group ${rowClass("difficulty")}`}>
          <span className="option-label">Difficulty</span>
          <div className="diff-row">
            {DIFFICULTY_ORDER.map((id) => {
              const profile = BOT_DIFFICULTIES[id];
              return (
                <button
                  key={id}
                  type="button"
                  className={`diff-btn ${difficulty === id ? "selected" : ""}`}
                  onClick={() => onSelectDifficulty(id)}
                >
                  {profile.label} &middot; {profile.baseWpm} WPM
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isBattleLike ? (
        <div className={`option-group ${rowClass("options")}`}>
          <span className="option-label">Spell style</span>
          <div className="content-row">
            {Object.values(BATTLE_STYLES).map((style) => (
              <button
                key={style.id}
                type="button"
                className={`content-btn ${battleStyle === style.id ? "selected" : ""}`}
                onClick={() => onSelectBattleStyle(style.id)}
                title={style.desc}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={`option-group ${rowClass("options")}`}>
          <span className="option-label">Challenge</span>
          <div className="content-row">
            {Object.values(CONTENT_TYPES).map((type) => (
              <button
                key={type.id}
                type="button"
                className={`content-btn ${content === type.id ? "selected" : ""}`}
                onClick={() => onSelectContent(type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isOnline ? (
        <>
          <p className="online-note">Host&apos;s spell style is used for both players</p>
          <Lobby
            net={net}
            onHost={onHostOnline}
            onJoin={onJoinOnline}
            onCancel={onCancelOnline}
          />
        </>
      ) : isCampaign ? (
        <>
          <div className="best-chip">
            {clearedCount} / {CAMPAIGN.length} levels cleared
            {campaign?.totalStars ? ` · ★ ${campaign.totalStars}` : ""}
          </div>
          <div className={rowClass("start")}>
            <motion.button
              className="btn btn-big"
              onClick={() => setCampaignOpen(true)}
              whileHover={reduced ? undefined : { scale: 1.05, rotate: -1.5 }}
              whileTap={reduced ? undefined : { scale: 0.95 }}
            >
              Open Campaign
            </motion.button>
          </div>
        </>
      ) : (
        <>
          <div className="best-chip">{bestText(selectedMode, best)}</div>
          <div className={rowClass("start")}>
            <motion.button
              className="btn btn-big"
              onClick={onStart}
              whileHover={reduced ? undefined : { scale: 1.05, rotate: -1.5 }}
              whileTap={reduced ? undefined : { scale: 0.95 }}
            >
              {MODES[selectedMode].startLabel}
            </motion.button>
          </div>
        </>
      )}

      <ul className="hints">
        {isCampaign ? (
          <>
            <li>Beat each wizard to unlock the next — hordes throw several foes at you</li>
            <li>Win to earn 🪙 gold and up to ★★★ · spend it in the shop (coming soon)</li>
            <li>Arrow keys navigate · Enter opens the campaign · Esc pauses a duel</li>
          </>
        ) : isBattle ? (
          <>
            {selectedMode === "pvp" && (
              <li>Grab a friend! Take turns — pick a spell, type it, pass the keyboard</li>
            )}
            {isOnline && (
              <li>Duel a friend anywhere — both cast at once, first to drop the other&apos;s HP wins</li>
            )}
            <li>Pick spells with 1&ndash;5 — stronger spells take longer to type</li>
            <li>
              {isOnline
                ? "Arrow keys navigate · Esc leaves the duel"
                : "Arrow keys navigate · Enter starts · Esc pauses"}
            </li>
          </>
        ) : (
          <>
            {content !== "blanks" ? (
              <li>{CONTENT_HINTS[content]}</li>
            ) : showAnswers ? (
              <li>The missing code is shown faintly in the blanks — type over it!</li>
            ) : (
              <li>Answers are hidden — hold Ctrl to peek (costs a little progress)</li>
            )}
            <li>Arrow keys navigate · Enter starts · Esc pauses</li>
          </>
        )}
      </ul>

      <CampaignMap
        open={campaignOpen}
        campaign={campaign}
        onStartLevel={(i) => {
          setCampaignOpen(false);
          onStartCampaignLevel(i);
        }}
        onClose={() => setCampaignOpen(false)}
      />
    </motion.section>
  );
}
