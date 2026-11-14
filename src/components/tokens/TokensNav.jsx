import { Crown, Gamepad2, Trophy } from "lucide-react";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b280e3d1b_44c1b0077_tokens.png";
const DIAMOND_IMG =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b52888c95_Gemini_Generated_Image_3fwfra3fwfra3fwf-removebg-preview.png";

/** The three persistent views behind the Tokens tab. */
export const TOKEN_VIEWS = [
  { key: "arcade", label: "Arcade", icon: Gamepad2 },
  { key: "milestones", label: "Milestones", icon: Trophy },
  { key: "vip", label: "VIP Pass", icon: Crown },
];

function Balance({ img, Icon, value, label, color }) {
  return (
    <span className="flex items-center gap-1.5">
      {Icon ? <Icon size={13} /> : <img src={img} alt="" className="h-4 w-4 object-contain" />}
      <span className="tokens-wallet-value text-[12px] font-black" style={{ color }}>
        {value}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
    </span>
  );
}

/**
 * Compact wallet bar plus the sticky three-pill view toggle. It stays pinned
 * under the app header so the player can always switch between Arcade,
 * Milestones and VIP Pass — even mid-game.
 */
export default function TokensNav({ user, value, onChange }) {
  const tokens = user?.earlyAccessTokens ?? 0;
  const diamonds = user?.diamonds ?? 0;
  const chips = Number(user?.casinoChips) || 0;

  return (
    <div className="tokens-nav-bar sticky top-14 z-30 -mx-4 -mt-3 border-b border-border/60 bg-background/95 px-4 pb-2 pt-3 backdrop-blur-md">
      <div className="tokens-wallet flex items-center justify-between gap-2 rounded-full border border-border bg-card/80 px-3.5 py-2.5">
        <Balance img={TOKEN_IMG} value={tokens} label="Tokens" color="#b8860b" />
        <span className="h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/50" />
        <Balance img={DIAMOND_IMG} value={diamonds} label="Diamond" color="#2f7fd4" />
        <span className="h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/50" />
        <Balance Icon={MiniChipIcon} value={chips} label="Chips" color="#d4573f" />
      </div>

      <div className="mt-2 flex gap-2">
        {TOKEN_VIEWS.map(({ key, label, icon: Icon }) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-pressed={active}
              className={`tokens-pill flex flex-1 items-center justify-center gap-1.5 rounded-full border px-2 py-2.5 text-[11px] font-extrabold transition-transform active:scale-[0.97] ${
                active
                  ? "tokens-pill-active border-transparent bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-card/85 text-foreground shadow-sm"
              }`}
            >
              <Icon size={13} strokeWidth={2.6} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}