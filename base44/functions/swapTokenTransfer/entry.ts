import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requester_id, token_offer } = await req.json();

    if (!requester_id || !token_offer || token_offer <= 0) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Use service role to fetch fresh balances and update both users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userA = allUsers.find((u) => u.id === requester_id);
    const userB = allUsers.find((u) => u.id === user.id);

    if (!userA) {
      return Response.json({ error: 'Requester not found' }, { status: 404 });
    }

    const newBalanceA = Math.max(0, (userA.earlyAccessTokens ?? 0) - token_offer);
    const newBalanceB = (userB?.earlyAccessTokens ?? 0) + token_offer;

    // Update both balances using service role
    await Promise.all([
      base44.asServiceRole.entities.User.update(userA.id, { earlyAccessTokens: newBalanceA }),
      base44.asServiceRole.entities.User.update(user.id, { earlyAccessTokens: newBalanceB }),
    ]);

    return Response.json({ success: true, newBalanceA, newBalanceB });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});