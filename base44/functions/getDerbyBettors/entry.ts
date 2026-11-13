import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Who bet on what for a given Derby race day.
 *
 * HorseBet rows are only readable by their owner (or an admin), so the result
 * overlay's bettor bubbles are served from here: service role reads the day's
 * rows and returns nothing but the display fields — never stakes, balances or
 * statuses.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { race_date } = await req.json().catch(() => ({}));
    if (!race_date) return Response.json({ error: 'race_date is required' }, { status: 400 });

    const page = await base44.asServiceRole.entities.HorseBet.filter(
      { race_date },
      { sort: 'created_date', limit: 300 }
    );

    const seen = new Set();
    const bettors = [];
    for (const row of page?.items || []) {
      if (!row?.user_id || !row?.horse_id || seen.has(row.user_id)) continue;
      seen.add(row.user_id);
      bettors.push({
        user_id: row.user_id,
        user_name: row.user_name || 'Player',
        horse_id: row.horse_id,
      });
    }

    return Response.json({ bettors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}