/**
 * Network-anchored Brunei clock for the Daily Derby.
 *
 * The device clock is never trusted for the betting cutoff, the countdown or
 * result visibility. On startup the app asks a public time API for the real
 * Asia/Brunei time, then runs the clock from that verified epoch plus a
 * monotonic counter — so changing the phone's clock afterwards cannot move it.
 *
 * The last verified offset is cached, and reused when a refresh fails.
 *
 * This is a browser-level guard only: it defeats ordinary device-clock
 * manipulation, not a modified client or someone reading data from the backend.
 */

const STORAGE_KEY = "derby.networkClock";
const REFRESH_MS = 5 * 60 * 1000;
const BRUNEI_OFFSET = "+08:00";

let anchorEpoch = null; // verified network epoch ms
let anchorTick = null; // performance.now() when it was anchored
let lastSyncTick = -Infinity;
let inflight = null;

const tick = () => performance.now();

// A verified anchor exists (restored from cache or freshly synced). Booking
// waits on this so a tap during the first second cannot slip past the gate.
let verified = false;
const waiters = []; // released once the initial sync attempt has settled

function markVerified() {
  verified = true;
  waiters.splice(0).forEach((resolve) => resolve(true));
}

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!Number.isFinite(saved?.epoch) || !Number.isFinite(saved?.savedAt)) return;
    anchorEpoch = saved.epoch + (Date.now() - saved.savedAt);
    anchorTick = tick();
    markVerified();
  } catch {
    /* unreadable cache — the next successful sync anchors the clock */
  }
}

restore();

/** Current network-anchored time in epoch ms (device time only until the first sync). */
export function networkNow() {
  if (anchorEpoch === null) return Date.now();
  return anchorEpoch + (tick() - anchorTick);
}

export function networkDate() {
  return new Date(networkNow());
}

function parseBruneiWall(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(String(value || ""));
  if (!m) return null;
  const ms = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${BRUNEI_OFFSET}`);
  return Number.isFinite(ms) ? ms : null;
}

const SOURCES = [
  {
    url: "https://timeapi.io/api/time/current/zone?timeZone=Asia/Brunei",
    read: (data) => parseBruneiWall(data?.dateTime),
  },
  {
    url: "https://worldtimeapi.org/api/timezone/Asia/Brunei",
    read: (data) => (Number.isFinite(data?.unixtime) ? data.unixtime * 1000 : null),
  },
];

async function readSource(source) {
  const started = Date.now();
  const res = await fetch(source.url, { cache: "no-store" });
  if (!res.ok) return null;
  const epoch = source.read(await res.json());
  return Number.isFinite(epoch) ? { epoch, rtt: Date.now() - started } : null;
}

async function syncOnce() {
  for (const source of SOURCES) {
    try {
      const found = await readSource(source);
      if (!found) continue;
      anchorEpoch = found.epoch + found.rtt / 2;
      anchorTick = tick();
      lastSyncTick = tick();
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ epoch: anchorEpoch, savedAt: Date.now() })
        );
      } catch {
        /* storage blocked — the in-memory clock still holds */
      }
      markVerified();
      return true;
    } catch {
      /* try the next source */
    }
  }
  return false;
}

/** Refresh the verified time; simultaneous callers share one request. */
export function syncNetworkTime() {
  if (!inflight)
    inflight = syncOnce().finally(() => {
      inflight = null;
      // The attempt has settled: release anything waiting on it, even when it
      // failed — the clock then falls back to the last known time.
      waiters.splice(0).forEach((resolve) => resolve(verified));
    });
  return inflight;
}

/** Whether the Brunei clock is anchored to a verified time (cached or synced). */
export function networkTimeVerified() {
  return verified;
}

/** Resolves once the first sync attempt has settled; true when a verified anchor exists. */
export function whenNetworkTimeVerified() {
  if (verified) return Promise.resolve(true);
  return new Promise((resolve) => waiters.push(resolve));
}

/** Sync only when the anchor has gone stale — otherwise the last verified time stands. */
export function ensureNetworkTime() {
  if (tick() - lastSyncTick < REFRESH_MS) return;
  syncNetworkTime();
}

ensureNetworkTime();