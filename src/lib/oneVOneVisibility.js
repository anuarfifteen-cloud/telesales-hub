// Tracks whether the Blackjack 21 1V1 sub-tab is currently on screen.
//
// The new-challenge pop-out now lives at the app root (Home) so it can appear on
// any tab, but it must stay silent on the 1V1 sub-tab — the live open board there
// already lists every challenge. The game publishes its view here; the alert
// watcher reads it at the moment a challenge arrives.
let oneVOneVisible = false;

/** Called by Blackjack21Game whenever its sub-view changes. */
export function setOneVOneVisible(visible) {
  oneVOneVisible = !!visible;
}

/** True while the player is looking at the 1V1 challenge board. */
export function isOneVOneVisible() {
  return oneVOneVisible;
}