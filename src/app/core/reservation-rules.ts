import type { AccessResult, Reservation, ReservationInput } from '../models/domain.js';

export function validateReservation(input: ReservationInput): ReservationInput {
  const fullName =
    typeof input.fullName === 'string'
      ? input.fullName.trim().replace(/\s+/g, ' ')
      : '';
  const phone =
    typeof input.phone === 'string'
      ? input.phone.trim().replace(/[\s()-]/g, '')
      : '';
  if (fullName.length < 2 || fullName.length > 120)
    throw new Error('Renseignez un nom complet de 2 à 120 caractères.');
  if (!/^\+?\d{8,15}$/.test(phone))
    throw new Error('Renseignez un numéro de téléphone valide.');
  if (
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 10
  )
    throw new Error('Choisissez entre 1 et 10 places.');
  if (
    typeof input.requestId !== 'string' ||
    !/^[\da-f-]{36}$/i.test(input.requestId)
  )
    throw new Error('La demande est invalide. Rechargez la page.');
  return {
    fullName,
    phone,
    quantity: input.quantity,
    requestId: input.requestId,
  };
}

export function inspectAccess(
  reservations: Reservation[],
  code: string,
): AccessResult {
  const normalized = code.trim().toUpperCase();
  for (const reservation of reservations) {
    const ticket = reservation.tickets.find(
      (t) =>
        t.id.toUpperCase() === normalized ||
        t.code.toUpperCase() === normalized,
    );
    if (!ticket) continue;
    if (reservation.status !== 'validated')
      return {
        status: 'denied',
        title: 'Accès refusé',
        detail: 'Cette réservation n’est pas validée.',
      };
    return {
      status: ticket.checkedInAt ? 'used' : 'valid',
      title: ticket.checkedInAt ? 'Entrée déjà validée' : 'Billet valide',
      detail: ticket.checkedInAt
        ? 'Ce billet a déjà servi. Aucune nouvelle entrée autorisée.'
        : 'Paiement confirmé par l’organisateur. Une entrée autorisée.',
      fullName: reservation.fullName,
      ticketId: ticket.id,
      ticketCode: ticket.code,
    };
  }
  if (reservations.some((r) => r.reference.toUpperCase() === normalized))
    return {
      status: 'denied',
      title: 'Accès refusé',
      detail:
        'Le code de réservation sert à consulter le dossier. Présentez le QR ou le code du billet validé.',
    };
  return {
    status: 'unknown',
    title: 'Code inconnu',
    detail: 'Aucun billet ne correspond à ce code.',
  };
}
