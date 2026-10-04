import BlackChipIcon from "@/components/casino21/BlackChipIcon";

const TOKEN_IMG = "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/b8e6d10d3_tokens.png";

// The one icon used for a scratch prize, shared by the celebration and the
// result card so both always show the same thing for the same win.
export default function ScratchPrizeIcon({ granted, size = 60 }) {
  if (!granted) return <span style={{ fontSize: size * 0.93, lineHeight: 1 }}>🎫</span>;
  if (granted.type === "chips") return <BlackChipIcon size={size} />;
  if (granted.type === "tokens") {
    return <img src={TOKEN_IMG} alt="token" style={{ width: size, height: size, objectFit: "contain" }} />;
  }
  if (granted.type === "theme") return <span style={{ fontSize: size * 0.93, lineHeight: 1 }}>🎨</span>;
  return <span style={{ fontSize: size * 0.93, lineHeight: 1 }}>💎</span>;
}