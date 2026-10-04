import BronzeFrame from "./BronzeFrame";
import SilverFrame from "./SilverFrame";
import GoldFrame from "./GoldFrame";
import DiamondFrame from "./DiamondFrame";
import PlatinumFrame from "./PlatinumFrame";

// Decorative Vault tier overlay, drawn on top of the avatar image. The canvas
// is a square sitting outside the avatar box: the default inset is the exact
// ratio that makes the SVG's 100×100 viewBox line up with the avatar circle,
// while Platinum gets a larger canvas for its imposing wreath.
const FRAMES = {
  Bronze: BronzeFrame,
  Silver: SilverFrame,
  Gold: GoldFrame,
  Diamond: DiamondFrame,
  Platinum: PlatinumFrame,
};

const INSET = { Platinum: "-35%" };

export default function TierAvatarFrame({ tierTitle }) {
  const Frame = FRAMES[tierTitle];
  if (!Frame) return null;

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{ inset: INSET[tierTitle] || "-22.2%" }}
    >
      <Frame />
    </div>
  );
}