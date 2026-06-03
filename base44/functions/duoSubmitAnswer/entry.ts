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

    const { score_id, answer, question_id } = await req.json();
    if (!score_id || !answer || !question_id) {
      return Response.json({ error: "score_id, answer, and question_id are required" }, { status: 400 });
    }

    // Fetch the score record and the question
    const [scoreRecord, question] = await Promise.all([
      base44.asServiceRole.entities.FiveDayScore.get(score_id),
      base44.asServiceRole.entities.QuizQuestion.get(question_id),
    ]);

    if (!scoreRecord) return Response.json({ error: "Score record not found" }, { status: 404 });
    if (!question) return Response.json({ error: "Question not found" }, { status: 404 });

    const today = getBruneiDateString();

    // Determine if user is p1 or p2 via DuoTeam
    const team = await base44.asServiceRole.entities.DuoTeam.get(scoreRecord.team_id);
    if (!team) return Response.json({ error: "Team not found" }, { status: 404 });

    const isP1 = team.player1_id === user.id;
    const isP2 = team.player2_id === user.id;
    if (!isP1 && !isP2) return Response.json({ error: "Not a participant in this team" }, { status: 403 });

    const playerPrefix = isP1 ? "p1" : "p2";
    const playedDates = JSON.parse(scoreRecord[`${playerPrefix}_played_dates`] || "[]");

    if (playedDates.includes(today)) {
      return Response.json({ error: "Already answered today" }, { status: 400 });
    }

    const isCorrect = answer === question.correct_option;
    const newPlayedDates = [...playedDates, today];
    const currentScore = scoreRecord[`${playerPrefix}_score`] || 0;
    const newScore = isCorrect ? currentScore + 1 : currentScore;

    await base44.asServiceRole.entities.FiveDayScore.update(score_id, {
      [`${playerPrefix}_played_dates`]: JSON.stringify(newPlayedDates),
      [`${playerPrefix}_score`]: newScore,
    });

    return Response.json({
      correct: isCorrect,
      correct_answer: question.correct_option,
      justification: question.justification || null,
      new_score: newScore,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});