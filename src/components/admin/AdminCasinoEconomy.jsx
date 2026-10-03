import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { logChipMovement } from "@/lib/chipLog";
import { Loader2, Search, RefreshCw, X, Coins } from "lucide-react";
import { toast } from "sonner";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";

const ACTION_LABELS = {
  bet: "Bet",
  win: "Win",
  push: "Push",
  loss: "Loss",
  cashier_buy: "Cashier Buy",
  cashier_cashout: "Cash Out",
  admin_add: "Admin Add",
  admin_deduct: "Admin Deduct",
  admin_set: "Admin Set",
};

// Tailwind literal classes (purge-safe) keyed by action type.
const ACTION_BADGE = {
  bet: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  loss: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  cashier_cashout: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  admin_deduct: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  win: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  push: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  cashier_buy: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  admin_add: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  admin_set: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
};

function formatTimestamp(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "Asia/Brunei",
  });
}

export default function AdminCasinoEconomy() {
  const queryClient = useQueryClient();
  const [view, setView] = useState("balances");

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const me = await base44.auth.me();
      const rows = await base44.entities.User.list();
      return { admin: me, users: rows || [] };
    },
  });

  const admin = users?.admin || null;
  const userList = users?.users || [];

  return (
    <div className="flex flex-col gap-4">
      {/* View toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-2xl border border-border">
        <button
          onClick={() => setView("balances")}
          className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition ${view === "balances" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          🪙 Balances
        </button>
        <button
          onClick={() => setView("logs")}
          className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition ${view === "logs" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          📜 Chip Logs
        </button>
      </div>

      {view === "balances" ? (
        <BalancesView users={userList} loading={usersLoading} admin={admin} />
      ) : (
        <LogsView users={userList} />
      )}
    </div>
  );
}

function BalancesView({ users, loading, admin }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  const sorted = [...users]
    .filter((u) => {
      const name = u.full_name || u.email || "";
      return !search.trim() || name.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => (Number(b.casinoChips) || 0) - (Number(a.casinoChips) || 0));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["adminUsers"] });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={refresh}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border border-border rounded-xl bg-card text-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {sorted.length} user{sorted.length !== 1 ? "s" : ""}
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            {search ? "No users match your search." : "No users found."}
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[65vh] overflow-y-auto">
            {sorted.map((u) => (
              <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {u.full_name || u.email?.split("@")[0] || "Player"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email || "—"}</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <MiniChipIcon size={13} />
                  <span className="text-amber-700 dark:text-amber-300 font-black text-sm tabular-nums">
                    {Number(u.casinoChips) || 0}
                  </span>
                </div>
                <button
                  onClick={() => setEditing(u)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EditChipsModal
          user={editing}
          admin={admin}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
          }}
        />
      )}
    </div>
  );
}

function EditChipsModal({ user, admin, onClose, onSaved }) {
  const [mode, setMode] = useState("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const current = Number(user.casinoChips) || 0;
  const amt = Math.max(0, Math.floor(Number(amount) || 0));

  let newBalance = current;
  let netChange = 0;
  let actionType = "admin_set";
  if (mode === "add") {
    newBalance = current + amt;
    netChange = amt;
    actionType = "admin_add";
  } else if (mode === "deduct") {
    newBalance = Math.max(0, current - amt);
    netChange = newBalance - current; // negative (or 0 if clamped)
    actionType = "admin_deduct";
  } else {
    newBalance = amt;
    netChange = amt - current;
    actionType = "admin_set";
  }

  const canSubmit = mode === "set" ? amt >= 0 && amount !== "" : amt > 0;

  const handleConfirm = async () => {
    if (busy || !canSubmit) return;
    setBusy(true);
    try {
      await base44.entities.User.update(user.id, { casinoChips: newBalance });
      await logChipMovement({
        user,
        action_type: actionType,
        amount: netChange,
        balance_after: newBalance,
        detail: `Admin ${mode} ${amt} chips${note ? ` — ${note}` : ""}`,
        adminUser: admin,
      });
      toast.success(`${user.full_name || user.email}'s chips set to ${newBalance}.`);
      onSaved();
    } catch (e) {
      toast.error("Update failed: " + (e?.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="font-bold text-foreground text-base">Edit Chip Balance</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 pb-2">
          <p className="text-sm font-semibold text-foreground">{user.full_name || user.email}</p>
          <p className="text-xs text-muted-foreground">
            Current balance: <span className="font-bold text-amber-600">{current} chips</span>
          </p>
        </div>

        <div className="px-5 pb-3">
          <div className="grid grid-cols-3 gap-2 p-1 bg-muted/60 rounded-xl border border-border">
            {[
              ["add", "Add"],
              ["deduct", "Deduct"],
              ["set", "Set"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition ${mode === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {mode === "set" ? "New balance" : "Amount"}
          </label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full text-sm border border-border rounded-xl bg-background text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="px-5 pb-3">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Note (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for adjustment…"
            className="w-full text-sm border border-border rounded-xl bg-background text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
              New balance
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-black text-base tabular-nums">
              <MiniChipIcon size={14} /> {newBalance}
            </span>
          </div>
          <button
            onClick={handleConfirm}
            disabled={busy || !canSubmit}
            className="w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            Confirm {mode === "set" ? "Set" : mode === "add" ? "Add" : "Deduct"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LogsView({ users }) {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedAction, setSelectedAction] = useState("");

  const { data: logs = [], isLoading, isFetching } = useQuery({
    queryKey: ["casinoChipLogs"],
    queryFn: async () => {
      const rows = await base44.entities.CasinoChipLog.list("-timestamp", 300);
      return rows || [];
    },
  });

  const filtered = logs.filter((l) => {
    if (selectedUser && l.user_id !== selectedUser) return false;
    if (selectedAction && l.action_type !== selectedAction) return false;
    return true;
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["casinoChipLogs"] });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="flex-1 text-sm border border-border rounded-xl bg-background text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email}
            </option>
          ))}
        </select>
        <button
          onClick={refresh}
          disabled={isFetching}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border border-border rounded-xl bg-card text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <select
        value={selectedAction}
        onChange={(e) => setSelectedAction(e.target.value)}
        className="text-sm border border-border rounded-xl bg-background text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">All actions</option>
        {Object.entries(ACTION_LABELS).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {filtered.length} log entry{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            No chip movements logged yet.
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[65vh] overflow-y-auto">
            {filtered.map((l, i) => {
              const amt = Number(l.amount) || 0;
              const isPos = amt > 0;
              const isZero = amt === 0;
              return (
                <div key={l.id || i} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${ACTION_BADGE[l.action_type] || "bg-muted text-muted-foreground"}`}>
                      {ACTION_LABELS[l.action_type] || l.action_type}
                    </span>
                    <span
                      className={`text-sm font-black tabular-nums ${
                        isZero ? "text-muted-foreground" : isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {isPos ? `+${amt}` : amt}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                      {formatTimestamp(l.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground truncate">{l.user_name || l.user_email}</p>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <MiniChipIcon size={11} />
                      <span className="tabular-nums font-bold text-amber-600 dark:text-amber-400">{Number(l.balance_after) || 0}</span>
                    </span>
                  </div>
                  {l.detail && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{l.detail}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}