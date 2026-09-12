import { useState, useEffect, useMemo } from "react";
import { Landmark, Users, BarChart3, Search, ArrowUpDown, Loader2, Pencil, Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

function getCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function AdminVaultHoldings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("desc"); // desc | asc
  const [editingId, setEditingId] = useState(null);
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustMode, setAdjustMode] = useState("add"); // add | subtract
  const [saving, setSaving] = useState(false);

  const currentMonth = getCurrentMonth();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.User.list();
      setUsers(rows);
    } catch (e) {
      toast.error("Failed to load users: " + (e?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const enriched = useMemo(() => {
    return users.map((u) => {
      const vault = Number(u.tapVaultBalance) || 0;
      let status = "empty";
      if (u.lastVaultActionDate === currentMonth) status = "claimed";
      else if (vault > 0) status = "pending";
      return {
        ...u,
        vault,
        tokens: Number(u.earlyAccessTokens) || 0,
        status,
      };
    });
  }, [users, currentMonth]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = enriched;
    if (q) {
      list = list.filter(
        (u) =>
          (u.full_name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) =>
      sortDir === "desc" ? b.vault - a.vault : a.vault - b.vault
    );
    return list;
  }, [enriched, query, sortDir]);

  const totalVaulted = enriched.reduce((s, u) => s + u.vault, 0);
  const activeAccounts = enriched.filter((u) => u.vault > 0).length;
  const avgBalance = activeAccounts > 0 ? Math.round(totalVaulted / activeAccounts) : 0;

  const startEdit = (u) => {
    setEditingId(u.id);
    setAdjustValue("");
    setAdjustMode("add");
  };

  const saveAdjust = async (u) => {
    const delta = Math.floor(Number(adjustValue));
    if (!Number.isFinite(delta) || delta <= 0) {
      toast.error("Enter a positive whole number.");
      return;
    }
    setSaving(true);
    try {
      const current = Number(u.tapVaultBalance) || 0;
      const next = adjustMode === "add" ? current + delta : Math.max(0, current - delta);
      await base44.entities.User.update(u.id, { tapVaultBalance: next });
      toast.success(`${adjustMode === "add" ? "Added" : "Subtracted"} ${delta} vault tokens for ${u.full_name || u.email}.`);
      setEditingId(null);
      await loadUsers();
    } catch (e) {
      toast.error("Adjustment failed: " + (e?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status) => {
    if (status === "claimed")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
          🟢 Claimed This Month
        </span>
      );
    if (status === "pending")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">
          🟡 Action Pending
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-bold">
        ⚪ Vault Empty
      </span>
    );
  };

  const metricCard = (icon, label, value, accent) => (
    <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Landmark className="w-5 h-5 text-amber-600" /> 🏛️ TAP Vault Holdings
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Monitor every user's TAP Savings Vault balance and monthly action status, with admin override controls.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {metricCard(
          <Landmark className="w-5 h-5 text-amber-600" />,
          "Total Vaulted Floor Capital",
          totalVaulted.toLocaleString(),
          "bg-amber-50 ring-1 ring-amber-200"
        )}
        {metricCard(
          <Users className="w-5 h-5 text-blue-600" />,
          "Active Vault Accounts",
          activeAccounts,
          "bg-blue-50 ring-1 ring-blue-200"
        )}
        {metricCard(
          <BarChart3 className="w-5 h-5 text-emerald-600" />,
          "Average User Vault Balance",
          avgBalance.toLocaleString(),
          "bg-emerald-50 ring-1 ring-emerald-200"
        )}
      </div>

      {/* Search + table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "0 2px 16px 0 rgba(0,0,0,0.06)" }}>
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">User Name</th>
                  <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Email</th>
                  <th className="text-right font-semibold px-3 py-2 whitespace-nowrap">Active Tokens</th>
                  <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">
                    <button
                      onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      TAP Vault Balance <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Last Vault Action</th>
                  <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Action Status</th>
                  <th className="text-center font-semibold px-3 py-2 whitespace-nowrap">Override</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t border-border hover:bg-slate-50">
                    <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">
                      {u.full_name || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{u.email || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                      {u.tokens.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-bold text-amber-600">
                      {u.vault.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                      {u.lastVaultActionDate || "—"}
                    </td>
                    <td className="px-3 py-2">{statusBadge(u.status)}</td>
                    <td className="px-3 py-2">
                      {editingId === u.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <select
                            value={adjustMode}
                            onChange={(e) => setAdjustMode(e.target.value)}
                            className="rounded-md border border-border bg-white px-1 py-1 text-[10px] font-bold"
                          >
                            <option value="add">+</option>
                            <option value="subtract">−</option>
                          </select>
                          <input
                            type="number"
                            min={1}
                            value={adjustValue}
                            onChange={(e) => setAdjustValue(e.target.value)}
                            className="w-16 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-center tabular-nums"
                            placeholder="tokens"
                          />
                          <button
                            onClick={() => saveAdjust(u)}
                            disabled={saving}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(u)}
                          className="mx-auto flex items-center gap-1 rounded-lg bg-amber-50 text-amber-700 px-2 py-1 text-[10px] font-bold border border-amber-200 hover:bg-amber-100"
                        >
                          <Pencil className="w-3 h-3" /> Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}