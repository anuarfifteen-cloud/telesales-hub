// Tiny cross-tree navigation bus for "go to the Ranked table felt".
//
// The Daily Mystery Card modal lives at the app root (Home), but the Ranked
// table felt is nested several layers deep (Home → TokensTab → Blackjack21Game
// → MilestoneProgressionView → RankedBlackjackPanel). Rather than lift all
// that state, the modal dispatches a signal here; each level that needs to
// react subscribes and advances its own local state exactly once per signal
// using a last-seen counter.
let signal = 0;
const listeners = new Set();

/** Dispatch a "open the Ranked table" request to every subscribed level. */
export function requestGoToRanked() {
  signal += 1;
  listeners.forEach((cb) => {
    try {
      cb(signal);
    } catch {
      /* ignore listener errors */
    }
  });
}

/** Current signal counter value. Each subscriber compares it to its own
 *  last-seen value to react exactly once per request. */
export function getRankedSignal() {
  return signal;
}

/** Subscribe to Ranked-navigation requests. Returns an unsubscribe function. */
export function onRankedNavRequest(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}