const MUTED_KEY = "spellcaster.muted.v1";

let ctx = null;
let master = null;
let muted = loadMuted();

function loadMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === "true";
  } catch {
    return false;
  }
}

function ensureContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);
  return ctx;
}

// Browsers only allow audio after a user gesture; create/resume the
// context on the first one. Returns a cleanup that removes the listeners.
// While muted, no context is created at all — opening an audio device
// costs real time on some machines, so don't pay it for silence.
export function initAudio() {
  const unlock = () => {
    if (!muted) {
      const c = ensureContext();
      if (c && c.state === "suspended") c.resume();
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

function playTone({
  freq = 440,
  type = "sine",
  duration = 0.08,
  at = 0,
  gain = 1,
  slideTo = null,
}) {
  if (muted) return;
  const c = ensureContext();
  if (!c || c.state !== "running") return;
  try {
    const t0 = c.currentTime + at;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    }
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch {
    /* audio unavailable */
  }
}

export function keyTick(streak = 0) {
  playTone({
    freq: 520 + Math.min(streak, 30) * 8,
    type: "triangle",
    duration: 0.045,
    gain: 0.5,
  });
}

export function errorBuzz() {
  playTone({ freq: 110, type: "square", duration: 0.09, gain: 0.4 });
}

export function comboPop() {
  [660, 880, 1100].forEach((f, i) =>
    playTone({ freq: f, type: "triangle", duration: 0.07, at: i * 0.05, gain: 0.5 })
  );
}

export function countBeep() {
  playTone({ freq: 440, type: "sine", duration: 0.1, gain: 0.5 });
}

export function goBeep() {
  playTone({ freq: 660, type: "sine", duration: 0.22, gain: 0.6 });
}

export function winFanfare() {
  [523, 659, 784, 1047].forEach((f, i) =>
    playTone({ freq: f, type: "triangle", duration: 0.16, at: i * 0.09, gain: 0.55 })
  );
}

export function loseSlide() {
  playTone({ freq: 330, slideTo: 130, type: "sawtooth", duration: 0.5, gain: 0.35 });
}

export function finishChime() {
  [784, 988].forEach((f, i) =>
    playTone({ freq: f, type: "sine", duration: 0.15, at: i * 0.1, gain: 0.5 })
  );
}

export function uiClick() {
  playTone({ freq: 700, type: "triangle", duration: 0.04, gain: 0.35 });
}

// Rising magical swoosh for the fireball screen transition
export function castWhoosh() {
  playTone({ freq: 160, slideTo: 880, type: "sawtooth", duration: 0.5, gain: 0.28 });
  playTone({ freq: 420, slideTo: 1250, type: "triangle", duration: 0.55, gain: 0.2 });
  playTone({ freq: 90, slideTo: 220, type: "sine", duration: 0.6, gain: 0.3 });
}

export function isMuted() {
  return muted;
}

export function toggleMuted() {
  muted = !muted;
  if (!muted) {
    // Unmuting is always a user gesture — safe to open the device now
    const c = ensureContext();
    if (c && c.state === "suspended") c.resume();
  }
  try {
    localStorage.setItem(MUTED_KEY, String(muted));
  } catch {
    /* storage unavailable */
  }
  return muted;
}
