import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { logChipMovement } from "@/lib/chipLog";
import { logScratchTicket, updateScratchTicket } from "@/lib/scratchLog";
import { audioReady, playP10Jackpot, playTicketFlourish, playWin, playWinFanfare } from "@/lib/sounds";
import ScratchCardTicket from "./ScratchCardTicket";
import ScratchCardLiveFeed from "./ScratchCardLiveFeed";
import ScratchResultModal from "./ScratchResultModal";
import { ENTRY_COST, TOKEN_IMG, buildGrid, prizeTier, rollScratchOutcome } from "./scratchPrizes";

/** Human-readable prize label for the admin history. */
function prizeLabel(prize) {
  if (prize.type === "chips") return `+${prize.amount} Chips`;
  if (prize.type === "tokens") return `+${prize.amount} Tokens`;
  if (prize.type === "diamond") return "+1 VIP Diamond";
  return `${prize.themeName} Theme`;
}

// Win sound scaled to the prize size. Skipped when the device cannot play audio
// right now (muted output, backgrounded tab, no Web Audio support) — the result
// card still appears either way.
function playWinSound(tier) {
  if (!audioReady()) return;
  if (tier === "big") playP10Jackpot();
  else if (tier === "medium") playWinFanfare();
  else if (tier === "small") playWin();
}

