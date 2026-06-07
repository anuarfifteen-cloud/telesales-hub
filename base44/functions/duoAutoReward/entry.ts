import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const scoreRecord = body.data;
    if (!scoreRecord) {
      return Response.json({ skipped: "no data" });
    }

    const p1Score = scoreRecord.p1_score || 0;
    const p2Score = scoreRecord.p2_score || 0;
    const teamScore = p1Score + p2Score;

    // Determine token award based on team score
    let tokensToAward = 0;
    if (teamScore >= 10) {
      tokensToAward = 2;
    } else if (teamScore >= 5) {
      tokensToAward = 1;
    } else {
      return Response.json({ skipped: "team score below threshold", teamScore });
    }

    // Find the team to get player IDs
    const teams = await base44.asServiceRole.entities.DuoTeam.filter({ id: scoreRecord.team_id });
    if (!teams.length) {
      return Response.json({ error: "team not found" }, { status: 404 });
    }
    const team = teams[0];

    const results = [];

    // Award P1 if not yet claimed
    if (!scoreRecord.p1_claimed && team.player1_id) {
      const users = await base44.asServiceRole.entities.User.filter({ id: team.player1_id });
      if (users.length) {
        const u = users[0];
        await base44.asServiceRole.entities.User.update(u.id, {
          earlyAccessTokens: (u.earlyAccessTokens || 0) + tokensToAward,
        });
        await base44.asServiceRole.entities.FiveDayScore.update(scoreRecord.id, {
          p1_claimed: true,
        });
        results.push(`P1 (${u.full_name}) awarded ${tokensToAward} token(s)`);
      }
    }

    // Award P2 if not yet claimed
    if (!scoreRecord.p2_claimed && team.player2_id) {
      const users = await base44.asServiceRole.entities.User.filter({ id: team.player2_id });
      if (users.length) {
        const u = users[0];
        await base44.asServiceRole.entities.User.update(u.id, {
          earlyAccessTokens: (u.earlyAccessTokens || 0) + tokensToAward,
        });
        await base44.asServiceRole.entities.FiveDayScore.update(scoreRecord.id, {
          p2_claimed: true,
        });
        results.push(`P2 (${u.full_name}) awarded ${tokensToAward} token(s)`);
      }
    }

    return Response.json({ success: true, teamScore, tokensToAward, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});