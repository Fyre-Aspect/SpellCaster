// Online duels ride on WebRTC data channels. PeerJS's free public broker
// only handles the handshake — after that, traffic flows directly between
// the two browsers. A room is just a peer whose id embeds a short code.

import Peer from "peerjs";

const ID_PREFIX = "spellcaster-duel-v1-";
// No 0/O/1/I/L — codes get read out loud over voice chat
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const JOIN_TIMEOUT_MS = 10000;

// --- Quick match ---
// There is no matchmaking server, so players meet at a handful of well-known
// room ids instead. A searcher probes the slots in order: the first one that
// answers holds a waiting host. If none answer, the searcher claims the
// lowest free slot and waits there for the next arrival.
const QUICK_PREFIX = ID_PREFIX + "quick-";
const QUICK_SLOTS = 8;
const PROBE_MS = 2200; // long enough for a cold WebRTC handshake
const MAX_SCANS = 4;

export function randomCode() {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function normalizeCode(raw) {
  const code = (raw ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(code) ? code : null;
}

// handlers: { onWaiting(code), onConnected(isHost), onMessage(msg),
//             onPeerLeft(), onError(kind) }
export function createNet(handlers) {
  let peer = null;
  let conn = null;
  let destroyed = false;
  let joinTimer = null;

  function wire(c, isHost, alreadyOpen = false) {
    conn = c;
    const opened = () => {
      if (destroyed) return;
      if (joinTimer) clearTimeout(joinTimer);
      handlers.onConnected(isHost);
    };
    if (alreadyOpen) opened();
    else c.on("open", opened);
    c.on("data", (msg) => {
      if (!destroyed) handlers.onMessage(msg);
    });
    const gone = () => {
      if (!destroyed) handlers.onPeerLeft();
    };
    c.on("close", gone);
    c.on("error", gone);
  }

  // A host greets the one joiner it accepts. Quick-match probes rely on this
  // to tell a free room from one that is already mid-duel and turning them
  // away, so it must be the very first thing the room says.
  function accept(c, greet) {
    if (conn) {
      // Room is full — turn away extra joiners
      c.on("open", () => c.close());
      return;
    }
    if (greet) c.on("open", () => c.send({ t: "welcome" }));
    wire(c, true);
  }

  function fail(kind) {
    if (destroyed) return;
    if (joinTimer) clearTimeout(joinTimer);
    handlers.onError(kind);
  }

  // --- Quick match internals ---
  const busySlots = new Set(); // slots holding a duel already in progress
  let probeConn = null;
  let probeTimer = null;
  let probeGen = 0;
  let probeAdvance = null; // moves the scan on from the slot being probed
  let scans = 0;

  function dropProbe() {
    if (probeTimer) {
      clearTimeout(probeTimer);
      probeTimer = null;
    }
    try {
      probeConn?.close();
    } catch {
      /* already gone */
    }
    probeConn = null;
  }

  // Walk the slots looking for someone waiting. `slot` is where to look next.
  function probeSlot(slot) {
    if (destroyed || conn) return;
    if (slot >= QUICK_SLOTS) {
      claimSlot(0);
      return;
    }
    const gen = probeGen;
    let opened = false;
    const next = () => {
      if (gen !== probeGen || destroyed || conn) return;
      probeGen += 1;
      dropProbe();
      probeSlot(slot + 1);
    };
    probeAdvance = next;
    const c = peer.connect(QUICK_PREFIX + slot, { reliable: true });
    probeConn = c;
    c.on("open", () => {
      opened = true;
    });
    c.on("data", (msg) => {
      if (gen !== probeGen || destroyed || conn) return;
      if (msg?.t !== "welcome") return;
      // A free room greeted us — this is our opponent
      probeGen += 1;
      probeAdvance = null;
      if (probeTimer) clearTimeout(probeTimer);
      probeTimer = null;
      probeConn = null;
      wire(c, false, true);
    });
    c.on("close", () => {
      if (gen !== probeGen) return;
      // It let us in and hung up: that room is already mid-duel
      if (opened) busySlots.add(slot);
      next();
    });
    c.on("error", next);
    probeTimer = setTimeout(next, PROBE_MS);
  }

  // Nobody was waiting — open our own room at the lowest slot that is free
  function claimSlot(from) {
    if (destroyed || conn) return;
    dropProbe();
    try {
      peer?.destroy();
    } catch {
      /* already gone */
    }
    peer = null;
    let slot = from;
    while (slot < QUICK_SLOTS && busySlots.has(slot)) slot += 1;
    if (slot >= QUICK_SLOTS) {
      fail("busy");
      return;
    }
    peer = new Peer(QUICK_PREFIX + slot);
    peer.on("open", () => {
      if (!destroyed) handlers.onWaiting(null);
    });
    peer.on("connection", (c) => accept(c, true));
    peer.on("error", (err) => {
      if (destroyed || conn) return;
      if (err.type === "unavailable-id") {
        // Someone claimed this slot while we were scanning. They may be
        // another searcher waiting for an opponent, so look again before
        // hiding in a slot of our own.
        busySlots.add(slot);
        scan(slot);
        return;
      }
      fail("network");
    });
  }

  function scan(from) {
    if (destroyed || conn) return;
    scans += 1;
    if (scans > MAX_SCANS) {
      fail("busy");
      return;
    }
    handlers.onSearching?.();
    try {
      peer?.destroy();
    } catch {
      /* already gone */
    }
    peer = new Peer();
    peer.on("open", () => {
      if (!destroyed && !conn) probeSlot(from);
    });
    peer.on("error", (err) => {
      if (destroyed || conn) return;
      // "peer-unavailable" just means that slot stands empty — skip to the
      // next one right away instead of waiting out the probe timeout
      if (err.type === "peer-unavailable") probeAdvance?.();
      else fail("network");
    });
  }

  return {
    host(code) {
      peer = new Peer(ID_PREFIX + code);
      peer.on("open", () => {
        if (!destroyed) handlers.onWaiting(code);
      });
      peer.on("connection", (c) => accept(c, false));
      peer.on("error", (err) => {
        if (err.type === "unavailable-id") fail("code-taken");
        else fail("network");
      });
    },
    // Find any opponent, no code swapping required
    quick() {
      scan(0);
    },
    join(code) {
      peer = new Peer();
      peer.on("open", () => {
        if (destroyed) return;
        wire(peer.connect(ID_PREFIX + code, { reliable: true }), false);
        joinTimer = setTimeout(() => fail("not-found"), JOIN_TIMEOUT_MS);
      });
      peer.on("error", (err) => {
        if (err.type === "peer-unavailable") fail("not-found");
        else fail("network");
      });
    },
    send(msg) {
      if (conn?.open) conn.send(msg);
    },
    get connected() {
      return !!conn?.open;
    },
    destroy() {
      destroyed = true;
      if (joinTimer) clearTimeout(joinTimer);
      probeAdvance = null;
      dropProbe();
      try {
        conn?.close();
      } catch {
        /* already gone */
      }
      try {
        peer?.destroy();
      } catch {
        /* already gone */
      }
      conn = null;
      peer = null;
    },
  };
}
