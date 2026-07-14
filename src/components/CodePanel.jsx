import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { charStates } from "../logic/typing.js";

function CompletedBlank({ answer }) {
  return <span className="blank done">{answer}</span>;
}

function UpcomingBlank({ answer, revealed }) {
  return (
    <span className="blank todo">
      {revealed ? answer : "·".repeat(answer.length)}
    </span>
  );
}

function ActiveBlank({ answer, typed, revealed, errorPing, reduced }) {
  const states = charStates(typed, answer);
  const nodes = [];
  for (let i = 0; i <= answer.length; i++) {
    if (i === typed.length) {
      nodes.push(<span key="caret" className="caret" />);
    }
    if (i === answer.length) break;
    const state = states[i];
    let cls = `char ${state}`;
    let display;
    if (state === "empty") {
      if (revealed) {
        cls = "char hint";
        display = answer[i] === " " ? " " : answer[i];
      } else {
        display = "·";
      }
    } else {
      display = typed[i] === " " ? " " : typed[i];
    }
    if (i === typed.length - 1 && !reduced) {
      nodes.push(
        <motion.span
          key={`c${i}-${typed[i]}`}
          className={cls}
          style={{ display: "inline-block" }}
          initial={{ scale: 1.35 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.12 }}
        >
          {display}
        </motion.span>
      );
    } else {
      nodes.push(
        <span key={`c${i}`} className={cls}>
          {display}
        </span>
      );
    }
  }
  return (
    <motion.span
      key={errorPing}
      className="blank active"
      animate={
        errorPing > 0 && !reduced ? { x: [0, -4, 4, -2, 0] } : { x: 0 }
      }
      transition={{ duration: 0.18 }}
    >
      {nodes}
    </motion.span>
  );
}

export default function CodePanel({ game }) {
  const { challenge, live, peekHeld, peekPenalty, showAnswers } = game;
  const reduced = useReducedMotion();
  return (
    <section className="code-panel">
      <AnimatePresence>
        {live.combo && (
          <motion.div
            key={live.combo.id}
            className="combo-pop"
            initial={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, y: 14, scale: 0.6, rotate: -14 }
            }
            animate={
              reduced
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1, rotate: -6 }
            }
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -22, rotate: 4 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            POW! {live.combo.value}&times; streak
          </motion.div>
        )}
      </AnimatePresence>
      <motion.pre
        key={game.round}
        className="code"
        initial={reduced ? { opacity: 0 } : { opacity: 0, x: 26 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {challenge.segments.map((seg, i) => {
          if (seg.type === "text") {
            return <span key={`t${i}`}>{seg.value}</span>;
          }
          const answer = challenge.answers[seg.index];
          if (seg.index < live.blankIndex) {
            return <CompletedBlank key={`b${i}`} answer={answer} />;
          }
          if (seg.index > live.blankIndex) {
            return (
              <UpcomingBlank
                key={`b${i}`}
                answer={answer}
                revealed={showAnswers}
              />
            );
          }
          return (
            <ActiveBlank
              key={`b${i}`}
              answer={answer}
              typed={live.typed}
              revealed={showAnswers || peekHeld}
              errorPing={live.errorPing}
              reduced={reduced}
            />
          );
        })}
      </motion.pre>
      {!showAnswers && (
        <div className="peek-row">
          <button
            type="button"
            className={`peek-btn ${peekHeld ? "held" : ""}`}
            tabIndex={-1}
            onPointerDown={game.peekStart}
            onPointerUp={game.peekEnd}
            onPointerLeave={game.peekEnd}
          >
            Hold to peek
          </button>
          <span className="peek-hint">
            or hold Ctrl &middot; costs {peekPenalty} chars of progress
          </span>
          {live.peekedCurrent && <span className="peek-flag">peeked</span>}
        </div>
      )}
    </section>
  );
}
