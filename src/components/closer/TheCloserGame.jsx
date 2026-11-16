import { useEffect, useRef, useState } from "react";
import { Info, Volume2, VolumeX } from "lucide-react";
import MiniChipIcon from "@/components/casino21/MiniChipIcon";
import CloserFolder from "./CloserFolder";
import CloserResultCard from "./CloserResultCard";
import CloserProgressBar from "./CloserProgressBar";
import CloserPrizeBoard from "./CloserPrizeBoard";
import CloserEntryCard from "./CloserEntryCard";
import CloserLiveActivity from "./CloserLiveActivity";
import CloserDiamondBadge from "./CloserDiamondBadge";
import CloserBonusPill from "./CloserBonusPill";
import ManagerOfferModal from "./ManagerOfferModal";
import useCloserAudio from "./useCloserAudio";
import { CLOSER_BG } from "@/lib/closerTheme";
import {
  BONUS_COST,
  BONUS_PLAYS,
  DAILY_LIMIT,
  DIAMOND_PRIZE,
  DIAMOND_VALUE,
  ENTRY_FEE,
  dealFolders,
  FOLDER_COUNT,
  FOLDERS_AT_OFFER,
  PRIZES,
  buyBonusPlays,
  creditDiamondPrize,
  creditPrize,
  finishCloserRound,
  loadCloserRound,
  loadCloserState,
  managerOffer,
  negotiatedOffer,
  saveCloserRound,
  takeSeat,
} from "@/lib/theCloser";

/** The prize ladder, lowest to highest — split across the two side boards. */
const LADDER = [...PRIZES].sort((a, b) => a - b);
const LADDER_SPLIT = Math.ceil(LADDER.length / 2);

/**
 * The Closer — a casual Deal or No Deal style game played for casino chips.
 *
 * The ten dealt folders — two of them Mystery Wildcards with a secret value —
 * live in a ref: folders render only their number, and a value enters the markup
 * the moment that folder opens (or is revealed as the kept folder). That keeps
 * the board clean for casual play; it is not a security boundary, so the game is
 * settled once per round and left to admin auditing.
 */
