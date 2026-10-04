import { CHIP_IMG, TOKEN_IMG } from "./scratchPrizes";

// The one icon used for a scratch prize, shared by the celebration and the
// result card so both always show the same thing for the same win.
export default function ScratchPrizeIcon({ granted, size = 60 }) {
  if (!granted) return <span style={{ fontSize: size * 0.93, lineHeight: 1 }}>🎫</span>;
  if (granted.type === "chips") {
    return <img src={CHIP_IMG} alt="chip" style={{ width: size, height: size, objectFit: "cover", borderRadius: "50%" }} />;
  }
  if (granted.type === "tokens") {
    return <img src={TOKEN_IMG} alt="token" style={{ width: size, height: size, objectFit: "contain" }} />;
  }
  if (granted.type === "theme") return <span style={{ fontSize: size * 0.93, lineHeight: 1 }}>🎨</span>;
  return <span style={{ fontSize: size * 0.93, lineHeight: 1 }}>💎</span>;
}