export function logWingmanEvent(event: string, details: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ component: 'wingman-agent', event, ...details }));
}
