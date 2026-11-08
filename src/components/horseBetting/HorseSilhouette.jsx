import HorseSprite from "./HorseSprite";

/**
 * Betting-card horse: the lane's pixel-art runner with its lane number in a
 * small dark badge. `mix-blend-multiply` melts the sprite sheet's cream backdrop
 * into the card so only the horse and jockey show. Odds are never displayed —
 * every horse has an equal chance of winning.
 */
export default function HorseSilhouette({ number = 1, size = 42 }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size / 1.5 }}
    >
      <HorseSprite number={number} width={size} className="mix-blend-multiply" />
      <span
        className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-slate-900 text-[9px] font-black leading-none text-white ring-2 ring-white"
        style={{ width: 14, height: 14 }}
      >
        {number}
      </span>
    </span>
  );
}