export default function TheCloserGame({ user, onUserUpdate }) {
  const [phase, setPhase] = useState("idle"); // idle | pick | play | reveal | done
  const [lucky, setLucky] = useState(null);
  const [opened, setOpened] = useState([]);
  const [offer, setOffer] = useState(null);
  const [offerOpen, setOfferOpen] = useState(false);
  // The buyout the player turned down, kept for the end-of-round verdict.
  const [lastVipOffer, setLastVipOffer] = useState(null);
  const [luckyRevealed, setLuckyRevealed] = useState(false);
  const [result, setResult] = useState(null);
  // True only while playing the third play of today's +3 allowance — the sixth
  // seat of the Brunei day, where folder 500 pays 1 Diamond instead of chips.
  const [diamondRound, setDiamondRound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [daily, setDaily] = useState({
    remaining: DAILY_LIMIT,
    playCount: 0,
    loading: true,
    date: "",
    bonusPurchased: false,
    bonusPlaysLeft: 0,
    bonusAvailable: false,
    bonusPlays: BONUS_PLAYS,
    bonusCost: BONUS_COST,
  });
  // True while the once-a-day +3 plays unlock is in flight.
  const [buyingBonus, setBuyingBonus] = useState(false);
  // Bumped after the player's own payout lands, so the Live Activity feed
  // refreshes immediately instead of waiting for its next poll.
  const [feedKey, setFeedKey] = useState(0);
  // The ten dealt folders ({ id, base, value, isMystery, isDiamond }). Kept in a
  // ref so an unopened Mystery Wildcard's value never reaches the markup.
  const foldersRef = useRef([]);

  // The suspense bed only runs while a round is live, and starts on the seat
  // tap — the gesture browsers require before any audio may play.
  const { muted, toggleMuted, unlock, stop, play } = useCloserAudio({
    active: phase === "pick" || phase === "play",
  });

  const chips = Number(user?.casinoChips) || 0;
  const tokens = Number(user?.earlyAccessTokens) || 0;
  const affordable = chips >= ENTRY_FEE;
  const offerMade = offer !== null;
  const limitReached = daily.remaining <= 0;

  const deskIndices =
    lucky === null
      ? []
      : Array.from({ length: FOLDER_COUNT }, (_, i) => i).filter((i) => i !== lucky);
  const remainingDesk = deskIndices.filter((i) => !opened.includes(i));
  const lastDeskIndex = remainingDesk.length === 1 ? remainingDesk[0] : null;

  const progress = deskIndices.length ? opened.length / deskIndices.length : 0;

  // The ladder keeps the standard prize order. A Mystery Wildcard reads as a `?`
  // until its own folder opens — on the desk, or as the kept folder at the end —
  // and only then shows the amount it really held.
  const ladderSlots = LADDER.map((base) => {
    const index = foldersRef.current.findIndex((folder) => folder.base === base);
    const folder = index >= 0 ? foldersRef.current[index] : null;
    return {
      base,
      value: Number(folder?.value) || base,
      isMystery: Boolean(folder?.isMystery),
      revealed: index >= 0 && (opened.includes(index) || (index === lucky && luckyRevealed)),
      gone: index >= 0 && opened.includes(index),
      diamond: Boolean(diamondRound && folder?.isDiamond),
    };
  });

  const resetTable = () => {
    foldersRef.current = [];
    setLucky(null);
    setOpened([]);
    setOffer(null);
    setOfferOpen(false);
    setLastVipOffer(null);
    setLuckyRevealed(false);
    setResult(null);
    setError("");
    setDiamondRound(false);
    setPhase("idle");
  };

  // Today's persisted plays (server-dated in Brunei time) load with the tab,
  // then any in-progress Diamond Round is restored so a refresh resumes the very
  // same folders instead of losing a paid seat.
  useEffect(() => {
    let alive = true;
    loadCloserState()
      .then((state) => {
        if (alive) setDaily({ ...state, loading: false });
        return loadCloserRound();
      })
      .then((saved) => {
        const round = saved?.round;
        if (!alive || !round) return;
        // The full dealt folders (Wildcard flags and secret values included) come
        // back exactly as they were saved. Rounds saved before Wildcards existed
        // only carry plain values, which are rebuilt into folder objects.
        const savedFolders = Array.isArray(round.folders)
          ? round.folders
          : Array.isArray(round.values)
            ? round.values.map((value, i) => ({
                id: `${i}-${value}`,
                base: Number(value) || 0,
                value: Number(value) || 0,
                isMystery: false,
                isDiamond: Number(value) === DIAMOND_VALUE,
              }))
            : [];
        if (!savedFolders.length) return;
        foldersRef.current = savedFolders;
        setLucky(Number.isInteger(round.lucky) ? round.lucky : null);
        setOpened(Array.isArray(round.opened) ? round.opened : []);
        // The saved buyout is restored exactly as it was rolled — a refresh never
        // re-rolls the ±5% swing. Rounds saved before this field existed fall
        // back to their stored offer.
        const savedOffer = round.vipOffer ?? round.offer;
        setOffer(savedOffer === null || savedOffer === undefined ? null : Number(savedOffer));
        setOfferOpen(Boolean(round.offerOpen));
        // A rejected offer comes back with the round, so finishing the final four
        // opens after a refresh still compares against what was turned down.
        const savedRejected = round.lastVipOffer ?? (round.offerOpen ? null : savedOffer);
        setLastVipOffer(
          savedRejected === null || savedRejected === undefined ? null : Number(savedRejected)
        );
        setDiamondRound(true);
        setPhase(round.phase === "play" ? "play" : "pick");
      })
      .catch(() => {
        if (alive) setDaily((prev) => ({ ...prev, loading: false }));
      });
    return () => {
      alive = false;
    };
  }, []);

  // Diamond Round only: every pick, open and offer decision is saved on the
  // round's own server row, so a refresh lands back on the same board.
  useEffect(() => {
    if (!diamondRound || (phase !== "pick" && phase !== "play")) return;
    saveCloserRound({
      folders: foldersRef.current.map((folder, i) => ({ ...folder, opened: opened.includes(i) })),
      lucky,
      opened,
      vipOffer: offer,
      offer,
      lastVipOffer,
      phase,
      offerOpen,
    }).catch(() => {});
  }, [diamondRound, phase, lucky, opened, offer, offerOpen, lastVipOffer]);

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
            ? "You've used all your plays today. The desk resets at midnight Brunei time."
            : `You need ${ENTRY_FEE} chips to take a seat.`
        );
        return;
      }
      // The +3 allowance's third play — the sixth seat of the day — is the
      // Diamond Round. Folder 500 still weighs 500 for the offer maths.
      setDiamondRound(Boolean(state.bonusPurchased && state.playCount >= state.limit));
      // Two of the ten folders are dealt as Mystery Wildcards, each holding a
      // freshly rolled secret amount — the top two slots always stay visible.
      foldersRef.current = dealFolders();
      setLucky(null);
      setOpened([]);
      setOffer(null);
      setOfferOpen(false);
      setLastVipOffer(null);
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

  // One-time token purchase that reopens today's table with three more seats.
  const handleBuyBonus = async () => {
    if (buyingBonus) return;
    setBuyingBonus(true);
    setError("");
    try {
      const state = await buyBonusPlays();
      setDaily({ ...state, loading: false });
      if (!state.ok) {
        setError(
          state.blocked === "tokens"
            ? `You need ${BONUS_COST} tokens to unlock more plays.`
            : "That unlock is no longer available today."
        );
        return;
      }
      await onUserUpdate?.();
    } catch {
      setError("The unlock could not be confirmed. Please try again.");
    } finally {
      setBuyingBonus(false);
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
      const inPlay = [...deskLeft, lucky].map((i) => Number(foldersRef.current[i]?.value) || 0);
      // The house sets its base offer from the folders still in play (500 stays
      // a 500 weight in a Diamond Round), then the VIP Client's ±5% swing is
      // rolled once and becomes the amount displayed and paid.
      setOffer(negotiatedOffer(managerOffer(inPlay)));
      setOfferOpen(true);
    }
  };

  const handleAccept = async () => {
    if (busy || !offerMade) return;
    const amount = offer;
    const kept = foldersRef.current[lucky];
    // A Wildcard pays what it secretly held; the Diamond slot is the Diamond in a
    // Diamond Round — the take stays a Chips payout, but the reveal shows the
    // Diamond that was left behind.
    const folderValue = Number(kept?.value) || 0;
    const folderDiamond = diamondRound && Boolean(kept?.isDiamond);

    setOfferOpen(false);
    setBusy(true);
    setPhase("reveal");
    setLuckyRevealed(true); // the kept folder flips over first…
    play("sfxEliminate");

    // …and the deal is settled only once the player has seen what was inside.
    await new Promise((resolve) => setTimeout(resolve, 1900));

    setResult({ amount, source: "offer", folderValue, folderDiamond });
    setPhase("done");
    play("sfxWin");
    try {
      // A Diamond Round buyout is still paid in chips; closing the round first
      // makes sure it can never be resumed or paid twice.
      if (diamondRound) await finishCloserRound();
      await creditPrize({ user, amount, source: "buyout offer" });
      setFeedKey((k) => k + 1);
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
      // A Wildcard pays the amount it secretly held, revealed right now.
      const kept = foldersRef.current[lucky];
      const amount = Number(kept?.value) || 0;
      // Only the Diamond slot converts in a Diamond Round; every other folder
      // still pays its normal chips.
      const diamond = diamondRound && Boolean(kept?.isDiamond);
      setLuckyRevealed(true);
      setResult({ amount: diamond ? DIAMOND_PRIZE : amount, source: "lucky", diamond, lastVipOffer });
      setPhase("done");
      play("sfxWin");
      (diamondRound ? finishCloserRound() : Promise.resolve())
        .then(() =>
          diamond
            ? creditDiamondPrize({ user, amount: DIAMOND_PRIZE, source: "lucky folder 500" })
            : creditPrize({ user, amount, source: "lucky folder" })
        )
        .then(() => {
          setFeedKey((k) => k + 1);
          onUserUpdate?.();
        })
        .catch(() =>
          setError("The payout could not be confirmed. An admin will verify it — don't replay.")
        );
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, offerMade, remainingDesk.length, lucky, lastVipOffer]);

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
              {daily.loading ? "Checking plays…" : `${daily.remaining} plays left`}
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

        <CloserPrizeBoard side="left" slots={ladderSlots.slice(0, LADDER_SPLIT)} />
        <CloserPrizeBoard side="right" slots={ladderSlots.slice(LADDER_SPLIT)} />

        {diamondRound && phase !== "idle" && <CloserDiamondBadge />}

        {phase !== "idle" && (
          <div className="absolute inset-x-[15%] bottom-[31.5%] z-10 flex flex-col items-center gap-1">
            {!diamondRound &&
              (daily.bonusPlayNumber === 1 || daily.bonusPlayNumber === 2) && (
                <CloserBonusPill play={daily.bonusPlayNumber} total={BONUS_PLAYS} />
              )}
            <p className="rounded-full bg-[#241242]/85 px-2.5 py-1 text-center text-[7px] font-black uppercase tracking-[0.12em] text-amber-100 ring-1 ring-amber-200/30 backdrop-blur-sm sm:text-[8px]">
              {phase === "pick"
                ? "Pick the folder you will keep"
                : phase === "reveal"
                  ? "Your folder is turning over…"
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
                value={isOpen ? Number(foldersRef.current[i]?.value) || 0 : null}
                diamond={Boolean(isOpen && diamondRound && foldersRef.current[i]?.isDiamond)}
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
              tokens={tokens}
              bonusPurchased={daily.bonusPurchased}
              bonusPlays={daily.bonusPlays}
              bonusCost={daily.bonusCost}
              bonusPlayNumber={daily.bonusPlayNumber}
              buyingBonus={buyingBonus}
              onBuyBonus={handleBuyBonus}
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
              <CloserResultCard result={result} canPlay={!limitReached} onPlayAgain={resetTable} />
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
        onReject={() => {
          // The refused amount is remembered for the end-of-round comparison.
          setLastVipOffer(offer);
          setOfferOpen(false);
        }}
      />

      {/* Shared feed of the five newest wins across all players */}
      <CloserLiveActivity refreshKey={feedKey} />

      <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-border bg-muted/40 px-2.5 py-2 text-[10px] leading-snug text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Casual play: the folder values are shuffled in your browser, so they are not tamper-proof until
        they open. Each game is settled once and left to admin auditing.
      </p>
    </div>
  );
}