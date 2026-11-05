// Best of 3 score row — a fixed-width score gutter flanked by two flexible,
// ellipsizing player names, all vertically centered on one line.
const STYLES = `
.b3-score-row{box-sizing:border-box;display:flex;align-items:center;gap:18px;padding:13px 18px;background:linear-gradient(145deg,#073b3b,#0a5550);border:1px solid #28736a;border-radius:14px;box-shadow:0 8px 20px rgba(6,51,49,.18),inset 0 1px 0 rgba(218,255,241,.08);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#e8fff5}
.b3-player{flex:1 1 0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1.35;font-weight:750;letter-spacing:.035em}
.b3-player.is-right{text-align:right}
.b3-score{box-sizing:border-box;flex:0 0 132px;text-align:center;white-space:nowrap;font-size:23px;line-height:1.1;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:.02em;color:#f4d78d;text-shadow:0 1px 12px rgba(242,205,115,.16);animation:bot3-score-glow 3.2s ease-in-out infinite}
@keyframes bot3-score-glow{0%,100%{text-shadow:0 1px 9px rgba(242,205,115,.12)}50%{text-shadow:0 1px 15px rgba(242,205,115,.38)}}
`;

export default function ScoreboardRow({ creatorName, opponentName, creatorWins, opponentWins }) {
  return (
    <div className="b3-score-row">
      <style>{STYLES}</style>
      <span className="b3-player">{creatorName}</span>
      <span className="b3-score">
        {creatorWins} : {opponentWins}
      </span>
      <span className="b3-player is-right">{opponentName}</span>
    </div>
  );
}