import {
  Trophy,
  Crown,
  Ticket,
  Zap,
  Bird,
  Gem,
  Timer,
  Spade,
  Briefcase,
  Sword,
  Coins,
} from "lucide-react";
import CatalogTile from "./CatalogTile";
import CatalogSection from "./CatalogSection";
import { useToast } from "@/components/ui/use-toast";
import { CLOSER_BG } from "@/lib/closerTheme";

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b280e3d1b_44c1b0077_tokens.png";
const DIAMOND_IMG =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b52888c95_Gemini_Generated_Image_3fwfra3fwfra3fwf-removebg-preview.png";
const CHIP_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/5d8530cab_Screenshot2026-10-05004629.png";

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
  closer: "The Closer",
};

function Balance({ img, value, label, color }) {
  return (
    <span className="flex items-center gap-1.5">
      <img src={img} alt="" className="h-4 w-4 object-contain" />
      <span className="text-[12px] font-black" style={{ color }}>
        {value}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
    </span>
  );
}

function QuickPill({ icon: Icon, label, onClick, highlighted }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-[11px] font-extrabold transition-transform active:scale-[0.97]"
      style={
        highlighted
          ? {
              background: "linear-gradient(135deg, #5bcbf9 0%, #3e6dfa 100%)",
              color: "#ffffff",
              boxShadow: "0 8px 18px -8px rgba(62, 109, 250, 0.75)",
            }
          : {
              background: "#ffffff",
              color: label === "VIP Pass" ? "#c8942a" : "#3b2f52",
              boxShadow: "0 6px 16px -10px rgba(58, 30, 96, 0.5)",
            }
      }
    >
      <Icon size={13} strokeWidth={2.6} />
      {label}
    </button>
  );
}

export default function TokensCatalog({ user, onOpen, ninjaEnabled, scratchAccess, horseAccess }) {
  const { toast } = useToast();
  const tokens = user?.earlyAccessTokens ?? 0;
  const diamonds = user?.diamonds ?? 0;
  const chips = Number(user?.casinoChips) || 0;

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
      {/* Balances */}
      <div className="flex items-center justify-between gap-2 rounded-full border border-border bg-card/80 px-3.5 py-2.5">
        <Balance img={TOKEN_IMG} value={tokens} label="Tokens" color="#b8860b" />
        <span className="h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/50" />
        <Balance img={DIAMOND_IMG} value={diamonds} label="Diamond" color="#2f7fd4" />
        <span className="h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/50" />
        <Balance img={CHIP_IMG} value={chips} label="Chips" color="#d4573f" />
      </div>

      {/* Quick destinations */}
      <div className="flex gap-2">
        <QuickPill icon={Trophy} label="Milestones" onClick={() => onOpen("milestones")} highlighted />
        <QuickPill icon={Crown} label="VIP Pass" onClick={() => onOpen("vip")} />
        <QuickPill icon={Ticket} label="Blind Voucher" onClick={() => onOpen("blindvoucher")} />
      </div>

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
            Featured
          </span>
          <span className="text-[19px] font-black uppercase leading-none tracking-wide" style={{ color: "#f7c25a" }}>
            The Closer
          </span>
          <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.78)" }}>
            Beat the Manager&apos;s Offer!
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
          name="The Closer"
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
        <CatalogTile
          name="Horse Betting"
          sub="Today's race"
          cost="10+ Chips"
          icon={Trophy}
          from="#5a3a1c"
          to="#2a1a0b"
          onClick={() => {
            if (!horseAccess) {
              toast({
                title: "Horse Betting",
                description: "This game isn't open to players right now.",
              });
              return;
            }
            onOpen("horseracing");
          }}
        />
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