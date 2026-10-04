// Green (active today) / grey (inactive) status dot. Sits exactly on the
// avatar circle's bottom-right edge — the white 2px border punches a clean
// hole through the tier ring instead of floating over it.
const DOT_SIZE = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3 w-3",
};

export default function AvatarOnlineDot({ online, size = "sm" }) {
  return (
    <span
      className={`absolute z-10 rounded-full border-2 border-white ${DOT_SIZE[size] || DOT_SIZE.sm}`}
      style={{
        right: "-15%",
        bottom: "-15%",
        transform: "translate(50%, 50%)",
        background: online ? "#34d399" : "#94a3b8",
        boxShadow: online ? "0 0 6px rgba(52,211,153,0.8)" : "none",
      }}
      title={online ? "Active today" : "No activity today"}
    />
  );
}