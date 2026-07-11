import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

const REWARD_EMOJI = { 1: "🎟️", 2: "✨", 3: "💰", 4: "🔥", 5: "👑" };
const FOMO_LINES = [
  "just scored big!",
  "got lucky!",
  "just cashed in!",
  "hit a mystery reward!",
  "just claimed theirs!",
];

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function VoucherActivityFeed() {
  const [redeemed, setRedeemed] = useState([]);

  const load = async () => {
    // Get last 5 redeemed vouchers, sorted by updated_date desc
    const rows = await base44.entities.Voucher.filter({ status: "redeemed" }, "-updated_date", 5);
    setRedeemed(rows);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Voucher.subscribe(() => load());
    return unsub;
  }, []);

  if (redeemed.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Voucher Claims</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {redeemed.map((v, i) => {
            const tokens = v.reward_tokens ?? 1;
            const fomo = FOMO_LINES[i % FOMO_LINES.length];
            const name = v.user_name?.split(" ")[0] || "Someone";
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2"
              >
                <span className="text-lg flex-shrink-0">{REWARD_EMOJI[tokens] ?? "🎟️"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 truncate">
                    <span className="font-black">{name}</span> {fomo}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">
                    Won <span className="font-black">{tokens} token{tokens !== 1 ? "s" : ""}</span> · {timeAgo(v.updated_date || v.created_at)}
                  </p>
                </div>
                <span className="flex-shrink-0 text-[10px] font-black bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                  +{tokens}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}