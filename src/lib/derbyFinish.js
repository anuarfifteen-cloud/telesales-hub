/**
 * Finishing order for the Daily Derby.
 *
 * The race is a straight 15-second run: the saved winner covers the full
 * distance and every other runner falls short by its own fixed pace, so the
 * places are decided by exactly that pace — the same order the field is drawn in.
 */
function seed(id = "") {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return h;
}

export const paceFor = (id) => 0.9 + (seed(id) % 7) / 100;
export const phaseFor = (id) => (seed(id) % 628) / 100;

/** Every runner's id, from the winner down to the last horse home. */
export function finishOrder(horses = [], winnerId) {
  return (horses || [])
    .map((h) => ({
      id: h.id,
      number: Number(h.number) || 0,
      progress: h.id === winnerId ? 1 : Math.min(0.97, paceFor(h.id)),
    }))
    .sort((a, b) => b.progress - a.progress || a.number - b.number)
    .map((row) => row.id);
}

/** 1-based finishing place of one horse, or 0 when it is not in the field. */
export function placeOf(horses, winnerId, horseId) {
  if (!horseId) return 0;
  const idx = finishOrder(horses, winnerId).indexOf(horseId);
  return idx < 0 ? 0 : idx + 1;
}

/** The winner's official time; the rest of the field is spread behind it. */
export const RACE_BASE_SECONDS = 74.28;
const RACE_GAP_SECONDS = 10;

/** Official time as m:ss.hh (or ss.hh under a minute), to the hundredth. */
export function formatRaceTime(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(total / 60);
  const secs = total - mins * 60;
  const secStr = secs.toFixed(2).padStart(5, "0");
  return mins > 0 ? `${mins}:${secStr}` : `${secStr}s`;
}

/** 1st through 6th with finish times — shared by the results overlay and the bet card. */
export function raceResults(horses = [], winnerId) {
  const list = horses || [];
  return finishOrder(list, winnerId).map((id, i) => {
    const horse = list.find((h) => h.id === id) || { id, name: "Unknown", number: 0 };
    const pace = id === winnerId ? 1 : Math.min(0.97, paceFor(id));
    const seconds = RACE_BASE_SECONDS + (1 - pace) * RACE_GAP_SECONDS;
    return { ...horse, place: i + 1, seconds, time: formatRaceTime(seconds) };
  });
}

export function ordinal(n) {
  const num = Number(n) || 0;
  const rem10 = num % 10;
  const rem100 = num % 100;
  if (rem10 === 1 && rem100 !== 11) return `${num}st`;
  if (rem10 === 2 && rem100 !== 12) return `${num}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${num}rd`;
  return `${num}th`;
}