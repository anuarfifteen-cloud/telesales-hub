import { useEffect } from "react";
import { motion } from "framer-motion";
import { playCardSlide } from "@/lib/sounds";

// Silver-royal card renderer exclusive to the Ranked Blackjack table.
//   • Card back: deep ruby crimson with subtle gold filigree lattice.
//   • Card face: brushed platinum/silver metallic surface, regal Cinzel
//     serif rank + suit, charcoal Spades/Clubs, metallic ruby
//     Hearts/Diamonds, ornate central crest on J/Q/K/A.
//   • Smooth 8px rounded corners, soft drop shadow, no thick black outline.

// Ruby crimson back fill with a subtle gold filigree diamond lattice.
const RUBY_BACK =
  "radial-gradient(circle at 50% 42%, rgba(255,210,210,0.22) 0%, transparent 38%), " +
  "repeating-linear-gradient(45deg, rgba(212,175,55,0.10) 0 1px, transparent 1px 6px), " +
  "repeating-linear-gradient(-45deg, rgba(212,175,55,0.10) 0 1px, transparent 1px 6px), " +
  "linear-gradient(160deg, #7a0a1a 0%, #5a0712 45%, #3e050c 100%)";

// Brushed platinum/silver face fill.
const SILVER_FACE =
  "repeating-linear-gradient(90deg, rgba(255,255,255,0.30) 0 1px, transparent 1px 3px), " +
  "linear-gradient(160deg, #fbfbfd 0%, #ececf1 32%, #dadae2 62%, #c7c7d2 100%)";

// Central crest ornament for court cards (J/Q/K/A) — a silver filigree emblem.
function Crest({ rank }) {
  const emblem = rank === "A" ? "✦" : rank === "K" ? "♛" : rank === "Q" ? "♕" : "♟";
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ color: "rgba(90,90,110,0.18)" }}
    >
      <span className="text-2xl sm:text-3xl" style={{ fontFamily: "Cinzel, serif" }}>
        {emblem}
      </span>
    </div>
  );
}

function RankedCardBack() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        borderRadius: 8,
        backgroundImage: RUBY_BACK,
        boxShadow: "0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
    >
      {/* Gold filigree inner frame */}
      <div
        className="absolute inset-1"
        style={{
          borderRadius: 6,
          border: "1px solid rgba(212,175,55,0.45)",
          boxShadow: "inset 0 0 6px rgba(212,175,55,0.25)",
        }}
      />
      {/* Center crest medallion */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: "rgba(212,175,55,0.55)" }}
      >
        <span
          className="text-base sm:text-lg"
          style={{ fontFamily: "Cinzel, serif", fontWeight: 700 }}
        >
          ♛
        </span>
      </div>
    </div>
  );
}

function RankedCardFace({ card }) {
  const isRed = card?.color === "red";
  const suitColor = isRed ? "#9b1b3a" : "#2a2a33"; // metallic ruby / charcoal
  const isCourt =
    card?.rank === "A" ||
    card?.rank === "J" ||
    card?.rank === "Q" ||
    card?.rank === "K";

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        borderRadius: 8,
        backgroundImage: SILVER_FACE,
        boxShadow: "0 4px 10px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.6)",
      }}
    >
      {/* Thin platinum inner edge */}
      <div
        className="absolute inset-0.5"
        style={{ borderRadius: 6, border: "1px solid rgba(160,160,175,0.35)" }}
      />

      {isCourt && <Crest rank={card.rank} />}

      {/* Top-left rank + suit */}
      <div
        className="absolute top-1 left-1.5 leading-none"
        style={{ color: suitColor, fontFamily: "Cinzel, serif" }}
      >
        <span className="block text-[11px] sm:text-sm font-bold tracking-tight">
          {card.rank}
        </span>
        <span className="block text-[9px] sm:text-[11px]">{card.suit}</span>
      </div>

      {/* Center suit pip */}
      <div
        className="absolute inset-0 flex items-center justify-center text-lg sm:text-2xl"
        style={{ color: suitColor }}
      >
        {card.suit}
      </div>

      {/* Bottom-right rank + suit (rotated) */}
      <div
        className="absolute bottom-1 right-1.5 leading-none rotate-180"
        style={{ color: suitColor, fontFamily: "Cinzel, serif" }}
      >
        <span className="block text-[11px] sm:text-sm font-bold tracking-tight">
          {card.rank}
        </span>
        <span className="block text-[9px] sm:text-[11px]">{card.suit}</span>
      </div>
    </div>
  );
}

export default function RankedPlayingCard({
  card,
  faceDown = false,
  backOnly = false,
  delay = 0,
  isNew = false,
  silent = false,
  zIndex = 0,
  small = false,
}) {
  const sizeClass = small ? "h-16 w-11" : "h-20 w-14 sm:h-24 sm:w-16";

  useEffect(() => {
    if (!isNew || silent) return;
    const t = setTimeout(playCardSlide, Math.max(0, delay) * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const landing = {
    initial: isNew ? { opacity: 0, y: -40, rotate: -8, scale: 0.85 } : false,
    animate: { opacity: 1, y: 0, rotate: 0, scale: 1 },
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay },
  };

  if (backOnly) {
    return (
      <motion.div {...landing} className={`relative ${sizeClass} flex-shrink-0`} style={{ zIndex }}>
        <RankedCardBack />
      </motion.div>
    );
  }

  return (
    <motion.div
      {...landing}
      className={`relative ${sizeClass} flex-shrink-0`}
      style={{ perspective: 800, zIndex }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <RankedCardFace card={card} />
        </div>
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <RankedCardBack />
        </div>
      </motion.div>
    </motion.div>
  );
}