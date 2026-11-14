import { useEffect, useRef, useState } from "react";
import { Info, Lock } from "lucide-react";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";
import CloserFolder from "./CloserFolder";
import CloserResultCard from "./CloserResultCard";
import ManagerOfferModal from "./ManagerOfferModal";
import {
  ENTRY_FEE,
  FOLDER_COUNT,
  FOLDERS_AT_OFFER,
  chargeEntry,
  creditPrize,
  managerOffer,
  shufflePrizes,
} from "@/lib/theCloser";

const DESK_BG =
  "https://media.base44.com/images/public/6a02849f1b6bb0b71bf23993/86c7a98d5_generated_image.png";

const RULES = [
  "Stake 100 chips, then pick the one folder you will keep.",
  "Open folders on the desk one by one — each is money you don't win.",
  "With five folders left, the Manager makes a single buyout offer.",
  "Take the money, or open on until only your folder is left.",
];

/**
 * The Closer — a casual Deal or No Deal style game played for casino chips.
 *
 * The shuffled prize list lives in a ref: folders render only their number, and
 * a value enters the markup the moment that folder opens. That keeps the board
 * clean for casual play; it is not a security boundary, so the game is settled
 * once per round and left to admin auditing.
 */
export default function TheCloserGame({ user, onUserUpdate }) {
  const [phase, setPhase] = useState("idle"); // idle | pick | play | done
  const [lucky, setLucky] = useState(null);
  const [opened, setOpened] = useState([]);
  const [offer, setOffer] = useState(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [luckyRevealed, setLuckyRevealed] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valuesRef = useRef([]);

  const chips = Number(user?.casinoChips) || 0;
  const affordable = chips >= ENTRY_FEE;
  const offerMade = offer !== null;

  const deskIndices =
    lucky === null
      ? []
      : Array.from({ length: FOLDER_COUNT }, (_, i) => i).filter((i) => i !== lucky);
  const remainingDesk = deskIndices.filter((i) => !opened.includes(i));
  const lastDeskIndex = remainingDesk.length === 1 ? remainingDesk[0] : null;

  const resetTable = () => {
    valuesRef.current = [];
    setLucky(null);
    setOpened([]);
    setOffer(null);
    setOfferOpen(false);
    setLuckyRevealed(false);
    setResult(null);
    setError("");
    setPhase("idle");
  };

  const handleSit = async () => {
    if (busy || !affordable) return;
    setBusy(true);
    setError("");
    try {
      await chargeEntry(user);
      valuesRef.current = shufflePrizes();
      setLucky(null);
      setOpened([]);
      setOffer(null);
      setOfferOpen(false);
      setLuckyRevealed(false);
      setResult(null);
      setPhase("pick");
      await onUserUpdate?.();
    } catch (e) {
      setError(e?.message || "The desk could not take your entry fee.");
    } finally {
      setBusy(false);
    }
  };

  const handlePick = (index) => {
    if (phase !== "pick") return;
    setLucky(index);
    setPhase("play");
  };

  const handleOpen = (index) => {
    if (phase !== "play" || busy || offerOpen) return;
    if (index === lucky || opened.includes(index)) return;

    const nextOpened = [...opened, index];
    setOpened(nextOpened);

    // The one and only Manager call: exactly five desk folders still in play.
    const deskLeft = deskIndices.filter((i) => !nextOpened.includes(i));
    if (!offerMade && deskLeft.length === FOLDERS_AT_OFFER) {
      const inPlay = [...deskLeft, lucky].map((i) => Number(valuesRef.current[i]) || 0);
      setOffer(managerOffer(inPlay));
      setOfferOpen(true);
    }
  };

  const handleAccept = async () => {
    if (busy || !offerMade) return;
    const amount = offer;
    setOfferOpen(false);
    setLuckyRevealed(true);
    setResult({ amount, source: "offer" });
    setPhase("done");
    setBusy(true);
    try {
      await creditPrize({ user, amount, source: "buyout offer" });
      await onUserUpdate?.();
    } catch {
      setError("The payout could not be confirmed. An admin will verify it — don't replay.");
    } finally {
      setBusy(false);
    }
  };

  // No second offer: the last desk folder opens itself, then the lucky folder.
  useEffect(() => {
    if (phase !== "play" || !offerMade || lastDeskIndex === null) return undefined;
    const timer = setTimeout(() => setOpened((prev) => [...prev, lastDeskIndex]), 900);
    return () => clearTimeout(timer);
  }, [phase, offerMade, lastDeskIndex]);

  useEffect(() => {
    if (phase !== "play" || !offerMade || lucky === null) return undefined;
    if (remainingDesk.length !== 0) return undefined;
    const timer = setTimeout(() => {
      const amount = Number(valuesRef.current[lucky]) || 0;
      setLuckyRevealed(true);
      setResult({ amount, source: "lucky" });
      setPhase("done");
      creditPrize({ user, amount, source: "lucky folder" })
        .then(() => onUserUpdate?.())
        .catch(() =>
          setError("The payout could not be confirmed. An admin will verify it — don't replay.")
        );
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, offerMade, remainingDesk.length, lucky]);

  const gridLocked = phase !== "pick" && phase !== "play";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-400/40 p-3.5"
        style={{ background: "linear-gradient(150deg,#0f2b21 0%,#0a1d16 60%,#08150f 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 0 2px rgba(212,175,55,0.16)" }}
        />
        <div className="relative flex items-start justify-between gap-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-300/80">
              Deal or No Deal · The desk
            </p>
            <h2 className="mt-0.5 font-display text-xl font-bold leading-tight text-amber-50">
              The Closer
            </h2>
            <p className="text-[11px] font-semibold text-amber-200/60">
              Ten folders. One lucky pick. One buyout.
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300/30 bg-black/30 px-2 py-1 text-[11px] font-black tabular-nums text-amber-100">
            <MiniChipIcon size={12} />
            {chips}
          </span>
        </div>
      </div>

      {phase === "idle" ? (
        /* Entry */
        <div
          className="relative overflow-hidden rounded-2xl border border-amber-500/25"
          style={{ backgroundImage: `url(${DESK_BG})`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(4,12,9,0.66) 0%, rgba(4,12,9,0.52) 45%, rgba(4,12,9,0.8) 100%)",
            }}
          />
          <div className="relative p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-300/80">
              House rules
            </p>
            <ul className="mt-2 space-y-1.5">
              {RULES.map((rule) => (
                <li key={rule} className="flex gap-1.5 text-[11px] leading-snug text-amber-50/85">
                  <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-amber-300/80" />
                  {rule}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleSit}
              disabled={busy || !affordable}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-500 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#0b1712] shadow-[0_6px_20px_rgba(212,175,55,0.35)] transition hover:brightness-105 disabled:opacity-45"
            >
              <Lock className="h-3.5 w-3.5" />
              {busy ? "Dealing…" : `Take a seat · ${ENTRY_FEE} chips`}
            </button>

            {!affordable && (
              <p className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-amber-300">
                You need {ENTRY_FEE} chips — top up in the Cashier
              </p>
            )}
            {error && (
              <p className="mt-2 rounded-lg bg-rose-500/15 px-2 py-1.5 text-[11px] font-semibold text-rose-200 ring-1 ring-rose-400/30">
                {error}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* The desk */
        <div
          className="relative overflow-hidden rounded-2xl border border-amber-500/25"
          style={{ backgroundImage: `url(${DESK_BG})`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(4,12,9,0.55) 0%, rgba(4,12,9,0.34) 42%, rgba(4,12,9,0.68) 100%)",
            }}
          />
          <div className="relative p-2.5">
            {phase === "pick" && (
              <p className="mb-2 rounded-lg bg-amber-300/15 px-2 py-1 text-center text-[9px] font-black uppercase tracking-[0.16em] text-amber-200 ring-1 ring-amber-300/25">
                Pick the folder you will keep
              </p>
            )}

            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: FOLDER_COUNT }, (_, i) => {
                const isLucky = i === lucky;
                const isOpen = opened.includes(i) || (isLucky && luckyRevealed);
                return (
                  <CloserFolder
                    key={i}
                    number={i + 1}
                    value={isOpen ? Number(valuesRef.current[i]) || 0 : null}
                    open={isOpen}
                    lucky={isLucky}
                    disabled={
                      gridLocked ||
                      busy ||
                      offerOpen ||
                      (phase === "play" && (isLucky || isOpen))
                    }
                    onOpen={() => (phase === "pick" ? handlePick(i) : handleOpen(i))}
                  />
                );
              })}
            </div>

            {phase === "play" && (
              <div className="mt-2 flex items-center justify-between rounded-xl bg-black/40 px-2.5 py-1.5 ring-1 ring-amber-300/15">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100/80">
                  {remainingDesk.length} on the desk
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70">
                  {offerMade ? "No more offers" : `Offer at ${FOLDERS_AT_OFFER} folders`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === "done" && result && (
        <CloserResultCard
          result={result}
          luckyValue={Number(valuesRef.current[lucky]) || 0}
          onPlayAgain={resetTable}
        />
      )}

      {error && phase !== "idle" && (
        <p className="rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] font-semibold text-rose-700">
          {error}
        </p>
      )}

      <ManagerOfferModal
        open={offerOpen}
        offer={offer ?? 0}
        foldersLeft={FOLDERS_AT_OFFER}
        busy={busy}
        onAccept={handleAccept}
        onReject={() => setOfferOpen(false)}
      />

      <p className="flex items-start gap-1.5 rounded-xl border border-border bg-muted/40 px-2.5 py-2 text-[10px] leading-snug text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Casual play: the folder values are shuffled in your browser, so they are not tamper-proof until
        they open. Each game is settled once and left to admin auditing.
      </p>
    </div>
  );
}