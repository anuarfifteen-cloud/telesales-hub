import { useEffect, useState } from "react";
import { fetchSeasonScore } from "@/lib/milestone";

// The active season's 🏆RANK score for a player. Null while loading; 0 when the
// player has no row yet or their row still belongs to an older season.
export default function useSeasonScore(userId, enabled = true) {
  const [score, setScore] = useState(null);

  useEffect(() => {
    if (!userId || !enabled) return;
    let active = true;
    fetchSeasonScore(userId)
      .then((s) => active && setScore(s))
      .catch(() => active && setScore(0));
    return () => {
      active = false;
    };
  }, [userId, enabled]);

  return score;
}