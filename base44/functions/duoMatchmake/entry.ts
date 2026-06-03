import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BRUNEI_TZ = "Asia/Brunei";

function getBruneiDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00+08:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const today = getBruneiDateString();

    // Check if user is already in an active or waiting match
    const existingAsP1 = await base44.asServiceRole.entities.DuoMatchCycle.filter({
      p1_id: user.id,
      status: "active"
    });
    const existingAsP2 = await base44.asServiceRole.entities.DuoMatchCycle.filter({
      p2_id: user.id,
      status: "active"
    });
    const waitingAsP1 = await base44.asServiceRole.entities.DuoMatchCycle.filter({
      p1_id: user.id,
      status: "waiting"
    });

    if (existingAsP1.length > 0) {
      return Response.json({ status: "already_matched", match: existingAsP1[0] });
    }
    if (existingAsP2.length > 0) {
      return Response.json({ status: "already_matched", match: existingAsP2[0] });
    }
    if (waitingAsP1.length > 0) {
      return Response.json({ status: "waiting", match: waitingAsP1[0] });
    }

    // Look for someone else waiting
    const allWaiting = await base44.asServiceRole.entities.DuoMatchCycle.filter({
      status: "waiting"
    });

    // Filter out any waiting entry created by this user (shouldn't exist, but safety check)
    const openWaiting = allWaiting.filter(w => w.p1_id !== user.id);

    if (openWaiting.length > 0) {
      // Match with the earliest waiting player
      const partner = openWaiting[0];

      // Fetch active question pool
      const questions = await base44.asServiceRole.entities.QuizQuestion.filter({ is_active: true });
      if (questions.length < 10) {
        return Response.json({ error: "Not enough quiz questions available. Need at least 10 active questions." }, { status: 400 });
      }

      // Shuffle and pick 10 distinct questions (5 for each player)
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      const p1Questions = shuffled.slice(0, 5).map(q => q.id);
      const p2Questions = shuffled.slice(5, 10).map(q => q.id);

      const cycleEndDate = addDays(today, 4); // 5 days inclusive

      const updatedMatch = await base44.asServiceRole.entities.DuoMatchCycle.update(partner.id, {
        p2_id: user.id,
        p2_email: user.email,
        p2_name: user.full_name || user.email.split("@")[0],
        status: "active",
        cycle_start_date: today,
        cycle_end_date: cycleEndDate,
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

      return Response.json({ status: "matched", match: updatedMatch });
    } else {
      // Join the waiting queue
      const newWaiting = await base44.asServiceRole.entities.DuoMatchCycle.create({
        p1_id: user.id,
        p1_email: user.email,
        p1_name: user.full_name || user.email.split("@")[0],
        status: "waiting",
        cycle_start_date: today,
      });
      return Response.json({ status: "waiting", match: newWaiting });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});