import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { initialBlitzTableRecord } from "./blitzEngine";

// Loads the single shared ActiveTable row, keeps it in sync through the entity
// subscription, and falls back to visible-tab-only polling. `patch` writes a
// partial update and adopts the returned record so the writer's screen reacts
// instantly. Same pattern as the original useActiveTable, but initialises with
// a Blitz tournament record.
export default function useBlitzTable(user) {
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const idRef = useRef(null);
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const load = useCallback(async () => {
    try {
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
        initialBlitzTableRecord(userIdRef.current)
      );
      idRef.current = created.id;
      setTable(created);
      return created;
    } catch (e) {
      console.warn("Blitz table load failed:", e);
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
      console.warn("Blitz table update failed:", e);
      return null;
    }
  }, []);

  useEffect(() => {
    let unsubscribe = null;
    try {
      unsubscribe = base44.entities.ActiveTable.subscribe((event) => {
        const row = event?.data;
        if (event?.type === "delete" || !row?.id) {
          load();
          return;
        }
        if (idRef.current && row.id !== idRef.current) return;
        idRef.current = row.id;
        setTable(row);
      });
    } catch (e) {
      console.warn("Blitz table subscribe unavailable — polling:", e);
      setPolling(true);
    }
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [load]);

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