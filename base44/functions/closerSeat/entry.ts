import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const DAILY_LIMIT = 3;
const SEAT_FEE = 100;

/** Today's date in Asia/Brunei (UTC+8), independent of the device timezone. */
function bruneiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Brunei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export default async function (req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth
    .me()
    .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const date = bruneiDateKey();

    const [profiles, plays] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ id: user.id }),
      base44.asServiceRole.entities.CloserPlay.filter({ user_id: user.id, play_date: date }),
    ]);

    const chips = Number(profiles?.[0]?.casinoChips) || 0;
    const count = plays.length;

    // Loading the tab: report the persisted state for today.
    if (body.action !== 'seat') {
      return Response.json({
        ok: true,
        date,
        chips,
        playCount: Math.min(count, DAILY_LIMIT),
        remaining: Math.max(0, DAILY_LIMIT - count),
        limit: DAILY_LIMIT,
        fee: SEAT_FEE,
      });
    }

    // A retried click for a seat already recorded never charges again.
    if (body.playId) {
      const existing = plays.find((p) => p.play_id === body.playId);
      if (existing) {
        return Response.json({
          ok: true,
          date,
          chips: Number(existing.chips_after) || chips,
          playCount: Math.min(count, DAILY_LIMIT),
          remaining: Math.max(0, DAILY_LIMIT - count),
          limit: DAILY_LIMIT,
          fee: SEAT_FEE,
          replay: true,
        });
      }
    }

    if (count >= DAILY_LIMIT) {
      return Response.json({
        ok: false,
        blocked: 'limit',
        date,
        chips,
        playCount: count,
        remaining: 0,
        limit: DAILY_LIMIT,
        fee: SEAT_FEE,
      });
    }

    if (chips < SEAT_FEE) {
      return Response.json({
        ok: false,
        blocked: 'chips',
        date,
        chips,
        playCount: count,
        remaining: Math.max(0, DAILY_LIMIT - count),
        limit: DAILY_LIMIT,
        fee: SEAT_FEE,
      });
    }

    const chipsAfter = chips - SEAT_FEE;

    // Seat fee and the play itself are recorded together, before the game starts.
    await base44.asServiceRole.entities.User.update(user.id, { casinoChips: chipsAfter });
    await base44.asServiceRole.entities.CloserPlay.create({
      user_id: user.id,
      user_name: user.full_name || user.email || '',
      play_date: date,
      slot: count + 1,
      play_id: body.playId || '',
      chips_before: chips,
      chips_after: chipsAfter,
      created_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.CasinoChipLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email || '',
      user_email: user.email || '',
      mode: 'wallet',
      action_type: 'bet',
      amount: -SEAT_FEE,
      balance_after: chipsAfter,
      detail: `The Closer entry fee ${SEAT_FEE} (play ${count + 1}/${DAILY_LIMIT})`,
      timestamp: new Date().toISOString(),
    }).catch(() => null);

    return Response.json({
      ok: true,
      date,
      chips: chipsAfter,
      playCount: count + 1,
      remaining: Math.max(0, DAILY_LIMIT - (count + 1)),
      limit: DAILY_LIMIT,
      fee: SEAT_FEE,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}