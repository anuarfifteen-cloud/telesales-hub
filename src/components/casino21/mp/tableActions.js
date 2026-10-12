import { base44 } from "@/api/base44Client";

// Insert-only action queue for the shared Multiplayer Blackjack table.
// Players never edit the ActiveTable row directly for game actions — they
// INSERT a TableAction record, and the host's engine is the sole writer that
// applies each action to the table. Inserts never collide with one another
// (each is a new row), so N players tapping "Hit" or "Accept" at the exact same
// millisecond produce N clean rows with zero last-write-wins overwrites.

// Create a new action record. Returns the created row.
export async function insertAction(action) {
  return await base44.entities.TableAction.create(action);
}

// All pending actions for a table, oldest first. The host processes and
// deletes these one at a time; anything still here is unapplied.
//
// Read failures are NOT swallowed. Returning an empty list on error would look
// identical to an empty queue, so non-host joins and plays would silently never
// apply. Let the error throw — the host engine logs it explicitly and surfaces a
// retry control so the host can see the queue is unreachable.
export async function fetchPendingActions(tableId) {
  const page = await base44.entities.TableAction.filter(
    { table_id: tableId },
    { sort: "created_date", limit: 100 }
  );
  return page?.items || [];
}

// Delete an action after the host has applied it (or determined it is stale).
// A missing/already-deleted record is fine — another host may have processed it.
export async function deleteAction(actionId) {
  try {
    await base44.entities.TableAction.delete(actionId);
  } catch (e) {
    // already deleted by a concurrent host tick — not an error
  }
}