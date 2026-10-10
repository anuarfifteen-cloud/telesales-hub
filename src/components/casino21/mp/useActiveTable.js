import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { initialTableRecord } from "./mpEngine";

// Loads the single shared table row, keeps it in sync through the entity
// subscription, and falls back to visible-tab-only polling when the
// subscription is unavailable. `patch` writes a partial update and adopts the
// returned record so the writer's own screen reacts instantly.
export default function useActiveTable(user) {
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const idRef = useRef(null);
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const load = useCallback(async () => {
    try {
      // Oldest row wins so every client converges on the same table even if
      // two clients created one at the same moment.
      const page = await base44.entities.ActiveTable.filter(
        {},
        { sort: "created_date", limit: 1 }
      );
      const row = (page?.items || [])[0];
      if (row) {
        idRef.current = row.id;
        setTable(row);
        return row;
      }
      if (!userIdRef.current) return null;
      const created = await base44.entities.ActiveTable.create(
        initialTableRecord(userIdRef.current)
      );
      idRef.current = created.id;
      setTable(created);
      return created;
    } catch (e) {
      console.warn("ActiveTable load failed:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const patch = useCallback(async (fields) => {
    const id = idRef.current;
    if (!id) return null;
    try {
      const updated = await base44.entities.ActiveTable.update(id, fields);
      if (updated) setTable(updated);
      return updated;
    } catch (e) {
      console.warn("ActiveTable update failed:", e);
      return null;
    }
  }, []);

  // Primary sync: realtime subscription on the shared table row.
  useEffect(() => {
    let unsubscribe = null;
    try {
      unsubscribe = base44.entities.ActiveTable.subscribe((event) => {
        const row = event?.data;
        if (event?.type === "delete" || !row?.id) {
          load();
          return;
        }
        if (idRef.current && row.id !== idRef.current) return; // ours only
        idRef.current = row.id;
        setTable(row);
      });
    } catch (e) {
      console.warn("ActiveTable subscribe unavailable — polling instead:", e);
      setPolling(true);
    }
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [load]);

  // Fallback sync: short poll every 2.5s, only while the tab is visible, plus a
  // single catch-up read whenever the tab is brought back to the foreground.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") load();
    };
    const iv = setInterval(() => {
      if (polling) refresh();
    }, 2500);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [polling, load]);

  useEffect(() => {
    load();
  }, [load, user?.id]);

  return { table, loading, patch, reload: load, polling };
}