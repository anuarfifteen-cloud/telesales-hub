import {
  Trophy,
  Ticket,
  Zap,
  Bird,
  Gem,
  Timer,
  Spade,
  Briefcase,
  Sword,
  Coins,
  Gift,
} from "lucide-react";
import CatalogTile from "./CatalogTile";
import CatalogSection from "./CatalogSection";
import { CLOSER_BG } from "@/lib/closerTheme";

/** Heading shown above an opened destination. */
export const GAME_TITLES = {
  milestones: "Milestones",
  vip: "VIP Pass",
  blindvoucher: "Blind Voucher",
  coinflip: "Coin Flip",
  perfect10: "Perfect 10",
  supertap: "Super Tap",
  flappy: "Flappy Token",
  diamondsmash: "Diamond Smash",
  ninja: "Ninja Slice",
  scratchcard: "Scratch Card",
  blackjack21: "Blackjack 21",
  horseracing: "Horse Betting",
  closer: "Dealbreaker",
};

export default function TokensCatalog({ onOpen, ninjaEnabled, scratchAccess, horseAccess }) {
  const tournaments = [
    ninjaEnabled && {
      key: "ninja",
      name: "Ninja Slice",
      sub: "Season leaderboard",
      cost: "Free Play",
      icon: Sword,
      from: "#3b1d63",
      to: "#1b0f31",
    },
    {
      key: "supertap",
      name: "Super Tap",
      sub: "Season leaderboard",
      cost: "Free Play",
      icon: Zap,
      from: "#15346b",
      to: "#0a1a38",
    },
    {
      key: "flappy",
      name: "Flappy Token",
      sub: "Season leaderboard",
      cost: "Free Play",
      icon: Bird,
      from: "#0d5a54",
      to: "#06302d",
    },
    {
      key: "diamondsmash",
      name: "Diamond Smash",
      sub: "Season leaderboard",
      cost: "Free Play",
      icon: Gem,
      from: "#5b1765",
      to: "#2c0a33",
    },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5 pb-2">
      {/* The Closer feature banner */}
      <button
        type="button"
        onClick={() => onOpen("closer")}
        className="relative w-full overflow-hidden rounded-3xl text-left transition-transform active:scale-[0.99]"
        style={{ boxShadow: "0 16px 32px -14px rgba(12, 47, 42, 0.8)" }}
      >
        <img
          src={CLOSER_BG}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "12% 32%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(10,38,34,0.45) 0%, rgba(11,42,37,0.9) 52%, #0b2a25 100%)",
          }}
        />
        <div className="relative flex min-h-[118px] flex-col items-end justify-center gap-1 px-4 text-right">
          <span className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.6)" }}>
            New Release
          </span>
          <span className="text-[19px] font-black uppercase leading-none tracking-wide" style={{ color: "#f7c25a" }}>
            Dealbreaker
          </span>
          <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.78)" }}>
            Take the Deal. Or Risk It All!
          </span>
          <span
            className="mt-1.5 inline-flex items-center rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest"
            style={{ background: "linear-gradient(90deg, #fecf6a 0%, #d4a34b 100%)", color: "#3a2405" }}
          >
            Play Now
          </span>
        </div>
      </button>

      {/* Monthly tournaments */}
      <CatalogSection
        title="Monthly Tournaments"
        right={<span style={{ color: "#e0344b" }}>📅 Monthly deadline</span>}
      >
        {tournaments.map((t) => (
          <CatalogTile key={t.key} {...t} onClick={() => onOpen(t.key)} />
        ))}
      </CatalogSection>

      {/* Chip arcade */}
      <CatalogSection title="Chip Arcade" right={<span className="text-muted-foreground">Chips required 🪙</span>}>
        <CatalogTile
          name="Dealbreaker"
          sub="3 seats a day"
          cost="100 Chips"
          icon={Briefcase}
          from="#14453c"
          to="#071e1a"
          onClick={() => onOpen("closer")}
        />
        <CatalogTile
          name="Blackjack 21"
          sub="Beat the dealer"
          cost="5+ Chips"
          icon={Spade}
          from="#0f4a36"
          to="#04231a"
          onClick={() => onOpen("blackjack21")}
        />
        {horseAccess ? (
          <CatalogTile
            name="Horse Betting"
            sub="Today's race"
            cost="10+ Chips"
            icon={Trophy}
            from="#5a3a1c"
            to="#2a1a0b"
            onClick={() => onOpen("horseracing")}
          />
        ) : null}
      </CatalogSection>

      {/* Instant play */}
      <CatalogSection title="Instant Play" right={<span className="text-muted-foreground">Tokens only</span>}>
        <CatalogTile
          name="Coin Flip"
          sub="Double or nothing"
          cost="1+ Tokens"
          icon={Coins}
          from="#8a5a12"
          to="#3d2606"
          onClick={() => onOpen("coinflip")}
        />
        <CatalogTile
          name="Perfect 10"
          sub="Timing challenge"
          cost="1 Token"
          icon={Timer}
          from="#2b2f7a"
          to="#12142f"
          onClick={() => onOpen("perfect10")}
        />
        <CatalogTile
          name="Blind Voucher"
          sub="Mystery reward"
          cost="2 Tokens"
          icon={Gift}
          from="#4a2a6b"
          to="#1d0f2e"
          onClick={() => onOpen("blindvoucher")}
        />
        {scratchAccess ? (
          <CatalogTile
            name="Scratch Card"
            sub="Three symbols win"
            cost="5 Tokens"
            icon={Ticket}
            from="#7a4a10"
            to="#38200a"
            onClick={() => onOpen("scratchcard")}
          />
        ) : null}
      </CatalogSection>
    </div>
  );
}