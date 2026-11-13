import { useEffect, useMemo, useState } from "react";
import { Lock, Sparkles, Timer } from "lucide-react";
import { toast } from "sonner";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";
import HorseBetSlip from "./HorseBetSlip";
import RacerSprite from "./RacerSprite";
import { loadMyBet, placeBet } from "@/lib/horseBetApi";
import {
  formatBruneiDate,
  formatClock,
  grossPayout,
  horseById,
  isNextBettingOpen,
  msUntilNextBetOpen,
  nextRaceKey,
  seededOdds,
} from "@/lib/horseRacing";

/**
 * The next race board, always shown under today's race. Locked with a countdown
 * until 18:00 Brunei (verified network clock), then it becomes the normal bet
 * slip for the next race date.
 */
export default function NextRacePanel({ user, now, balance, onUserUpdate }) {
  const nextDate = nextRaceKey(new Date(now));
  const horses = useMemo(() => seededOdds(nextDate), [nextDate]);

  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [stake, setStake] = useState(50);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setBet(null);
    loadMyBet(nextDate, user?.id)
      .then((found) => {
        if (alive) setBet(found);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [nextDate, user?.id]);

  const open = isNextBettingOpen(new Date(now));

  const handlePlace = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await placeBet({
        user,
        race: { id: "", race_date: nextDate, horses },
        horseId: selected,
        stake,
      });
      setBet(res.bet);
      await onUserUpdate?.();
      if (res.duplicate) toast.info("You already have a bet on the next race.");
      else toast.success("Next race bet locked in — good luck! 🐎");
    } catch (e) {
      setError(e?.message || "Your bet could not be placed.");
    } finally {
      setBusy(false);
    }
  };

  const placedHorse = bet ? horseById(horses, bet.horse_id) : null;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center justify-between rounded-2xl border border-amber-400/40 px-3.5 py-2.5"
        style={{ background: "linear-gradient(150deg,#0f3b28 0%,#0a2a1d 60%,#072018 100%)" }}
      >
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300/80">Next race</p>
          <p className="truncate text-sm font-black leading-tight text-amber-50">{formatBruneiDate(nextDate)}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
            open
              ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
              : "border-amber-400/50 bg-amber-400/10 text-amber-200"
          }`}
        >
          {open ? "Betting open" : "Opens 6:00 PM"}
        </span>
      </div>

      {loading ? (
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      ) : bet ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
            Your next race bet
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <span
              className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-amber-300/60"
              style={{ background: "linear-gradient(160deg,#eef7f1 0%,#dbeade 100%)" }}
            >
              <RacerSprite horseId={placedHorse?.id} size={40} frame={0} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-foreground">
                <span style={{ color: placedHorse?.color }}>#{placedHorse?.number}</span> {placedHorse?.name}
              </p>
              <p className="flex items-center gap-1 text-[11px] font-bold tabular-nums text-amber-700">
                <MiniChipIcon size={12} /> {bet.stake} chips · 1st pays{" "}
                {Number(bet.gross_payout) || grossPayout(bet.stake)}
              </p>
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-[10px] font-bold text-amber-800">
            <Sparkles className="h-3 w-3 shrink-0" /> Locked in for {formatBruneiDate(nextDate)}
          </p>
        </div>
      ) : open ? (
        <HorseBetSlip
          horses={horses}
          selected={selected}
          onSelect={setSelected}
          stake={stake}
          onStake={setStake}
          balance={balance}
          busy={busy}
          locked={false}
          error={error}
          onConfirm={handlePlace}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-white/95 p-4 text-center">
          <Lock className="mx-auto h-5 w-5 text-amber-500" />
          <p className="mt-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Betting opens at 6:00 PM
          </p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-2xl font-black tabular-nums text-foreground">
            <Timer className="h-4 w-4 text-amber-500" />
            {formatClock(msUntilNextBetOpen(new Date(now)))}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            until {formatBruneiDate(nextDate)}&apos;s race opens for bets — Brunei time.
          </p>
        </div>
      )}
    </div>
  );
}