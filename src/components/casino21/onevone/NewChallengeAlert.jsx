import { useEffect, useLayoutEffect, useRef, useState } from "react";

// In-tab pop-out: appears the moment another player posts a challenge while any
// other Blackjack 21 sub-tab is open. Pinned just below the app header and its
// divider so it is never clipped, and it auto-dismisses two seconds after
// arriving (View / ✕ close it sooner).
const STYLES = `
.nca-toast {
  box-sizing: border-box;
  position: fixed;
  left: 50%;
  z-index: 60;
  width: min(420px, calc(100vw - 2rem));
  transform: translate(-50%, 0);
  padding: 18px 17px 15px;
  border: 1px solid #d8c49b;
  border-radius: 18px;
  background: linear-gradient(145deg, #fffdf7, #f7f0e2);
  color: #29271f;
  box-shadow: 0 22px 60px rgba(48,39,21,.18), 0 4px 14px rgba(48,39,21,.08), inset 0 1px #fff;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  animation: nca-arrive .3s cubic-bezier(.2,.8,.2,1) both, nca-fadeout .25s ease-in 1.75s forwards;
}
.nca-row { display: flex; align-items: center; gap: 12px; }
.nca-pulse {
  position: relative;
  width: 9px;
  height: 9px;
  flex: none;
  border-radius: 50%;
  background: #b18a42;
  box-shadow: 0 0 0 4px rgba(177,138,66,.13);
}
.nca-copy { flex: 1; min-width: 0; }
.nca-eyebrow {
  margin: 0 0 4px;
  color: #96763b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .19em;
  text-transform: uppercase;
  line-height: 1.2;
}
.nca-detail {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: #302e27;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.4;
  white-space: nowrap;
  min-width: 0;
}
.nca-name { overflow: hidden; text-overflow: ellipsis; }
.nca-chip { width: 15px; height: 15px; flex: none; color: #ad853d; }
.nca-wager { color: #987438; font-variant-numeric: tabular-nums; }
.nca-chips {
  color: #817965;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: .13em;
  text-transform: uppercase;
}
.nca-view {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border: 1px solid #aa843f;
  border-radius: 999px;
  background: linear-gradient(180deg, #d8bd7d, #c6a45b);
  color: #29251b;
  font: 800 10px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
  letter-spacing: .12em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(95,70,23,.14);
  transition: background .18s, box-shadow .18s, transform .18s;
}
.nca-view svg { width: 13px; height: 13px; }
.nca-dismiss {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: #817965;
  cursor: pointer;
  transition: background .18s, color .18s, transform .18s;
}
.nca-dismiss svg { width: 15px; height: 15px; }
.nca-view:hover { background: #e2ca91; box-shadow: 0 4px 9px rgba(95,70,23,.19); }
.nca-view:active, .nca-dismiss:active { transform: scale(.94); }
.nca-dismiss:hover { background: #eee5d2; color: #403a2d; }
.nca-view:focus-visible, .nca-dismiss:focus-visible { outline: 2px solid #987438; outline-offset: 3px; }
.nca-timer { height: 2px; margin-top: 15px; overflow: hidden; border-radius: 3px; background: #e9dfcb; }
.nca-timer::after {
  content: "";
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left;
  background: linear-gradient(90deg, #c4a15a, #e0cc9d);
  animation: nca-drain 2s linear forwards;
}
@keyframes nca-arrive { from { opacity: 0; translate: 0 8px; } to { opacity: 1; translate: 0 0; } }
@keyframes nca-fadeout { to { opacity: 0; } }
@keyframes nca-drain { to { transform: scaleX(0); } }
`;

export default function NewChallengeAlert({ challenge, onDismiss }) {
  const name = challenge?.creator_name || "A player";
  const wager = Number(challenge?.wager) || 0;
  const isDiamond = challenge?.stake_type === "diamond";

  // Sit directly under the header and its divider, whatever height the active
  // theme gives them, so the alert is never clipped by the top edge.
  const [top, setTop] = useState(68);
  useLayoutEffect(() => {
    const header = document.querySelector("header");
    const bottom = header?.getBoundingClientRect().bottom;
    if (bottom) setTop(Math.round(bottom) + 10);
  }, []);

  // Auto-dismiss two seconds after the toast arrives.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current?.(), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="nca-toast" style={{ top }} role="status">
      <style>{STYLES}</style>

      <div className="nca-row">
        <span className="nca-pulse" />

        <div className="nca-copy">
          <p className="nca-eyebrow">New challenge</p>
          <p className="nca-detail">
            <span className="nca-name">{name} wagered</span>
            {isDiamond ? (
              <span className="nca-chip" aria-hidden="true">
                💎
              </span>
            ) : (
              <svg className="nca-chip" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="3.8" stroke="currentColor" strokeWidth="1" />
                <path
                  d="M8 1.8v2M14.2 8h-2M8 14.2v-2M1.8 8h2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            )}
            <span className="nca-wager">{wager}</span>
            <span className="nca-chips">{isDiamond ? "diamond" : "chips"}</span>
          </p>
        </div>

        <button type="button" className="nca-view" onClick={onDismiss}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M5.1 2.1 2.4 4.8l3.4 3.4 2-2-2.7-4.1ZM10.9 13.9l2.7-2.7-3.4-3.4-2 2 2.7 4.1ZM3 13l10-10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          View
        </button>

        <button
          type="button"
          className="nca-dismiss"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="m4 4 8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="nca-timer" />
    </div>
  );
}