export default function ScratchCardGame({ user, onUserUpdate }) {
  const [phase, setPhase] = useState("idle"); // idle | playing | revealing | result
  const [cells, setCells] = useState(null);
  const [prize, setPrize] = useState(null);
  const [granted, setGranted] = useState(null);
  const [scratched, setScratched] = useState(0);
  const [ticketKey, setTicketKey] = useState(0);
  const [busy, setBusy] = useState(false);
  // True while a settled ticket's balances and logs are still being written.
  const [settling, setSettling] = useState(false);
  const logIdRef = useRef(null);
  const settledRef = useRef(false);

  const tokens = user?.earlyAccessTokens ?? 0;
  const canAfford = tokens >= ENTRY_COST;
  const displayName = user?.full_name || user?.email?.split("@")[0] || "Player";

  /** What the ticket actually pays, decided against the freshly-read user record. */
  const resolveGrant = (won, fresh) => {
    if (!won) return null;
    if (won.type === "theme") {
      const owned = Array.isArray(fresh?.unlockedThemes) ? fresh.unlockedThemes : [];
      // A theme the player already owns pays 1 diamond instead.
      if (owned.includes(won.themeId)) {
        return { type: "diamond", amount: 1, duplicateTheme: true, themeName: won.themeName };
      }
      return { type: "theme", themeId: won.themeId, themeName: won.themeName };
    }
    return { type: won.type, amount: won.amount };
  };

  /** Writes every balance and log entry a settled prize needs. */
  const persistGrant = async (result, fresh) => {
    if (!result) return;

    if (result.type === "chips") {
      const chips = Number(fresh?.casinoChips) || 0;
      await base44.auth.updateMe({ casinoChips: chips + result.amount });
      await logChipMovement({
        user,
        action_type: "win",
        amount: result.amount,
        balance_after: chips + result.amount,
        detail: `Premium Scratch Card prize — ${result.amount} chips`,
      });
      return;
    }

    if (result.type === "tokens") {
      const balance = Number(fresh?.earlyAccessTokens) || 0;
      await base44.auth.updateMe({ earlyAccessTokens: balance + result.amount });
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: displayName,
        amount: result.amount,
        source: "Premium Scratch Card Prize",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (result.type === "diamond") {
      const diamonds = Number(fresh?.diamonds) || 0;
      await base44.auth.updateMe({ diamonds: diamonds + result.amount });
      return;
    }

    const owned = Array.isArray(fresh?.unlockedThemes) ? fresh.unlockedThemes : [];
    await base44.auth.updateMe({ unlockedThemes: [...new Set([...owned, result.themeId])] });
  };

  const buyTicket = async () => {
    if (busy || phase !== "idle") return;
    setBusy(true);

    const fresh = await base44.auth.me();
    const balance = Number(fresh?.earlyAccessTokens) || 0;
    if (balance < ENTRY_COST) {
      toast.error(`You need ${ENTRY_COST} tokens to buy a ticket.`);
      setBusy(false);
      return;
    }

    await base44.auth.updateMe({ earlyAccessTokens: balance - ENTRY_COST });

    // The ticket is dealt the moment the tokens are taken; the transaction and
    // ticket records are written while the player is scratching.
    const roll = rollScratchOutcome();
    settledRef.current = false;
    setPrize(roll.prize);
    setGranted(null);
    setScratched(0);
    setCells(buildGrid(roll.prize?.symbol || null));
    setTicketKey((k) => k + 1);
    setPhase("playing");
    if (audioReady()) playTicketFlourish();
    setBusy(false);

    await Promise.all([
      base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: displayName,
        amount: -ENTRY_COST,
        source: "Premium Scratch Card Ticket",
        timestamp: new Date().toISOString(),
      }),
      logScratchTicket({
        user,
        cost: ENTRY_COST,
        outcome: roll.prize ? "win" : "loss",
        prize_type: roll.prize ? roll.prize.type : "none",
        prize_amount: roll.prize?.amount ?? 0,
        prize_label: roll.prize ? prizeLabel(roll.prize) : "No match",
      }).then((id) => {
        logIdRef.current = id;
      }),
      onUserUpdate?.(),
    ]);
  };

  // All nine squares are scratched — hand over to the foil fade and the reveal.
  const handleScratched = () => setPhase("revealing");

  // The final square has landed: settle this ticket exactly once and show the
  // single result card right away — the balances, logs and ticket record are
  // written behind the card instead of holding it back.
  const handleRevealComplete = async () => {
    if (settledRef.current) return;
    settledRef.current = true;
    const won = prize;

    const fresh = await base44.auth.me();
    const result = resolveGrant(won, fresh);
    setGranted(result);
    playWinSound(prizeTier(result));
    setPhase("result");

    setSettling(true);
    await persistGrant(result, fresh);
    await updateScratchTicket(logIdRef.current, {
      collected: true,
      outcome: result ? "win" : "loss",
      prize_type: result ? result.type : "none",
      prize_amount: result?.amount ?? 0,
      prize_label: result ? prizeLabel(result) : "No match",
    });
    await onUserUpdate?.();
    setSettling(false);
  };

  const reset = () => {
    settledRef.current = false;
    setGranted(null);
    setPrize(null);
    setCells(null);
    setScratched(0);
    setPhase("idle");
  };

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(170deg,#2a1a57 0%,#160c2e 100%)",
          border: "4px solid #0b0620",
          boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
        }}
      >
        {/* Ticket header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: "linear-gradient(180deg,#f0a92b,#c68d22)", borderBottom: "4px solid #0b0620" }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: 3, color: "#3a2405" }}>
              PREMIUM SCRATCH
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 800, color: "rgba(58,36,5,0.7)" }}>
              MATCH 3 SYMBOLS TO WIN
            </p>
          </div>
          <div className="flex items-center gap-2">
            <img src={TOKEN_IMG} alt="token" style={{ width: 24, height: 24, objectFit: "contain" }} />
            <span style={{ fontSize: 16, fontWeight: 900, color: "#3a2405" }}>{tokens}</span>
          </div>
        </div>

        {/* Ticket body */}
        <div className="p-4">
          {cells ? (
            <>
              <style>{`
                @keyframes scratchTicketDeal {
                  0% { opacity: 0; transform: translateY(34px); filter: brightness(1.55); }
                  55% { opacity: 1; transform: translateY(-6px); filter: brightness(1.18); }
                  100% { opacity: 1; transform: translateY(0); filter: brightness(1); }
                }
              `}</style>
              <div
                key={ticketKey}
                className="rounded-2xl p-1"
                style={{
                  background: "linear-gradient(160deg,#fff6cf,#e8bf55)",
                  border: "2px solid #a9761c",
                  animation: "scratchTicketDeal 0.62s cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                <ScratchCardTicket
                  cells={cells}
                  active={phase === "playing"}
                  ticketKey={ticketKey}
                  onScratched={handleScratched}
                  onRevealComplete={handleRevealComplete}
                  onProgress={setScratched}
                />
              </div>
              <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 12, fontWeight: 800, color: "#ffd76a" }}>
                {phase === "playing"
                  ? `Scratch every square — ${scratched} of 9 revealed`
                  : phase === "revealing"
                  ? "Revealing your symbols…"
                  : "Ticket revealed"}
              </p>
            </>
          ) : (
            <div
              className="flex flex-col items-center justify-center rounded-2xl"
              style={{ padding: "38px 20px", background: "rgba(255,255,255,0.05)", border: "2px dashed rgba(255,215,106,0.4)" }}
            >
              <span style={{ fontSize: 44, lineHeight: 1 }}>🎫</span>
              <p style={{ margin: "14px 0 0", fontSize: 14, fontWeight: 800, color: "#ffffff", textAlign: "center" }}>
                {ENTRY_COST} tokens per ticket
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
                Three matching symbols win the prize — chips, tokens, a VIP diamond or an exclusive theme.
              </p>
            </div>
          )}

          {(phase === "idle" || phase === "result") && (
            <button
              onClick={buyTicket}
              disabled={!canAfford || busy || settling}
              style={{
                marginTop: 14,
                width: "100%",
                padding: "15px 0",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 900,
                letterSpacing: 2,
                color: "#1a1030",
                background: "linear-gradient(180deg,#ffd76a,#f0a92b)",
                border: "3px solid #7c4a06",
                boxShadow: "0 6px 0 #7c4a06",
                cursor: !canAfford || busy || settling ? "not-allowed" : "pointer",
                opacity: !canAfford || busy || settling ? 0.5 : 1,
              }}
            >
              {phase === "result" ? "NEW TICKET" : "BUY TICKET"}
            </button>
          )}

          {!canAfford && phase === "idle" && (
            <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 12, fontWeight: 800, color: "#fda4af" }}>
              You need {ENTRY_COST} tokens to buy a ticket.
            </p>
          )}
        </div>
      </div>

      <ScratchCardLiveFeed />

      {phase === "result" && (
        <ScratchResultModal granted={granted} tier={prizeTier(granted)} onClose={reset} />
      )}
    </>
  );
}