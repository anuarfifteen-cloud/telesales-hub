import { useOdometer } from "@/hooks/useOdometer";

// Renders an animated count-up number; instant jump when the value decreases.
export default function OdometerNumber({ value, duration = 800, className = "" }) {
  const display = useOdometer(value, duration);
  return <span className={`tabular-nums ${className}`}>{display}</span>;
}