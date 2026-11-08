const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function assertValidTicketId(id: string) {
  const v = id.trim();
  if (!UUID.test(v)) throw new Error('Ticket ID must be a UUID.');
  return v.toLowerCase();
}
export function buildBranchName(id: string) {
  return `agent/ticket-${assertValidTicketId(id)}`;
}
