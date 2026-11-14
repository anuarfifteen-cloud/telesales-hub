import { useEffect, useRef, useState } from "react";
import { Info, Volume2, VolumeX } from "lucide-react";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";
import CloserFolder from "./CloserFolder";
import CloserResultCard from "./CloserResultCard";
import CloserProgressBar from "./CloserProgressBar";
import CloserPrizeBoard from "./CloserPrizeBoard";
import CloserEntryCard from "./CloserEntryCard";
import ManagerOfferModal from "./ManagerOfferModal";
import useCloserAudio from "./useCloserAudio";
import { CLOSER_BG } from "@/lib/closerTheme";
import {
  DAILY_LIMIT,
  ENTRY_FEE,
  FOLDER_COUNT,
  FOLDERS_AT_OFFER,
  PRIZES,
  creditPrize,
  loadCloserState,
  managerOffer,
  shufflePrizes,
  takeSeat,
} from "@/lib/theCloser";

/** The prize ladder split across the two side boards, lowest to highest. */
const LADDER = [...PRIZES].sort((a, b) => a - b);
const LEFT_BOARD = LADDER.slice(0, Math.ceil(LADDER.length / 2));
const RIGHT_BOARD = LADDER.slice(Math.ceil(LADDER.length / 2));

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
  const [daily, setDaily] = useState({
    remaining: DAILY_LIMIT,
    playCount: 0,
    loading: true,
    date: "",
  });
  const valuesRef = useRef([]);

  // The suspense bed only runs while a round is live, and starts on the seat
  // tap — the gesture browsers require before any audio may play.
  const { muted, toggleMuted, unlock, stop, play } = useCloserAudio({
    active: phase === "pick" || phase === "play",
  });

  const chips = Number(user?.casinoChips) || 0;
  const affordable = chips >= ENTRY_FEE;
  const offerMade = offer !== null;
  const limitReached = daily.remaining <= 0;

  const deskIndices =
    lucky === null
      ? []
      : Array.from({ length: FOLDER_COUNT }, (_, i) => i).filter((i) => i !== lucky);
  const remainingDesk = deskIndices.filter((i) => !opened.includes(i));
  const lastDeskIndex = remainingDesk.length === 1 ? remainingDesk[0] : null;

  const openedValues = opened.map((i) => Number(valuesRef.current[i]) || 0);
  const progress = deskIndices.length ? opened.length / deskIndices.length : 0;

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

  // Today's persisted plays (server-dated in Brunei time) load with the tab.
  useEffect(() => {
    let alive = true;
    loadCloserState()
      .then((state) => {
        if (alive) setDaily({ ...state, loading: false });
      })
      .catch(() => {
        if (alive) setDaily((prev) => ({ ...prev, loading: false }));
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSit = async () => {
    if (busy || !affordable || limitReached) return;
    // Starts the music in this very tap, before anything is awaited — the server
    // round trip would otherwise land outside the browser's gesture window.
    unlock();
    setBusy(true);
    setError("");
    try {
      // The server checks the limit and takes the 100 chips before the game begins.
      const state = await takeSeat();
      setDaily({ ...state, loading: false });
      if (!state.ok) {
        stop(); // no seat: silence the bed again
        setError(
          state.blocked === "limit"
            ? "You've used all 3 plays today. The desk resets at midnight Brunei time."
            : `You need ${ENTRY_FEE} chips to take a seat.`
        );
        return;
      }
      valuesRef.current = shufflePrizes();
      setLucky(null);
      setOpened([]);
      setOffer(null);
      setOfferOpen(false);
      setLuckyRevealed(false);
      setResult(null);
      setPhase("pick");
      await onUserUpdate?.();
    } catch {
      stop();
      setError("The desk could not confirm your seat. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handlePick = (index) => {
    if (phase !== "pick") return;
    setLucky(index);
    setPhase("play");
    play("sfxSelect");
  };

  const handleOpen = (index) => {
    if (phase !== "play" || busy || offerOpen) return;
    if (index === lucky || opened.includes(index)) return;

    const nextOpened = [...opened, index];
    setOpened(nextOpened);
    play("sfxEliminate");

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
    play("sfxWin");
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

  // The Manager's call rings the moment his modal opens.
  useEffect(() => {
    if (offerOpen) play("sfxRing");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerOpen]);

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
      play("sfxWin");
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
    <div className="mx-auto w-full max-w-[620px]">
      <div
        className="relative w-full overflow-hidden rounded-[26px] border border-amber-200/25 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        style={{
          aspectRatio: "1024 / 1408",
          backgroundImage: `url(${CLOSER_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* soft vignette so the overlays read on the artwork */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,5,22,0.62) 0%, rgba(8,5,22,0.1) 26%, rgba(8,5,22,0) 56%, rgba(8,5,22,0.44) 100%)",
          }}
        />

        {/* top: title + progress, then plays, chips and the sound toggle.
            Kept at z-10 so the sticky app header above always wins. */}
        <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-1.5 p-2.5">
          <CloserProgressBar progress={progress} />
          <div className="flex items-center justify-between gap-1.5">
            <span className="rounded-full bg-[#241242]/80 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-amber-100/90 ring-1 ring-amber-200/25 backdrop-blur-sm sm:text-[8px]">
              {daily.loading ? "Checking plays…" : `${daily.remaining} of ${DAILY_LIMIT} plays left`}
            </span>
            <div className="flex items-center gap-1">
              <span className="flex items-center gap-1 rounded-full bg-[#241242]/80 px-2 py-0.5 text-[8px] font-black tabular-nums text-amber-100 ring-1 ring-amber-200/25 backdrop-blur-sm sm:text-[9px]">
                <MiniChipIcon size={10} />
                {chips}
              </span>
              <button
                type="button"
                onClick={toggleMuted}
                aria-label={muted ? "Unmute game sound" : "Mute game sound"}
                title={muted ? "Unmute game sound" : "Mute game sound"}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-[#241242]/80 text-amber-100 ring-1 ring-amber-200/25 backdrop-blur-sm transition hover:bg-[#34205F]/90 sm:h-[22px] sm:w-[22px]"
              >
                {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        <CloserPrizeBoard side="left" values={LEFT_BOARD} dimmed={openedValues} />
        <CloserPrizeBoard side="right" values={RIGHT_BOARD} dimmed={openedValues} />

        {phase !== "idle" && (
          <div className="absolute inset-x-[15%] bottom-[31.5%] z-10 flex justify-center">
            <p className="rounded-full bg-[#241242]/85 px-2.5 py-1 text-center text-[7px] font-black uppercase tracking-[0.12em] text-amber-100 ring-1 ring-amber-200/30 backdrop-blur-sm sm:text-[8px]">
              {phase === "pick"
                ? "Pick the folder you will keep"
                : `${remainingDesk.length} on the desk · ${
                    offerMade ? "no more offers" : `offer at ${FOLDERS_AT_OFFER}`
                  }`}
            </p>
          </div>
        )}

        {/* the desk */}
        <div className="absolute inset-x-[13%] bottom-[4%] z-10 grid grid-cols-5 gap-1.5 sm:gap-2">
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
                  phase === "idle" ||
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

        {phase === "idle" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-3">
            <CloserEntryCard
              chips={chips}
              remaining={daily.remaining}
              loading={daily.loading}
              busy={busy}
              affordable={affordable}
              limitReached={limitReached}
              error={error}
              entryFee={ENTRY_FEE}
              onSit={handleSit}
            />
          </div>
        )}

        {error && phase !== "idle" && phase !== "done" && (
          <div className="absolute inset-x-[12%] bottom-[27%] z-20">
            <p className="rounded-lg bg-rose-600/85 px-2 py-1.5 text-center text-[8px] font-bold text-white backdrop-blur-sm">
              {error}
            </p>
          </div>
        )}

        {phase === "done" && result && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0A0618]/65 p-5 backdrop-blur-[2px]">
            <div className="w-full max-w-[16rem]">
              <CloserResultCard
                result={result}
                luckyValue={Number(valuesRef.current[lucky]) || 0}
                canPlay={!limitReached}
                onPlayAgain={resetTable}
              />
            </div>
          </div>
        )}
      </div>

      <ManagerOfferModal
        open={offerOpen}
        offer={offer ?? 0}
        foldersLeft={FOLDERS_AT_OFFER}
        busy={busy}
        onAccept={handleAccept}
        onReject={() => setOfferOpen(false)}
      />

      <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-border bg-muted/40 px-2.5 py-2 text-[10px] leading-snug text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Casual play: the folder values are shuffled in your browser, so they are not tamper-proof until
        they open. Each game is settled once and left to admin auditing.
      </p>
    </div>
  );
}