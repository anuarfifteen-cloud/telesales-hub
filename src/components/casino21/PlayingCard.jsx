import { useEffect } from "react";
import { motion } from "framer-motion";
import { playCardSlide } from "@/lib/sounds";

// The active theme is set as data-theme on <html>. Royal Batik gets gold cards.
function isRoyalBatik() {
  return (
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "royal_batik"
  );
}

// Gold metallic fill + fine grain, shared by the face and the back in Royal Batik.
const GOLD_FILL =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, rgba(120,90,20,0.14) 0 1px, transparent 1px 3px), linear-gradient(135deg, #8B6914 0%, #D4AF37 25%, #FEF1C9 50%, #D4AF37 75%, #8B6914 100%)";

// Card back: gold in Royal Batik, navy criss-cross grid everywhere else.
function CardBack({ gold = false }) {
  if (gold) {
    return (
      <div
        className="absolute inset-0 rounded-none border-[3px] border-black overflow-hidden shadow-lg"
        style={{ backgroundImage: GOLD_FILL }}
      >
        <div className="absolute inset-1 rounded-none border border-white/40" />
      </div>
    );
  }
  return (
    <div
      className="absolute inset-0 rounded-none border-[3px] border-black bg-blue-900 overflow-hidden shadow-lg"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 6px, transparent 6px 12px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.12) 0 6px, transparent 6px 12px)",
      }}
    >
      <div className="absolute inset-1 rounded-none border border-white/25" />
    </div>
  );
}

// Card face: gold in Royal Batik (red suits deep red, black suits dark ink),
// white elsewhere. Suit/rank colors are inline styles so the Royal Batik global
// white-text override can never wash a spade or club out against the card.
function CardFace({ card, gold = false }) {
  const isRed = card?.color === "red";
  const suitColor = gold ? (isRed ? "#8B0000" : "#1a1a1a") : isRed ? "#dc2626" : "#0f172a";
  return (
    <div
      className={`absolute inset-0 rounded-none border-[3px] border-black shadow-lg overflow-hidden ${
        gold ? "" : "bg-white"
      }`}
      style={gold ? { backgroundImage: GOLD_FILL } : undefined}
    >
      <div className="absolute top-1 left-1.5 leading-none" style={{ color: suitColor }}>
        <span className="block text-xs sm:text-sm font-black">{card.rank}</span>
        <span className="block text-[10px] sm:text-xs">{card.suit}</span>
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center text-xl sm:text-2xl"
        style={{ color: suitColor }}
      >
        {card.suit}
      </div>
      <div className="absolute bottom-1 right-1.5 leading-none rotate-180" style={{ color: suitColor }}>
        <span className="block text-xs sm:text-sm font-black">{card.rank}</span>
        <span className="block text-[10px] sm:text-xs">{card.suit}</span>
      </div>
    </div>
  );
}

export default function PlayingCard({
  card,
  faceDown = false,
  backOnly = false,
  delay = 0,
  isNew = false,
  zIndex = 0,
  small = false,
  flipIn = false,
}) {
  // Phones get a shorter card so a full felt — dealer hand, both player seats,
  // the wager row and Deal — fits one screen height; desktop keeps the big card.
  const sizeClass = small ? "h-14 w-10 sm:h-16 sm:w-11" : "h-16 w-11 sm:h-24 sm:w-16";
  const gold = isRoyalBatik();

  // A newly dealt card fires its slide sound exactly as it lands (after the
  // animation delay), so audio and visuals stay in sync — one click per card.
  useEffect(() => {
    if (!isNew) return;
    const t = setTimeout(playCardSlide, Math.max(0, delay) * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const landing = {
    initial: isNew ? { opacity: 0, y: -28, rotate: -8, scale: 0.85 } : false,
    animate: { opacity: 1, y: 0, rotate: 0, scale: 1 },
    transition: { type: "spring", stiffness: 260, damping: 20, delay },
  };

  // Back-only mode: render ONLY the card back. The face value is never mounted
  // in the DOM, so nothing can flash through during the deal-in animation.
  if (backOnly) {
    return (
      <motion.div {...landing} className={`relative ${sizeClass} flex-shrink-0`} style={{ zIndex }}>
        <CardBack gold={gold} />
      </motion.div>
    );
  }

  return (
    <motion.div
      {...landing}
      className={`relative ${sizeClass} flex-shrink-0`}
      style={{ perspective: 800, zIndex }}
    >
      {/* A seat turning over mounts here at 180° and rotates to face-up; every
          other card starts flat, so only the reveal plays a flip. */}
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={flipIn ? { rotateY: 180 } : false}
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <CardFace card={card} gold={gold} />
        </div>
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <CardBack gold={gold} />
        </div>
      </motion.div>
    </motion.div>
  );
}