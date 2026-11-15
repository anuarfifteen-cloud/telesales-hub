import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const DAILY_LIMIT = 3;
const SEAT_FEE = 100;
/** The once-a-day token pack that adds three more seats to the day. */
const BONUS_PLAYS = 3;
const BONUS_COST = 5;

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

    const [profiles, rows] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ id: user.id }),
      base44.asServiceRole.entities.CloserPlay.filter({ user_id: user.id, play_date: date }),
    ]);

    const profile = profiles?.[0] || {};
    const chips = Number(profile.casinoChips) || 0;
    const tokens = Number(profile.earlyAccessTokens) || 0;

    // The day's bonus-pack row lives beside the seat rows; only the seat rows
    // count towards the allowance, so a purchase never consumes a play.
    const bonusRow = rows.find((row) => row.bonus_purchase === true);
    const seats = rows.filter((row) => row.bonus_purchase !== true).length;
    const purchased = Boolean(bonusRow);
    const limit = DAILY_LIMIT + (purchased ? BONUS_PLAYS : 0);
    const bonusLeftAfter = (taken) =>
      purchased ? Math.max(0, BONUS_PLAYS - Math.max(0, taken - DAILY_LIMIT)) : 0;

    const state = (over = {}) => ({
      ok: true,
      date,
      chips,
      tokens,
      playCount: seats,
      remaining: Math.max(0, limit - seats),
      limit,
      fee: SEAT_FEE,
      bonusPurchased: purchased,
      bonusPlaysLeft: bonusLeftAfter(seats),
      bonusAvailable: !purchased,
      bonusPlays: BONUS_PLAYS,
      bonusCost: BONUS_COST,
      ...over,
    });

    // Buy today's +3 plays with tokens — once per Brunei day, after the three
    // base seats are spent.
    if (body.action === 'bonus') {
      // A retried click for a pack already recorded never charges again.
      if (body.requestId && bonusRow && bonusRow.play_id === body.requestId) {
        return Response.json(state({ replay: true }));
      }
      if (purchased) return Response.json(state({ ok: false, blocked: 'bonus_used' }));
      if (seats < DAILY_LIMIT) return Response.json(state({ ok: false, blocked: 'plays_left' }));
      if (tokens < BONUS_COST) return Response.json(state({ ok: false, blocked: 'tokens' }));

      const tokensAfter = tokens - BONUS_COST;
      let rowId = null;
      try {
        const created = await base44.asServiceRole.entities.CloserPlay.create({
          user_id: user.id,
          user_name: user.full_name || user.email || '',
          play_date: date,
          slot: 0,
          play_id: body.requestId || '',
          bonus_purchase: true,
          bonus_plays: BONUS_PLAYS,
          tokens_spent: BONUS_COST,
          created_at: new Date().toISOString(),
        });
        rowId = created?.id || null;
        await base44.asServiceRole.entities.User.update(user.id, { earlyAccessTokens: tokensAfter });
      } catch (error) {
        // The purchase row is written first; if the token write fails it is
        // rolled back so nobody is granted plays they did not pay for.
        if (rowId) await base44.asServiceRole.entities.CloserPlay.delete(rowId).catch(() => null);
        throw error;
      }

      await base44.asServiceRole.entities.TokenTransaction.create({
        user_id: user.id,
        user_name: user.full_name || user.email || '',
        amount: -BONUS_COST,
        source: `The Closer +${BONUS_PLAYS} Plays`,
        timestamp: new Date().toISOString(),
      }).catch(() => null);

      return Response.json({
        ...state(),
        tokens: tokensAfter,
        remaining: BONUS_PLAYS,
        limit: DAILY_LIMIT + BONUS_PLAYS,
        bonusPurchased: true,
        bonusPlaysLeft: BONUS_PLAYS,
        bonusAvailable: false,
      });
    }

    // Loading the tab: report the persisted state for today.
    if (body.action !== 'seat') {
      return Response.json(state());
    }

    // A retried click for a seat already recorded never charges again.
    if (body.playId) {
      const existing = rows.find((p) => p.bonus_purchase !== true && p.play_id === body.playId);
      if (existing) {
        return Response.json(
          state({ chips: Number(existing.chips_after) || chips, replay: true })
        );
      }
    }

    if (seats >= limit) {
      return Response.json(state({ ok: false, blocked: 'limit' }));
    }

    if (chips < SEAT_FEE) {
      return Response.json(state({ ok: false, blocked: 'chips' }));
    }

    const chipsAfter = chips - SEAT_FEE;

    // Seat fee and the play itself are recorded together, before the game starts.
    await base44.asServiceRole.entities.User.update(user.id, { casinoChips: chipsAfter });
    await base44.asServiceRole.entities.CloserPlay.create({
      user_id: user.id,
      user_name: user.full_name || user.email || '',
      play_date: date,
      slot: seats + 1,
      play_id: body.playId || '',
      bonus_purchase: false,
      bonus_plays: 0,
      tokens_spent: 0,
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
      detail: `The Closer entry fee ${SEAT_FEE} (play ${seats + 1}/${limit})`,
      timestamp: new Date().toISOString(),
    }).catch(() => null);

    return Response.json(
      state({
        chips: chipsAfter,
        playCount: seats + 1,
        remaining: Math.max(0, limit - (seats + 1)),
        bonusPlaysLeft: bonusLeftAfter(seats + 1),
      })
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}