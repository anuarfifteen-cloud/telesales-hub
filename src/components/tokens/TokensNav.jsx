import { Crown, Gamepad2, Trophy } from "lucide-react";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b280e3d1b_44c1b0077_tokens.png";
const DIAMOND_IMG =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b52888c95_Gemini_Generated_Image_3fwfra3fwfra3fwf-removebg-preview.png";

/** The three persistent views behind the Tokens tab. */
export const TOKEN_VIEWS = [
  { key: "arcade", label: "Arcade", icon: Gamepad2, inactiveColor: "#3b2f52" },
  { key: "milestones", label: "Milestones", icon: Trophy, inactiveColor: "#3b2f52" },
  { key: "vip", label: "VIP Pass", icon: Crown, inactiveColor: "#c8942a" },
];

function Balance({ img, Icon, value, label, color }) {
  return (
    <span className="flex items-center gap-1.5">
      {Icon ? <Icon size={13} /> : <img src={img} alt="" className="h-4 w-4 object-contain" />}
      <span className="text-[12px] font-black" style={{ color }}>
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
    <div className="sticky top-14 z-30 -mx-4 -mt-3 border-b border-border/60 bg-background/95 px-4 pb-2 pt-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 rounded-full border border-border bg-card/80 px-3.5 py-2.5">
        <Balance img={TOKEN_IMG} value={tokens} label="Tokens" color="#b8860b" />
        <span className="h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/50" />
        <Balance img={DIAMOND_IMG} value={diamonds} label="Diamond" color="#2f7fd4" />
        <span className="h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/50" />
        <Balance Icon={MiniChipIcon} value={chips} label="Chips" color="#d4573f" />
      </div>

      <div className="mt-2 flex gap-2">
        {TOKEN_VIEWS.map(({ key, label, icon: Icon, inactiveColor }) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-pressed={active}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-[11px] font-extrabold transition-transform active:scale-[0.97]"
              style={
                active
                  ? {
                      background: "linear-gradient(135deg, #5bcbf9 0%, #3e6dfa 100%)",
                      color: "#ffffff",
                      boxShadow: "0 8px 18px -8px rgba(62, 109, 250, 0.75)",
                    }
                  : {
                      background: "#ffffff",
                      color: inactiveColor,
                      boxShadow: "0 6px 16px -10px rgba(58, 30, 96, 0.5)",
                    }
              }
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