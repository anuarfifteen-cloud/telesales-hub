import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BRUNEI_TZ = "Asia/Brunei";

function getBruneiDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function getCycleStartDate() {
  // Monday of the current week in Brunei time
  const today = new Date(getBruneiDateString() + "T00:00:00+08:00");
  const day = today.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00+08:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both admin-triggered (authenticated) and scheduled (unauthenticated service-role) calls
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch (_) {
      // Called from scheduler / service role — allow
      isScheduled = true;
    }

    const cycleStartDate = getCycleStartDate();
    const cycleEndDate = addDays(cycleStartDate, 4);

    // 1. Fetch all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    if (allUsers.length < 2) {
      return Response.json({ error: 'Not enough users to form pairs.' }, { status: 400 });
    }

    // 2. Fetch active questions (need at least 14*2 = ideally but min 10)
    const questions = await base44.asServiceRole.entities.QuizQuestion.filter({ is_active: true });
    if (questions.length < 10) {
      return Response.json({ error: 'Not enough active quiz questions. Need at least 10.' }, { status: 400 });
    }

    // 3. Delete existing DuoMatchCycle records for this cycle
    const existingCycles = await base44.asServiceRole.entities.DuoMatchCycle.filter({ cycle_start_date: cycleStartDate });
    await Promise.all(existingCycles.map(c => base44.asServiceRole.entities.DuoMatchCycle.delete(c.id)));

    // 4. Shuffle users and pair them up
    const shuffledUsers = shuffle(allUsers);
    // Group into pairs — if odd number, last user sits out
    const pairs = [];
    for (let i = 0; i + 1 < shuffledUsers.length; i += 2) {
      pairs.push([shuffledUsers[i], shuffledUsers[i + 1]]);
    }

    // 5. Shuffle questions pool
    const shuffledQuestions = shuffle(questions);

    // 6. Create one DuoMatchCycle record per pair
    const created = [];
    for (let pairIdx = 0; pairIdx < pairs.length; pairIdx++) {
      const [p1, p2] = pairs[pairIdx];

      // Each pair gets 10 unique questions (5 per player), cycling through pool if needed
      const poolSize = shuffledQuestions.length;
      const offset = (pairIdx * 10) % poolSize;
      const p1Questions = [];
      const p2Questions = [];
      for (let k = 0; k < 5; k++) {
        p1Questions.push(shuffledQuestions[(offset + k) % poolSize].id);
        p2Questions.push(shuffledQuestions[(offset + 5 + k) % poolSize].id);
      }

      const record = await base44.asServiceRole.entities.DuoMatchCycle.create({
        p1_id: p1.id,
        p1_email: p1.email,
        p1_name: p1.full_name || p1.email.split("@")[0],
        p2_id: p2.id,
        p2_email: p2.email,
        p2_name: p2.full_name || p2.email.split("@")[0],
        cycle_start_date: cycleStartDate,
        cycle_end_date: cycleEndDate,
        status: "active",
        p1_question_ids: JSON.stringify(p1Questions),
        p2_question_ids: JSON.stringify(p2Questions),
        p1_answers: JSON.stringify([null, null, null, null, null]),
        p2_answers: JSON.stringify([null, null, null, null, null]),
        p1_played_dates: JSON.stringify([]),
        p2_played_dates: JSON.stringify([]),
        p1_score: 0,
        p2_score: 0,
        p1_claimed: false,
        p2_claimed: false,
      });
      created.push(record);
    }

    return Response.json({
      success: true,
      cycle_start_date: cycleStartDate,
      cycle_end_date: cycleEndDate,
      pairs_created: created.length,
      total_users_paired: created.length * 2,
      users_sitting_out: shuffledUsers.length % 2,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});