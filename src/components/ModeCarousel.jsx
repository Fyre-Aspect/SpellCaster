import { useCallback, useEffect, useRef } from "react";
import { MODES } from "../logic/machine.js";

export const MODE_ICONS = {
  campaign: "🏆",
  race: "🏁",
  battle: "⚔️",
  pvp: "🎮",
  online: "🌐",
  endless: "♾️",
  trial: "⏱️",
};

// Scroll/swipe-through mode picker. The centred card is the selected mode;
// arrows, dots, wheel and click all steer to a slide, and free scrolling
// snaps to whichever card lands in the middle.
export default function ModeCarousel({ modes = Object.values(MODES), selectedMode, onSelectMode }) {
  const trackRef = useRef(null);
  const slideRefs = useRef({});
  const settleTimer = useRef(null);
  // What the carousel last reported as centred — lets the sync effect tell an
  // external selection change (keyboard) apart from our own scroll updates
  const lastCentered = useRef(selectedMode);
  const index = modes.findIndex((m) => m.id === selectedMode);

  const scrollTo = useCallback((id, smooth = true) => {
    const el = slideRefs.current[id];
    const track = trackRef.current;
    if (!el || !track) return;
    const left = el.offsetLeft - (track.clientWidth - el.clientWidth) / 2;
    track.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Centre the persisted mode on first paint (no animation)
  useEffect(() => {
    scrollTo(selectedMode, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow selection changes that came from outside the carousel
  useEffect(() => {
    if (selectedMode !== lastCentered.current) {
      lastCentered.current = selectedMode;
      scrollTo(selectedMode);
    }
  }, [selectedMode, scrollTo]);

  const centredId = () => {
    const track = trackRef.current;
    if (!track) return null;
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = null;
    let bestDist = Infinity;
    for (const m of modes) {
      const el = slideRefs.current[m.id];
      if (!el) continue;
      const dist = Math.abs(el.offsetLeft + el.clientWidth / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = m.id;
      }
    }
    return best;
  };

  const onScroll = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const best = centredId();
      if (best) {
        lastCentered.current = best;
        if (best !== selectedMode) onSelectMode(best);
      }
    }, 110);
  };

  const go = (delta) => {
    const next = modes[index + delta];
    if (next) onSelectMode(next.id);
  };

  // Picking a card must not leave it focused, or the next Enter / Space
  // re-clicks the card instead of starting the match
  const choose = (id) => (e) => {
    e.currentTarget.blur();
    onSelectMode(id);
  };

  // Let a vertical wheel scroll the modes horizontally
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onWheel = (e) => {
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;
      const room =
        track.scrollWidth - track.clientWidth - track.scrollLeft > 1 || track.scrollLeft > 1;
      if (!room) return;
      e.preventDefault();
      track.scrollLeft += delta;
    };
    track.addEventListener("wheel", onWheel, { passive: false });
    return () => track.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  return (
    <div className="mode-carousel">
      <button
        type="button"
        className="carousel-arrow left"
        onClick={(e) => {
          e.currentTarget.blur();
          go(-1);
        }}
        disabled={index <= 0}
        aria-label="Previous mode"
      >
        ‹
      </button>

      <div className="mode-track" ref={trackRef} onScroll={onScroll}>
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            ref={(el) => {
              slideRefs.current[m.id] = el;
            }}
            className={`mode-slide ${selectedMode === m.id ? "selected" : ""}`}
            onClick={choose(m.id)}
            aria-pressed={selectedMode === m.id}
          >
            <span className="mode-slide-icon">{MODE_ICONS[m.id] ?? "✨"}</span>
            <span className="mode-slide-name">{m.label}</span>
            <span className="mode-slide-desc">{m.desc}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="carousel-arrow right"
        onClick={(e) => {
          e.currentTarget.blur();
          go(1);
        }}
        disabled={index >= modes.length - 1}
        aria-label="Next mode"
      >
        ›
      </button>

      <div className="carousel-dots">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`carousel-dot ${selectedMode === m.id ? "on" : ""}`}
            onClick={choose(m.id)}
            aria-label={m.label}
          />
        ))}
      </div>
    </div>
  );
}
