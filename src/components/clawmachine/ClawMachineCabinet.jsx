import { useEffect, useRef } from "react";

// ── Cabinet geometry (px inside the glass window) ─────────────────────────────
const GLASS_H = 320;
const CLAW_REST = 8;
const CLAW_W = 60;
const CAPSULE_SIZE = 44;
const FLOOR_PAD = 18;
const CABLE_DROP = 202; // claw travel on a drop
const CABLE_SLIP = 101; // claw height when it slips (halfway up)
const CARRIED_TOP = 34; // capsule top offset inside the claw group
const SPEED = 34; // % of the track per second
const MIN_X = 7;
const MAX_X = 93;

export const CLAW_DROP_Y = CABLE_DROP;
export const CLAW_SLIP_Y = CABLE_SLIP;

function Capsule({ color, size = CAPSULE_SIZE }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,0.85), ${color} 42%, ${color} 68%, rgba(0,0,0,0.45) 100%)`,
        border: "2px solid rgba(255,255,255,0.55)",
        boxShadow: "0 4px 10px rgba(0,0,0,0.5), inset 0 -5px 10px rgba(0,0,0,0.3)",
      }}
    />
  );
}

/**
 * The retro arcade cabinet: marquee, glass window, floor of capsules and the
 * claw. The horizontal sweep is driven by its own rAF loop writing straight to
 * the DOM (no per-frame re-render); `xRef` is the shared claw position the game
 * reads when a drop is pressed.
 */
export default function ClawMachineCabinet({
  capsules,
  xRef,
  moving,
  clawY,
  grabbed,
  falling,
  message,
  tokens,
  onDrop,
  disabled,
}) {
  const clawElRef = useRef(null);
  const dirRef = useRef(1);

  useEffect(() => {
    if (!moving) return undefined;
    let raf;
    let last = performance.now();

    const step = (now) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      let x = xRef.current + dirRef.current * SPEED * dt;
      if (x >= MAX_X) {
        x = MAX_X;
        dirRef.current = -1;
      } else if (x <= MIN_X) {
        x = MIN_X;
        dirRef.current = 1;
      }
      xRef.current = x;
      if (clawElRef.current) clawElRef.current.style.left = `${x}%`;
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [moving, xRef]);

  const spacing = 100 / capsules.length;
  const clawX = xRef.current;

  return (
    <div
      style={{
        background: "linear-gradient(160deg,#1b1035 0%,#2b1a57 55%,#160c2e 100%)",
        border: "6px solid #0b0620",
        borderRadius: 28,
        padding: 14,
        boxShadow: "0 24px 60px rgba(0,0,0,0.5), inset 0 0 0 3px rgba(255,255,255,0.05)",
      }}
    >
      <style>{`
        @keyframes clawBlink { 0%,100% { opacity: 1 } 50% { opacity: 0.25 } }
        @keyframes clawFall {
          from { transform: translate(-50%, 0); }
          65% { transform: translate(-50%, 108px); }
          80% { transform: translate(-50%, 115px); }
          88% { transform: translate(-50%, 111px); }
          to { transform: translate(-50%, 115px); }
        }
      `}</style>

      {/* Marquee */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "8px 0 12px",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff4ecd", animation: "clawBlink 1.2s infinite" }} />
        <span
          style={{
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: 3,
            background: "linear-gradient(90deg,#ff4ecd,#ffd166,#4ef0ff)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          CLAW MACHINE
        </span>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ef0ff", animation: "clawBlink 1.2s infinite 0.6s" }} />
      </div>

      {/* Glass window */}
      <div
        style={{
          position: "relative",
          height: GLASS_H,
          borderRadius: 18,
          overflow: "hidden",
          background: "linear-gradient(180deg,#0d0724 0%,#1d1140 62%,#2a1a52 100%)",
          boxShadow: "inset 0 0 44px rgba(0,0,0,0.75)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 90% at 50% 0%, rgba(255,255,255,0.14), transparent)" }} />

        {/* Rail the claw slides along */}
        <div style={{ position: "absolute", top: CLAW_REST, left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.14)" }} />

        {/* Floor */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: FLOOR_PAD + 10, background: "linear-gradient(180deg,#3b2a6b,#221345)", borderTop: "2px solid rgba(255,255,255,0.12)" }} />

        {/* Capsules resting on the floor */}
        {capsules.map((color, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i + 0.5) * spacing}%`,
              bottom: FLOOR_PAD,
              transform: "translateX(-50%)",
              opacity: grabbed === i || falling === i ? 0 : 1,
            }}
          >
            <Capsule color={color} />
          </div>
        ))}

        {/* Capsule slipping out of the claw */}
        {falling !== null && (
          <div
            style={{
              position: "absolute",
              left: `${clawX}%`,
              top: CLAW_REST + CABLE_SLIP + CARRIED_TOP,
              transform: "translate(-50%, 0)",
              animation: "clawFall 0.5s ease-in forwards",
            }}
          >
            <Capsule color={capsules[falling]} />
          </div>
        )}

        {/* Claw rig */}
        <div
          ref={clawElRef}
          style={{ position: "absolute", top: CLAW_REST, left: `${clawX}%`, transform: "translateX(-50%)", width: CLAW_W }}
        >
          <div style={{ transform: `translateY(${clawY}px)`, transition: "transform 0.9s cubic-bezier(0.4,0,0.2,1)" }}>
            {/* Cable up to the rail */}
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: "50%",
                width: 3,
                height: CLAW_REST + clawY,
                transform: "translateX(-50%)",
                background: "linear-gradient(180deg,#64748b,#e2e8f0)",
                transition: "height 0.9s cubic-bezier(0.4,0,0.2,1)",
              }}
            />

            {/* Claw head */}
            <div
              style={{
                height: 10,
                borderRadius: 6,
                background: "linear-gradient(180deg,#f8fafc,#94a3b8)",
                border: "2px solid #475569",
                boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: -2 }}>
              <div
                style={{
                  width: 8,
                  height: 26,
                  borderRadius: 4,
                  background: "linear-gradient(180deg,#e2e8f0,#64748b)",
                  border: "2px solid #475569",
                  transformOrigin: "top center",
                  transform: `rotate(${grabbed !== null ? 8 : 22}deg)`,
                  transition: "transform 0.3s ease",
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 26,
                  borderRadius: 4,
                  background: "linear-gradient(180deg,#e2e8f0,#64748b)",
                  border: "2px solid #475569",
                  transformOrigin: "top center",
                  transform: `rotate(${grabbed !== null ? -8 : -22}deg)`,
                  transition: "transform 0.3s ease",
                }}
              />
            </div>

            {/* Capsule held by the claw */}
            {grabbed !== null && (
              <div style={{ position: "absolute", top: CARRIED_TOP, left: "50%", transform: "translateX(-50%)" }}>
                <Capsule color={capsules[grabbed]} />
              </div>
            )}
          </div>
        </div>

        {/* Status strip */}
        {message && (
          <div
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 12,
              padding: "8px 12px",
              borderRadius: 12,
              textAlign: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "#ffd76a",
              background: "rgba(9,4,26,0.85)",
              border: "1px solid rgba(255,215,106,0.4)",
            }}
          >
            {message}
          </div>
        )}
      </div>

      {/* Control panel */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 900, letterSpacing: 1.5, color: "rgba(255,255,255,0.5)" }}>
            5 TOKENS PER DROP
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: 800, color: "#ffffff" }}>
            Balance: {tokens} token{tokens === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={onDrop}
          disabled={disabled}
          style={{
            padding: "14px 30px",
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: 2,
            color: "#1a1030",
            background: "linear-gradient(180deg,#ffd76a,#f0a92b)",
            border: "3px solid #7c4a06",
            boxShadow: "0 6px 0 #7c4a06",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            transition: "transform 0.1s ease",
          }}
        >
          DROP
        </button>
      </div>
    </div>
  );
}