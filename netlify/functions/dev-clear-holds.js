// DEV-ONLY. Wipes every hold currently in the local 'inventory-holds' Blobs
// store, so a leftover reservation from an earlier manual test (e.g. one
// created before the holderId reclaim logic existed) can't be mistaken for
// a live bug on your next test run.
//
// Refuses to run anywhere except under `netlify dev` — NETLIFY_DEV is only
// ever set by the Netlify CLI's local dev server, never in a real deploy —
// so this can never be triggered against your live site.
//
// Usage while testing locally:
//   curl -X POST http://localhost:8888/.netlify/functions/dev-clear-holds

import { connectLambda, getStore } from '@netlify/blobs';

export const handler = async (event) => {
  connectLambda(event);

  if (!process.env.NETLIFY_DEV) {
    return { statusCode: 403, body: 'This function only runs under `netlify dev`.' };
  }

  const store = getStore({ name: 'inventory-holds', consistency: 'eventual' });
  const { blobs } = await store.list();
  await Promise.all(blobs.map((b) => store.delete(b.key)));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cleared: blobs.map((b) => b.key) }),
  };
};
