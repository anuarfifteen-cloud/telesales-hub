import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BRUNEI_TZ = "Asia/Brunei";

function getBruneiDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: BRUNEI_TZ });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { match_id, answer } = await req.json();
    if (!match_id || !answer) return Response.json({ error: "match_id and answer are required" }, { status: 400 });

    const match = await base44.asServiceRole.entities.DuoMatchCycle.get(match_id);
    if (!match) return Response.json({ error: "Match not found" }, { status: 404 });
    if (match.status !== "active") return Response.json({ error: "Match is not active" }, { status: 400 });

    const today = getBruneiDateString();
    const cycleStart = new Date(match.cycle_start_date + "T00:00:00+08:00");
    const todayDate = new Date(today + "T00:00:00+08:00");
    const dayIndex = Math.floor((todayDate - cycleStart) / (1000 * 60 * 60 * 24));

    if (dayIndex < 0 || dayIndex > 4) return Response.json({ error: "Outside cycle window" }, { status: 400 });

    const isP1 = match.p1_id === user.id;
    const isP2 = match.p2_id === user.id;
    if (!isP1 && !isP2) return Response.json({ error: "Not a participant in this match" }, { status: 403 });

    const playerPrefix = isP1 ? "p1" : "p2";
    const playedDates = JSON.parse(match[`${playerPrefix}_played_dates`] || "[]");

    if (playedDates.includes(today)) {
      return Response.json({ error: "Already answered today" }, { status: 400 });
    }

    // Get the question for today
    const questionIds = JSON.parse(match[`${playerPrefix}_question_ids`] || "[]");
    const todayQuestionId = questionIds[dayIndex];
    if (!todayQuestionId) return Response.json({ error: "No question assigned for today" }, { status: 400 });

    const question = await base44.asServiceRole.entities.QuizQuestion.get(todayQuestionId);
    if (!question) return Response.json({ error: "Question not found" }, { status: 404 });

    const isCorrect = answer === question.correct_option;

    // Update answers array
    const answers = JSON.parse(match[`${playerPrefix}_answers`] || "[null,null,null,null,null]");
    answers[dayIndex] = answer;

    const newPlayedDates = [...playedDates, today];
    const currentScore = match[`${playerPrefix}_score`] || 0;
    const newScore = isCorrect ? currentScore + 1 : currentScore;

    // Check if cycle is now complete (day 5 = index 4, both played all 5)
    const otherPrefix = isP1 ? "p2" : "p1";
    const otherPlayedDates = JSON.parse(match[`${otherPrefix}_played_dates`] || "[]");
    const thisTotalPlayed = newPlayedDates.length;
    const otherTotalPlayed = otherPlayedDates.length;

    const cycleComplete = thisTotalPlayed >= 5 && otherTotalPlayed >= 5;

    const updateData = {
      [`${playerPrefix}_answers`]: JSON.stringify(answers),
      [`${playerPrefix}_played_dates`]: JSON.stringify(newPlayedDates),
      [`${playerPrefix}_score`]: newScore,
    };

    if (cycleComplete) updateData.status = "completed";

    await base44.asServiceRole.entities.DuoMatchCycle.update(match_id, updateData);

    return Response.json({
      correct: isCorrect,
      correct_answer: question.correct_option,
      day_index: dayIndex,
      new_score: newScore,
      cycle_complete: cycleComplete,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});