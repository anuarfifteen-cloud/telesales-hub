import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Trash2, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const GAMES = {
  flappy: {
    label: "Flappy Token",
    color: "#c864ff",
    chipBg: "bg-purple-100",
    chipText: "text-purple-700",
    unit: "PTS",
  },
  supertap: {
    label: "Super Taps",
    color: "#00f3ff",
    chipBg: "bg-cyan-100",
    chipText: "text-cyan-700",
    unit: "TAPS",
  },
};

function getLocalDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminGameHistory({ user }) {
  const [gameTab, setGameTab] = useState("flappy");
  const [subTab, setSubTab] = useState("live");
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ user_id: "", user_name: "", score: "", season_date_awarded: getLocalDateStr() });
  const [saving, setSaving] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["adminUsersList"],
    queryFn: () => base44.entities.User.list(),
  });

  const liveQueryKey = gameTab === "flappy" ? ["flappyAdminLive"] : ["tapScoreAdminLive"];
  const { data: liveScores = [], isLoading: liveLoading } = useQuery({
    queryKey: liveQueryKey,
    queryFn: () =>
      gameTab === "flappy"
        ? base44.entities.FlappyLeaderboard.list("-score", 50)
        : base44.entities.TapScore.list("-high_score", 50),
  });

  const { data: champions = [], isLoading: champsLoading } = useQuery({
    queryKey: ["gameChampions", gameTab],
    queryFn: () => base44.entities.GameChampions.filter({ game_name: gameTab }, "-season_date_awarded", 100),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["gameChampions", gameTab] });
  };

  const handleAdd = async () => {
    if (!form.user_id || !form.score || !form.season_date_awarded) {
      toast.error("Please select a player, enter a score, and season date.");
      return;
    }
    setSaving(true);
    try {
      const u = users.find((x) => x.id === form.user_id);
      await base44.entities.GameChampions.create({
        game_name: gameTab,
        user_id: form.user_id,
        user_name: u?.full_name || u?.email || form.user_name || "Player",
        score: Number(form.score),
        season_date_awarded: form.season_date_awarded,
      });
      toast.success("🏆 Champion added to Hall of Fame!");
      setForm({ user_id: "", user_name: "", score: "", season_date_awarded: getLocalDateStr() });
      refresh();
    } catch (e) {
      toast.error("Failed to add champion: " + (e?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this champion from the Hall of Fame?")) return;
    try {
      await base44.entities.GameChampions.delete(id);
      toast.success("Champion removed.");
      refresh();
    } catch (e) {
      toast.error("Delete failed: " + (e?.message || "Unknown error"));
    }
  };

  const g = GAMES[gameTab];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-900 text-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-amber-400" />
          <p className="text-xs font-semibold uppercase tracking-widest opacity-75">Admin Monitoring</p>
        </div>
        <h2 className="text-xl font-bold">Game Leaderboards & History</h2>
        <p className="text-sm opacity-70 mt-0.5">Monitor live scores and manage Hall of Fame season champions.</p>
      </div>

      {/* Game tabs */}
      <div className="flex gap-2">
        {Object.entries(GAMES).map(([id, cfg]) => (
          <button
            key={id}
            onClick={() => { setGameTab(id); setSubTab("live"); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              gameTab === id ? "bg-primary text-primary-foreground border-primary shadow" : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Sub tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab("live")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${subTab === "live" ? "bg-slate-800 text-white border-slate-800" : "bg-card text-muted-foreground border-border"}`}
        >
          {gameTab === "flappy" ? "Today's Leaderboard" : "Current Leaderboard"}
        </button>
        <button
          onClick={() => setSubTab("champions")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${subTab === "champions" ? "bg-amber-500 text-white border-amber-500" : "bg-card text-muted-foreground border-border"}`}
        >
          🏆 Season Champions
        </button>
      </div>

      {/* Live leaderboard */}
      {subTab === "live" && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {liveLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : liveScores.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No scores recorded yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {liveScores.map((s, i) => {
                const score = gameTab === "flappy" ? s.score : s.high_score;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 flex items-center justify-center flex-shrink-0">
                      {i < 3 ? <span className="text-lg">{medals[i]}</span> : <span className="text-xs font-bold text-slate-400">#{i + 1}</span>}
                    </div>
                    <span className="text-sm font-semibold text-slate-800 flex-1 truncate">
                      {gameTab === "flappy" ? s.user_name : s.user_name}
                    </span>
                    <span className="text-sm font-black tabular-nums text-slate-900">
                      {score} {g.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Season champions management */}
      {subTab === "champions" && (
        <div className="space-y-4">
          {/* Add champion form */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Crown a New Champion</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <select
                value={form.user_id}
                onChange={(e) => {
                  const u = users.find((x) => x.id === e.target.value);
                  setForm({ ...form, user_id: e.target.value, user_name: u?.full_name || u?.email || "" });
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select player…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder={`Score (${g.unit})`}
                  value={form.score}
                  onChange={(e) => setForm({ ...form, score: e.target.value })}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={form.season_date_awarded}
                  onChange={(e) => setForm({ ...form, season_date_awarded: e.target.value })}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button onClick={handleAdd} disabled={saving} className="w-full gap-2 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? "Saving…" : `Add ${g.label} Champion`}
              </Button>
            </div>
          </div>

          {/* Champions list */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {champsLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : champions.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No champions recorded yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {champions.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.user_name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Season: {c.season_date_awarded}</p>
                    </div>
                    <span className="text-sm font-black tabular-nums text-slate-900">{c.score} {g.unit}</span>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Remove champion"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}