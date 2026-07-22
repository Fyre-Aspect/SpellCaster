import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const ERROR_TEXT = {
  "bad-code": "That code doesn't look right — 4 letters/numbers.",
  "not-found": "No room with that code. Check it and try again.",
  "code-taken": "Couldn't open a room — try again.",
  network: "Connection trouble. Check your internet and retry.",
  "peer-left": "Your opponent left the room.",
};

export default function Lobby({ net, onHost, onJoin, onCancel }) {
  const reduced = useReducedMotion();
  const [code, setCode] = useState("");
  const status = net.status;
  const busy = status === "starting" || status === "connecting";
  const waiting = status === "waiting";

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
      <div className="lobby-cols">
        <div className="lobby-col">
          <p className="lobby-title">Start a duel</p>
          <p className="lobby-hint">Open a room and share the code.</p>
          <button
            type="button"
            className="btn btn-big"
            disabled={busy}
            onClick={onHost}
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
            className="btn btn-big"
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
