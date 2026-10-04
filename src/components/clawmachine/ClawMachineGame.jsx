import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { logChipMovement } from "@/lib/chipLog";
import ClawMachineCabinet, { CLAW_DROP_Y, CLAW_SLIP_Y } from "./ClawMachineCabinet";
import ClawPrizeModal from "./ClawPrizeModal";
import { CAPSULES, ENTRY_COST, nearestCapsuleIndex, rollClawOutcome } from "./clawPrizes";

export default function ClawMachineGame({ user, onUserUpdate }) {
  const [phase, setPhase] = useState("idle"); // idle | dropping | lifting | result
  const [clawY, setClawY] = useState(0);
  const [grabbed, setGrabbed] = useState(null);
  const [falling, setFalling] = useState(null);
  const [message, setMessage] = useState("");
  const [granted, setGranted] = useState(null);
  const [busy, setBusy] = useState(false);

  const xRef = useRef(50);
  const timers = useRef([]);
  const tokens = user?.earlyAccessTokens ?? 0;
  const canAfford = tokens >= ENTRY_COST;
  const displayName = user?.full_name || user?.email?.split("@")[0] || "Player";

  const after = (ms, fn) => {
    timers.current.push(setTimeout(fn, ms));
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const grantPrize = async (prize) => {
    const fresh = await base44.auth.me();

    if (prize.type === "chips") {
      const chips = Number(fresh?.casinoChips) || 0;
      await base44.auth.updateMe({ casinoChips: chips + prize.amount });
      await logChipMovement({
        user,
        action_type: "win",
        amount: prize.amount,
        balance_after: chips + prize.amount,
        detail: `Claw Machine prize — ${prize.amount} chips`,
      });
      return { type: "chips", amount: prize.amount };
    }

    if (prize.type === "tokens") {
      const balance = Number(fresh?.earlyAccessTokens) || 0;
      await base44.auth.updateMe({ earlyAccessTokens: balance + prize.amount });
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: displayName,
        amount: prize.amount,
        source: "Claw Machine Prize",
        timestamp: new Date().toISOString(),
      });
      return { type: "tokens", amount: prize.amount };
    }

    if (prize.type === "diamond") {
      const diamonds = Number(fresh?.diamonds) || 0;
      await base44.auth.updateMe({ diamonds: diamonds + prize.amount });
      return { type: "diamond", amount: prize.amount };
    }

    // Exclusive theme win — already owned converts into tokens instead.
    const owned = Array.isArray(fresh?.unlockedThemes) ? fresh.unlockedThemes : [];
    if (owned.includes(prize.themeId)) {
      const balance = Number(fresh?.earlyAccessTokens) || 0;
      await base44.auth.updateMe({ earlyAccessTokens: balance + prize.fallbackTokens });
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: displayName,
        amount: prize.fallbackTokens,
        source: `Claw Machine Prize (${prize.themeName} already owned)`,
        timestamp: new Date().toISOString(),
      });
      return { type: "tokens", amount: prize.fallbackTokens, duplicateTheme: true, themeName: prize.themeName };
    }

    await base44.auth.updateMe({ unlockedThemes: [...new Set([...owned, prize.themeId])] });
    return { type: "theme", themeId: prize.themeId, themeName: prize.themeName };
  };

  const handleDrop = async () => {
    if (busy || phase !== "idle" || !canAfford) return;
    setBusy(true);

    const fresh = await base44.auth.me();
    const balance = Number(fresh?.earlyAccessTokens) || 0;
    if (balance < ENTRY_COST) {
      toast.error(`You need ${ENTRY_COST} tokens to play.`);
      setBusy(false);
      return;
    }

    await base44.auth.updateMe({ earlyAccessTokens: balance - ENTRY_COST });
    await base44.entities.TokenTransaction.create({
      user_id: user.id,
      user_name: displayName,
      amount: -ENTRY_COST,
      source: "Claw Machine Drop",
      timestamp: new Date().toISOString(),
    });
    await onUserUpdate?.();

    // Intersect + roll the outcome up front, then play it out visually.
    const capsuleIndex = nearestCapsuleIndex(xRef.current, CAPSULES.length);
    const roll = rollClawOutcome();
    setMessage("");
    setBusy(false);
    setPhase("dropping");
    setClawY(CLAW_DROP_Y);

    after(950, () => {
      setGrabbed(capsuleIndex);

      after(350, () => {
        if (roll.slip) {
          // House wins — the claw rises only halfway and the capsule drops back.
          setClawY(CLAW_SLIP_Y);
          after(900, () => {
            setGrabbed(null);
            setFalling(capsuleIndex);
            after(520, () => {
              setFalling(null);
              setClawY(0);
              setPhase("idle");
              setMessage("😵 Slipped! The capsule fell back — House wins.");
              after(2800, () => setMessage(""));
            });
          });
          return;
        }

        setPhase("lifting");
        setClawY(0);
        after(950, async () => {
          const result = await grantPrize(roll.prize);
          setGranted(result);
          setPhase("result");
          await onUserUpdate?.();
        });
      });
    });
  };

  const handleCollect = () => {
    setGranted(null);
    setGrabbed(null);
    setClawY(0);
    setPhase("idle");
  };

  return (
    <>
      <ClawMachineCabinet
        capsules={CAPSULES}
        xRef={xRef}
        moving={phase === "idle"}
        clawY={clawY}
        grabbed={grabbed}
        falling={falling}
        message={message}
        tokens={tokens}
        onDrop={handleDrop}
        disabled={phase !== "idle" || !canAfford}
      />

      {!canAfford && phase === "idle" && (
        <p className="text-xs font-bold text-center text-rose-500 mt-3">
          You need {ENTRY_COST} tokens for one drop.
        </p>
      )}

      {granted && <ClawPrizeModal granted={granted} onClose={handleCollect} />}
    </>
  );
}