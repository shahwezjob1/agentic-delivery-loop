const accountId = '';
const apiToken = '';
const indexName = 'adl-vector-db';
const ticketId = 'bfa723ea-fe2b-465a-8a5a-c03fa0e32b4b';
if (!accountId) {
  throw new Error('CLOUDFLARE_ACCOUNT_ID is not set.');
}
if (!apiToken) {
  throw new Error('CLOUDFLARE_API_TOKEN is not set.');
}
const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${indexName}/delete_by_ids`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ids: [ticketId],
    }),
  },
);
const result = await response.json();
if (!response.ok || result.success !== true) {
  console.error(JSON.stringify(result, null, 2));
  throw new Error(`Vector deletion failed with HTTP ${response.status}.`);
}
console.log(`Deletion submitted for vector: ${ticketId}`);
console.log(JSON.stringify(result, null, 2));
