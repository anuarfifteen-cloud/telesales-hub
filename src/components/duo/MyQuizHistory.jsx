import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function MyQuizHistory({ user }) {
  const [history, setHistory] = useState([]);
  const [fetched, setFetched] = useState(false);

  // Keep the fetch logic alive in the background in case other components depend on it
  useEffect(() => {
    const fetchHistoryInBackground = async () => {
      if (fetched || !user?.id) return;
      try {
        const [asP1, asP2] = await Promise.all([
          base44.entities.DuoTeam.filter({ player1_id: user.id }),
          base44.entities.DuoTeam.filter({ player2_id: user.id }),
        ]);
        const teamIds = [...asP1, ...asP2].map(t => t.id);

        const allEntries = [];
        for (const teamId of teamIds) {
          const isP1 = asP1.some(t => t.id === teamId);
          const scores = await base44.entities.FiveDayScore.filter({ team_id: teamId });
          for (const s of scores) {
            const log = JSON.parse(s[isP1 ? "p1_question_log" : "p2_question_log"] || "[]");
            allEntries.push(...log);
          }
        }

        allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
        setHistory(allEntries);
        setFetched(true);
      } catch (err) {
        console.error("Background history sync failed:", err);
      }
    };

    fetchHistoryInBackground();
  }, [user, fetched]);

  // Return null so absolutely nothing renders to the user interface
  return null;
}