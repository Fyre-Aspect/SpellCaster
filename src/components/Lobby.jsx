import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const ERROR_TEXT = {
  "bad-code": "That code doesn't look right — 4 letters/numbers.",
  "not-found": "No room with that code. Check it and try again.",
  "code-taken": "Couldn't open a room — try again.",
  busy: "Every quick-match room is full right now. Try again in a moment, or duel a friend with a code.",
  network: "Connection trouble. Check your internet and retry.",
  "peer-left": "Your opponent left the room.",
};

function Searching({ title, note, onCancel, reduced }) {
  return (
    <motion.div
      className="lobby"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="matchmaking">
        <div className="radar" aria-hidden="true">
          <span className="radar-ring" />
          <span className="radar-ring delay" />
          <span className="radar-core" />
        </div>
        <p className="lobby-title">{title}</p>
        <p className="lobby-hint">{note}</p>
      </div>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>
        Cancel
      </button>
    </motion.div>
  );
}

export default function Lobby({ net, onHost, onJoin, onQuickMatch, onCancel }) {
  const reduced = useReducedMotion();
  const [code, setCode] = useState("");
  const status = net.status;
  const busy = status === "starting" || status === "connecting";
  const waiting = status === "waiting";

  // Quick match: scanning for an opponent, then holding a public room open
  if (status === "searching" || status === "queued") {
    return (
      <Searching
        reduced={reduced}
        onCancel={onCancel}
        title={
          status === "searching"
            ? "Finding you an opponent…"
            : "You're in the queue!"
        }
        note={
          status === "searching"
            ? "Scanning the arenas for another wizard"
            : "Waiting for the next wizard to show up — the duel starts the moment they do"
        }
      />
    );
  }

  // Host is waiting for a friend to join
  if (waiting) {
    return (
      <motion.div
        className="lobby"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <p className="lobby-title">Room ready — share this code:</p>
        <div className="room-code">{net.code}</div>
        <p className="lobby-hint">
          Your friend picks <strong>Online Duel</strong> → <strong>Join a
          room</strong> and types it in.
        </p>
        <div className="lobby-spinner">Waiting for opponent…</div>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="lobby"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button
        type="button"
        className="quick-match"
        disabled={busy}
        onClick={(e) => {
          e.currentTarget.blur();
          onQuickMatch();
        }}
      >
        <span className="quick-match-label">Quick Match</span>
        <span className="quick-match-sub">
          Instantly duel whoever else is online — no code needed
        </span>
      </button>

      <div className="lobby-or">or duel a friend</div>

      <div className="lobby-cols">
        <div className="lobby-col">
          <p className="lobby-title">Start a duel</p>
          <p className="lobby-hint">Open a room and share the code.</p>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={(e) => {
              e.currentTarget.blur();
              onHost();
            }}
          >
            {status === "starting" ? "Opening…" : "Create Room"}
          </button>
        </div>
        <div className="lobby-divider">or</div>
        <form
          className="lobby-col"
          onSubmit={(e) => {
            e.preventDefault();
            onJoin(code);
          }}
        >
          <p className="lobby-title">Join a room</p>
          <input
            className="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="CODE"
            maxLength={4}
            autoComplete="off"
            spellCheck={false}
            aria-label="Room code"
          />
          <button
            type="submit"
            className="btn"
            disabled={busy || code.length < 4}
          >
            {status === "connecting" ? "Connecting…" : "Join"}
          </button>
        </form>
      </div>
      {status === "error" && net.error && (
        <p className="lobby-error">{ERROR_TEXT[net.error] ?? "Something went wrong."}</p>
      )}
    </motion.div>
  );
}
