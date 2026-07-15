import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Crown, Loader2 } from "lucide-react";

const THEMES = {
  flappy: {
    border: "border-[#c864ff]/30",
    glow: "shadow-[0_0_25px_rgba(200,100,255,0.15)]",
    accent: "#c864ff",
    accent2: "#ff00c8",
    bgFrom: "from-[#06001a]",
    divider: "divide-[#c864ff]/10",
    hover: "hover:bg-[#c864ff]/5",
    headerBorder: "border-[#ff00c8]/20",
    badgeBorder: "border-[#ff00c8]/30",
    badgeBg: "bg-[#ff00c8]/10",
    unit: "PTS",
  },
  supertap: {
    border: "border-[#00f3ff]/30",
    glow: "shadow-[0_0_25px_rgba(0,243,255,0.15)]",
    accent: "#00f3ff",
    accent2: "#ff00ea",
    bgFrom: "from-[#06001a]",
    divider: "divide-[#00f3ff]/10",
    hover: "hover:bg-[#00f3ff]/5",
    headerBorder: "border-[#ff00ea]/20",
    badgeBorder: "border-[#ff00ea]/30",
    badgeBg: "bg-[#ff00ea]/10",
    unit: "TAPS",
  },
};

export function LeaderboardViewToggle({ view, setView, gameName }) {
  const t = THEMES[gameName] || THEMES.flappy;
  const liveActive = view === "live";
  const fameActive = view === "halloffame";
  return (
    <div className="flex gap-2">
      <button
        onClick={() => setView("live")}
        className="flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest border transition-all"
        style={
          liveActive
            ? { borderColor: t.accent2, color: t.accent2, boxShadow: `0 0 12px ${t.accent2}66`, background: `${t.accent2}1a` }
            : { borderColor: `${t.accent}40`, color: `${t.accent}66`, background: "transparent" }
        }
      >
        Live Scores
      </button>
      <button
        onClick={() => setView("halloffame")}
        className="flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest border transition-all"
        style={
          fameActive
            ? { borderColor: "#ffd700", color: "#ffd700", boxShadow: "0 0 12px rgba(255,215,0,0.5)", background: "rgba(255,215,0,0.15)" }
            : { borderColor: `${t.accent}40`, color: `${t.accent}66`, background: "transparent" }
        }
      >
        🏆 Hall of Fame
      </button>
    </div>
  );
}

export default function HallOfFame({ gameName }) {
  const t = THEMES[gameName] || THEMES.flappy;
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.GameChampions.filter({ game_name: gameName }, "-season_date_awarded", 50);
      setChampions(rows);
    } catch {
      setChampions([]);
    }
    setLoading(false);
  }, [gameName]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = base44.entities.GameChampions.subscribe(() => load());
    return unsub;
  }, [load]);

  return (
    <div className={`w-full bg-[#0a0530]/90 backdrop-blur-xl rounded-2xl border ${t.border} ${t.glow} overflow-hidden transition-all duration-300`}>
      <div className={`bg-gradient-to-b ${t.bgFrom} to-transparent border-b ${t.headerBorder} px-5 py-5 relative`}>
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#ffd700] to-transparent opacity-60" />
        <div className="flex items-center justify-center gap-3 mb-2">
          <Crown className="w-5 h-5 text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.9)]" />
          <p className="text-sm font-black uppercase tracking-widest" style={{ color: t.accent }}>
            Hall of Fame — Season Champions
          </p>
        </div>
        <p className="text-[11px] text-center leading-relaxed" style={{ color: t.accent, opacity: 0.7 }}>
          Legendary players who claimed the crown at season's end. 👑
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: t.accent }} />
        </div>
      ) : champions.length === 0 ? (
        <div className="py-12 text-center text-sm tracking-widest font-bold uppercase" style={{ color: t.accent, opacity: 0.5 }}>
          No champions crowned yet. Be the first legend!
        </div>
      ) : (
        <div className={`divide-y ${t.divider} bg-transparent`}>
          {champions.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-4 px-5 py-4 transition-colors ${t.hover}`}>
              <div className="w-8 flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 text-[#ffd700] drop-shadow-[0_0_6px_rgba(255,215,0,0.8)]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-white truncate block" style={{ wordBreak: "break-word" }}>
                  {c.user_name}
                </span>
                <span className="text-[10px] uppercase tracking-widest" style={{ color: t.accent, opacity: 0.6 }}>
                </span>
              </div>
              <span
                className={`text-sm font-black tracking-widest tabular-nums flex-shrink-0 px-3 py-1.5 rounded-lg border ${t.badgeBorder} ${t.badgeBg}`}
                style={{ color: t.accent2 }}
              >
                {c.score} {t.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}