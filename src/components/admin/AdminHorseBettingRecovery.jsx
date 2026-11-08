import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { adminResolveBet } from "@/lib/horseBetApi";
import { bruneiMinutes, CLOSE_MINUTES, grossPayout, todayKey } from "@/lib/horseRacing";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

const ACTIONS = {
  pay_payout: "Credit payout",
  mark_paid: "Mark paid (already credited)",
  mark_confirmed: "Confirm stake was taken",
  refund_stake: "Refund stake",
  mark_refunded: "Mark refunded (already credited)",
  resolve_none: "Close — no chips move",
};

/** Buttons offered for each bet status. */
function actionsFor(bet, winnerId, due) {
  const isWinner = bet.horse_id === winnerId;
  switch (bet.status) {
    case "pending":
      return ["mark_confirmed", "refund_stake", "resolve_none"];
    case "review_required":
      return ["mark_confirmed", "refund_stake", "resolve_none"];
    case "claim_pending":
      return ["pay_payout", "mark_paid"];
    case "refund_pending":
      return ["refund_stake", "mark_refunded"];
    case "confirmed":
      return due && isWinner ? ["pay_payout", "mark_paid"] : ["refund_stake", "resolve_none"];
    default:
      return [];
  }
}

export default function AdminHorseBettingRecovery() {
  const [adminUser, setAdminUser] = useState(null);
  const [races, setRaces] = useState([]);
  const [date, setDate] = useState(null);
  const [bets, setBets] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null); // { bet, action }
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadRaces = useCallback(async () => {
    const page = await base44.entities.HorseRace.list({ sort: "-race_date", limit: 7 });
    const items = page.items || [];
    setRaces(items);
    setDate((d) => d || items[0]?.race_date || null);
  }, []);

  const loadDay = useCallback(async () => {
    if (!date) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [betPage, userList, logPage] = await Promise.all([
      base44.entities.HorseBet.filter({ race_date: date }, { sort: "created_date", limit: 200 }),
      base44.entities.User.list(),
      base44.entities.CasinoChipLog.list({ sort: "-timestamp", limit: 300 }),
    ]);
    setBets(betPage.items || []);
    setUsers(userList || []);
    setLogs(logPage.items || []);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    base44.auth.me().then(setAdminUser).catch(() => {});
    loadRaces().catch(() => setLoading(false));
  }, [loadRaces]);

  useEffect(() => {
    loadDay().catch(() => setLoading(false));
  }, [loadDay]);

  const race = races.find((r) => r.race_date === date) || null;
  const winnerId = race?.winning_horse_id;
  const due = isPastNoon(date);

  const balanceOf = (userId) =>
    Number(users.find((u) => u.id === userId)?.casinoChips) || 0;

  const logsFor = (userId) =>
    logs
      .filter(
        (l) =>
          l.user_id === userId &&
          new Date(l.timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" }) === date
      )
      .slice(0, 3);

  // Deduction logs with no bet row — a stake that may have left a wallet alone.
  const orphans = logs.filter(
    (l) =>
      (l.detail || "").startsWith("Horse Racing bet") &&
      new Date(l.timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Brunei" }) === date &&
      !bets.some((b) => b.user_id === l.user_id)
  );

  const flagged = bets.filter((b) =>
    ["pending", "review_required", "claim_pending", "refund_pending"].includes(b.status)
  );
  const unpaidWinners = bets.filter(
    (b) => due && b.horse_id === winnerId && b.status !== "paid" && b.status !== "refunded"
  );

  const run = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await adminResolveBet({
        adminUser,
        bet: pending.bet,
        action: pending.action,
        currentBalance: balanceOf(pending.bet.user_id),
        reason: reason.trim(),
      });
      toast.success(`${ACTIONS[pending.action]} saved.`);
      setPending(null);
      setReason("");
      await loadDay();
    } catch (e) {
      toast.error("That resolution did not save. Nothing else was changed.");
    } finally {
      setBusy(false);
    }
  };

  const amountFor = (p) => {
    if (!p) return 0;
    if (p.action === "pay_payout") return Number(p.bet.gross_payout) || grossPayout(p.bet.stake);
    if (p.action === "refund_stake") return Number(p.bet.stake) || 0;
    return 0;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-white p-4" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">🐎 Horse Betting Recovery</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Review the day&apos;s race, every bet, and any interrupted wallet movement. Nothing is paid
              automatically here.
            </p>
          </div>
          <button
            onClick={() => loadDay()}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {races.map((r) => (
            <button
              key={r.id}
              onClick={() => setDate(r.race_date)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                date === r.race_date
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r.race_date}
            </button>
          ))}
          {races.length === 0 && <span className="text-xs text-slate-500">No races recorded yet.</span>}
        </div>

        {race && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Saved winner</p>
              <p className="text-sm font-bold text-slate-900">
                {(race.horses || []).find((h) => h.id === winnerId)?.name || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</p>
              <p className={`text-sm font-bold ${due ? "text-emerald-700" : "text-amber-700"}`}>
                {race.status === "cancelled" ? "Cancelled" : due ? "Race aired" : "Betting open"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Summary label="Flagged" value={flagged.length} tone="text-rose-600" />
        <Summary label="Winners unpaid" value={unpaidWinners.length} tone="text-amber-600" />
        <Summary label="Orphan debits" value={orphans.length} tone="text-rose-600" />
      </div>

      {orphans.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5" /> Chip deductions with no bet
          </p>
          <div className="mt-2 space-y-1.5">
            {orphans.map((l) => (
              <p key={l.id} className="text-[11px] font-semibold text-rose-800">
                {l.user_name || l.user_id} · {l.amount} chips · {l.detail} · balance {l.balance_after}
              </p>
            ))}
          </div>
          <p className="mt-2 text-[10px] font-semibold text-rose-700/80">
            A bet row may have failed to save. Refund manually from the player&apos;s chip log if the stake
            really left their wallet.
          </p>
        </div>
      )}

      {/* Bets */}
      <div className="space-y-2">
        <p className="px-1 text-[11px] font-black uppercase tracking-widest text-slate-500">
          Bets for {date || "—"} ({bets.length})
        </p>

        {loading && <div className="h-24 animate-pulse rounded-2xl bg-muted" />}

        {!loading && bets.length === 0 && (
          <div className="rounded-2xl border border-border bg-white p-4 text-sm text-slate-500">
            No bets recorded for this date.
          </div>
        )}

        {bets.map((bet) => {
          const horse = (race?.horses || []).find((h) => h.id === bet.horse_id);
          const actions = actionsFor(bet, winnerId, due);
          const betLogs = logsFor(bet.user_id);
          return (
            <div key={bet.id} className="rounded-2xl border border-border bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{bet.user_name || bet.user_id}</p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    #{horse?.number || bet.horse_number} {horse?.name || bet.horse_name} · staked {bet.stake} ·
                    pays {bet.gross_payout || grossPayout(bet.stake)}
                  </p>
                </div>
                <StatusPill status={bet.status} winner={due && bet.horse_id === winnerId} />
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                <Cell label="Before" value={bet.balance_before ?? "—"} />
                <Cell label="After" value={bet.balance_after ?? "—"} />
                <Cell label="Now" value={balanceOf(bet.user_id)} />
              </div>

              {betLogs.length > 0 && (
                <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5">
                  {betLogs.map((l) => (
                    <p key={l.id} className="text-[10px] font-semibold text-slate-600">
                      {l.detail || l.action_type} · {l.amount > 0 ? `+${l.amount}` : l.amount} · bal{" "}
                      {l.balance_after}
                    </p>
                  ))}
                </div>
              )}

              {bet.note && (
                <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] font-semibold text-amber-800">
                  {bet.note}
                </p>
              )}

              {actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {actions.map((a) => (
                    <button
                      key={a}
                      onClick={() => {
                        setReason("");
                        setPending({ bet, action: a });
                      }}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                        a === "pay_payout" || a === "refund_stake"
                          ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "border-border bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {ACTIONS[a]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending ? ACTIONS[pending.action] : ""} — {pending?.bet.user_name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {amountFor(pending) > 0 ? (
                <>
                  This moves <strong>{amountFor(pending)} chips</strong> into the player&apos;s wallet now.
                  Only continue if you have checked their balance and chip log — otherwise use the
                  &ldquo;already credited&rdquo; option instead.
                </>
              ) : (
                "This only changes the recorded status. No chips are added or removed."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (saved on the bet)"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={run}
              disabled={busy}
              style={{ background: "#d4af37", color: "#052e22" }}
            >
              {busy ? "Saving…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function isPastNoon(dateKey) {
  const today = todayKey();
  if (dateKey && dateKey < today) return true;
  return bruneiMinutes() >= CLOSE_MINUTES;
}

function Summary({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-border bg-white px-2 py-2 text-center">
      <p className={`text-lg font-black tabular-nums ${tone}`}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}

function Cell({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-slate-50 px-1 py-1">
      <p className="flex items-center justify-center gap-0.5 text-[11px] font-black tabular-nums text-slate-800">
        <MiniChipIcon size={10} /> {value}
      </p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

function StatusPill({ status, winner }) {
  const map = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    lost: "bg-slate-50 text-slate-600 border-slate-200",
    claim_pending: "bg-amber-50 text-amber-700 border-amber-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    refund_pending: "bg-amber-50 text-amber-700 border-amber-200",
    refunded: "bg-slate-50 text-slate-600 border-slate-200",
    review_required: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const Icon = status === "paid" ? CheckCircle2 : status === "review_required" ? ShieldQuestion : null;
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
        map[status] || map.confirmed
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {status.replace(/_/g, " ")}
      {winner && status === "confirmed" ? " · winner" : ""}
    </span>
  );
}