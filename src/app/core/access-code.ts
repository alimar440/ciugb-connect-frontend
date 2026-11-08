/** Code de consultation lisible ; le QR conserve l’identifiant opaque complet. */
export function ticketAccessCode(id: string): string {
  return `T-${id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}
