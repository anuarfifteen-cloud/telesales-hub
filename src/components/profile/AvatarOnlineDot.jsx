// Green (active today) / grey (inactive) status dot for an avatar. Sits on the
// outer edge of the tier frame: `offset` pushes it out past the avatar box so
// the thicker frames don't bury it.
const DOT_SIZE = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

export default function AvatarOnlineDot({ online, size = "sm", offset = "0" }) {
  return (
    <span
      className={`absolute z-30 rounded-full ${DOT_SIZE[size] || DOT_SIZE.md}`}
      style={{
        right: offset,
        bottom: offset,
        transform: "translate(50%, 50%)",
        border: "2px solid rgba(15,23,42,0.85)",
        background: online ? "#34d399" : "#94a3b8",
        boxShadow: online ? "0 0 6px rgba(52,211,153,0.9)" : "none",
      }}
      title={online ? "Active today" : "No activity today"}
    />
  );
}