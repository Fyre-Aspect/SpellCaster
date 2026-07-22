// Online duels ride on WebRTC data channels. PeerJS's free public broker
// only handles the handshake — after that, traffic flows directly between
// the two browsers. A room is just a peer whose id embeds a short code.

import Peer from "peerjs";

const ID_PREFIX = "spellcaster-duel-v1-";
// No 0/O/1/I/L — codes get read out loud over voice chat
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const JOIN_TIMEOUT_MS = 10000;

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

  function wire(c, isHost) {
    conn = c;
    c.on("open", () => {
      if (destroyed) return;
      if (joinTimer) clearTimeout(joinTimer);
      handlers.onConnected(isHost);
    });
    c.on("data", (msg) => {
      if (!destroyed) handlers.onMessage(msg);
    });
    const gone = () => {
      if (!destroyed) handlers.onPeerLeft();
    };
    c.on("close", gone);
    c.on("error", gone);
  }

  function fail(kind) {
    if (destroyed) return;
    if (joinTimer) clearTimeout(joinTimer);
    handlers.onError(kind);
  }

  return {
    host(code) {
      peer = new Peer(ID_PREFIX + code);
      peer.on("open", () => {
        if (!destroyed) handlers.onWaiting(code);
      });
      peer.on("connection", (c) => {
        if (conn) {
          // Room is full — turn away extra joiners
          c.on("open", () => c.close());
          return;
        }
        wire(c, true);
      });
      peer.on("error", (err) => {
        if (err.type === "unavailable-id") fail("code-taken");
        else fail("network");
      });
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
