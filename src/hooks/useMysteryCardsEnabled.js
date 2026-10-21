import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Global 🃏 Mystery Card switch, read live from AppSettings (absent = on).
// This only decides whether the cards can be OPENED — an already-running 2×
// Surge or High Roller Pass timer keeps running until it expires on its own.
export default function useMysteryCardsEnabled() {
  // Starts off and switches on once the setting is known, so a disabled system
  // can never flash a card on screen while the setting is still loading.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      base44.entities.AppSettings.list()
        .then((rows) => {
          if (alive) setEnabled(rows[0]?.mystery_cards_enabled !== false);
        })
        .catch(() => {});
    load();
    const unsub = base44.entities.AppSettings.subscribe?.(load);
    return () => {
      alive = false;
      unsub && unsub();
    };
  }, []);

  return enabled;
}