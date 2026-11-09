import { useState } from "react";
import DerbyTabs from "./DerbyTabs";
import HorseBettingGame from "./HorseBettingGame";
import DerbyLeaderboard from "./DerbyLeaderboard";

/** Horse Betting: the daily race, or the season leaderboard. */
export default function HorseBettingView({ user, onUserUpdate }) {
  const [tab, setTab] = useState("derby");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
      <DerbyTabs tab={tab} onChange={setTab} />
      {tab === "derby" ? (
        <HorseBettingGame user={user} onUserUpdate={onUserUpdate} />
      ) : (
        <DerbyLeaderboard user={user} onUserUpdate={onUserUpdate} />
      )}
    </div>
  );
}