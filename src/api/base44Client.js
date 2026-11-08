import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { guardEntityReads } from '@/lib/readGuard';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Shared list/filter calls and a single retry on the rate limit keep bursts of
// identical reads from this app's many screens under the platform's read quota.
export const base44 = guardEntityReads(client);