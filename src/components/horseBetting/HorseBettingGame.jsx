import { useCallback, useEffect, useRef, useState } from "react";
import { Info, Timer } from "lucide-react";
import { toast } from "sonner";
import HorseRaceTrack from "./HorseRaceTrack";
import HorseBetSlip from "./HorseBetSlip";
import HorseBetCard from "./HorseBetCard";
import PreRaceBetOverlay from "./PreRaceBetOverlay";
import NextRacePanel from "./NextRacePanel";
import { collectPayout, loadMyBet, loadTodayRace, markResult, placeBet } from "@/lib/horseBetApi";
import { unlockRaceAudio } from "@/lib/raceAudio";
import { placeOf } from "@/lib/derbyFinish";
import { syncDerbySeason } from "@/lib/derbySeason";
import { ensureNetworkTime, networkNow, syncNetworkTime } from "@/lib/networkTime";
import {
  formatBruneiDate,
  formatClock,
  isBettingOpen,
  msUntilNoon,
  todayKey,
} from "@/lib/horseRacing";

export default function HorseBettingGame({ user, onUserUpdate }) {
  const [race, setRace] = useState(null);
  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [stake, setStake] = useState(50);
  const [now, setNow] = useState(() => networkNow());
  const [running, setRunning] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  // The race day this player has watched through to the result — the moment it
  // lands, the betting area switches to the next race.
  const [doneDay, setDoneDay] = useState(null);
  const watchedDay = useRef(null);
  const loadedDay = useRef(null);
  const wasOpen = useRef(null);

  const chips = Number(user?.casinoChips) || 0;

  const load = useCallback(async () => {
    try {
      const r = await loadTodayRace();
      if (!r) {
        setError("Today's race could not be loaded. Try again in a moment.");
        return;
      }
      const b = await loadMyBet(r.race_date, user?.id);
      setRace(r);
      setBet(b);
      setError("");
      loadedDay.current = todayKey();
    } catch (e) {
      setError("Could not reach the race board. Check your connection and reload.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Verified time on entry: betting, the countdown and the noon reveal all run
  // off the network clock, never the device clock.
  useEffect(() => {
    syncNetworkTime();
  }, []);

  // Clock + Brunei day rollover: a new day reloads a fresh race and bet.
  useEffect(() => {
    const t = setInterval(() => {
      setNow(networkNow());
      ensureNetworkTime();
      if (loadedDay.current && loadedDay.current !== todayKey()) load();
    }, 1000);
    return () => clearInterval(t);
  }, [load]);

  const open = isBettingOpen(new Date(now));
  const winnerId = race?.winning_horse_id;

  // The moment the network clock passes noon, fetch the day's saved result —
  // or save it if this is the first player to arrive.
  useEffect(() => {
    const justClosed = wasOpen.current === true && !open;
    wasOpen.current = open;
    if (justClosed && race && !race.winning_horse_id) load();
  }, [open, race, load]);

  // The saved result is shown once betting has closed. The first watch of the day
  // opens with the bet reminder rather than running straight away; a replay after
  // that starts immediately.
  useEffect(() => {
    if (!race || open || !winnerId) return;
    if (watchedDay.current === race.race_date) return;
    watchedDay.current = race.race_date;
    setReminderOpen(true);
  }, [race, open, winnerId]);

  const startRace = () => {
    unlockRaceAudio();
    setReminderOpen(false);
    setRunning(true);
  };

  // Lazy result marking — only once the day's result is visible. 4th–6th lose
  // their stake; 2nd and 3rd stay open so their refund can be collected.
  useEffect(() => {
    if (!race || !bet || open) return;
    if (bet.status !== "confirmed") return;
    const place = placeOf(race.horses, race.winning_horse_id, bet.horse_id);
    markResult(bet, place).then((updated) => {
      if (updated && updated !== bet) setBet(updated);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race?.race_date, bet?.id, bet?.status, open]);

  // Season points: the lazy season heartbeat, re-run when betting closes.
  useEffect(() => {
    if (!user?.id) return;
    syncDerbySeason(user).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, race?.race_date, open]);

  const handlePlace = async () => {
    if (!race || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await placeBet({ user, race, horseId: selected, stake });
      setBet(res.bet);
      await onUserUpdate?.();
      if (res.duplicate) toast.info("You already have a bet today.");
      else toast.success("Bet placed — good luck! 🐎");
    } catch (e) {
      setError(e?.message || "Your bet could not be placed.");
    } finally {
      setBusy(false);
    }
  };

  const handleCollect = async () => {
    if (!bet || busy) return;
    setBusy(true);
    setError("");
    try {
      const paid = await collectPayout({
        user,
        bet,
        horses: race.horses,
        winnerId: race.winning_horse_id,
      });
      setBet(paid);
      await onUserUpdate?.();
      toast.success(`${Number(paid.reward_amount) || 0} chips collected!`);
    } catch (e) {
      setError(e?.message || "Collection was interrupted.");
      const fresh = await loadMyBet(race.race_date, user?.id).catch(() => null);
      if (fresh) setBet(fresh);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!race) {
    return (
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-border bg-white p-4 text-center text-sm text-muted-foreground">
        {error || "No race available today."}
      </div>
    );
  }

  const winner = (race.horses || []).find((h) => h.id === winnerId);

  // Watched through to the official result: the betting area becomes the next race.
  const done = doneDay === race.race_date;
  // Today's bet still needs its payout collected (or an admin is checking it).
  const todayNeedsAction =
    Boolean(bet) && ["confirmed", "claim_pending", "refund_pending", "review_required"].includes(bet.status);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-400/40 p-3.5"
        style={{ background: "linear-gradient(150deg,#0f3b28 0%,#0a2a1d 60%,#072018 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 0 2px rgba(212,175,55,0.18)" }}
        />
        <div className="relative flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300/80">
              Daily Race · Brunei
            </p>
            <h2 className="mt-0.5 text-lg font-black leading-tight text-amber-50">🐎 Horse Betting</h2>
            <p className="text-[11px] font-semibold text-amber-200/60">
              {formatBruneiDate(race.race_date)} · one race, one result for everyone
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
              open
                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                : "border-amber-400/50 bg-amber-400/10 text-amber-200"
            }`}
          >
            {open ? "Betting open" : "Race done"}
          </span>
        </div>

        <div className="relative mt-3 flex items-center gap-2 rounded-xl bg-emerald-950/50 px-2.5 py-1.5">
          <Timer className="h-3.5 w-3.5 text-amber-300" />
          {open ? (
            <span className="text-[11px] font-bold text-amber-100">
              Closes in <span className="text-amber-300 tabular-nums">{formatClock(msUntilNoon(new Date(now)))}</span>{" "}
              · race at 12:00
            </span>
          ) : (
            <span className="text-[11px] font-bold text-amber-100">
              Winner: <span className="text-amber-300">{winner?.name}</span>
            </span>
          )}
        </div>
      </div>

      {!open && (
        <>
          <HorseRaceTrack
            horses={race.horses || []}
            winnerId={winnerId}
            running={running}
            bet={bet}
            preRace={
              reminderOpen ? (
                <PreRaceBetOverlay bet={bet} horses={race.horses || []} onStart={startRace} />
              ) : null
            }
            raceDate={race.race_date}
            onFinish={() => {
              setRunning(false);
              setDoneDay(race.race_date);
            }}
            onReplay={() => {
              unlockRaceAudio();
              setRunning(true);
            }}
          />
        </>
      )}

      {done
        ? todayNeedsAction && (
            <HorseBetCard
              bet={bet}
              horses={race.horses || []}
              winnerId={winnerId}
              resultVisible={!open}
              busy={busy}
              onCollect={handleCollect}
            />
          )
        : bet
          ? (
            <HorseBetCard
              bet={bet}
              horses={race.horses || []}
              winnerId={winnerId}
              resultVisible={!open}
              busy={busy}
              onCollect={handleCollect}
            />
          )
          : (
            <HorseBetSlip
              horses={race.horses || []}
              selected={selected}
              onSelect={setSelected}
              stake={stake}
              onStake={setStake}
              balance={chips}
              busy={busy}
              locked={!open}
              error={error}
              onConfirm={handlePlace}
            />
          )}

      <NextRacePanel user={user} now={now} balance={chips} onUserUpdate={onUserUpdate} />

      {bet && error && (
        <p className="rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] font-semibold text-rose-700">{error}</p>
      )}

      <p className="flex items-start gap-1.5 rounded-xl border border-border bg-muted/40 px-2.5 py-2 text-[10px] leading-snug text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Best-effort game: the daily result is generated once and saved, but it is not secret before the
        race and settlement is not guaranteed to be exactly-once. Admin tools can review any interruption.
      </p>
    </div>
  );
}