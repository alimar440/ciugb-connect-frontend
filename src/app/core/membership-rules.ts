import {
  AccessResult,
  Event,
  Membership,
  MembershipStatus,
  StoreData,
} from '../models/domain';
import { CINEMA_EVENT_ID } from './catalog';

export function membershipStatusAt(
  membership: Membership,
  date: string,
): MembershipStatus {
  if (membership.membershipStatus === 'suspended') return 'suspended';
  const day = date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)))
    return 'expired';
  if (
    membership.membershipStatus === 'expired' ||
    day > membership.membershipEndDate
  )
    return 'expired';
  if (
    membership.membershipStatus === 'pending' ||
    day < membership.membershipStartDate
  )
    return 'pending';
  return 'active';
}

export function verifyAccess(
  data: StoreData,
  credentialId: string,
  event: Event,
): AccessResult {
  const order = data.orders.find(
    (o) =>
      o.membership?.id === credentialId ||
      o.tickets.some((t) => t.id === credentialId),
  );
  const base = { credentialId, popcornEligible: false, popcornRedeemed: false };
  if (!order)
    return {
      ...base,
      status: 'unknown',
      title: 'QR code inconnu',
      detail: 'Aucun achat local ne correspond à cet identifiant.',
    };
  const member = order.membership;
  if (member && membershipStatusAt(member, event.simulationDate) !== 'active') {
    return {
      ...base,
      order,
      status: 'denied',
      title: 'Accès refusé',
      detail:
        'Carte expirée, suspendue ou hors période de validité à la date de cet événement. L’entrée gratuite et le popcorn ne sont pas disponibles.',
    };
  }
  if (
    !member &&
    !order.tickets.some((t) => t.id === credentialId && t.eventId === event.id)
  ) {
    return {
      ...base,
      order,
      status: 'denied',
      title: 'Accès refusé',
      detail: 'Ce ticket est réservé à un autre événement.',
    };
  }
  const redeemed = data.popcornRedemptions.some(
    (p) => p.credentialId === credentialId && p.eventId === event.id,
  );
  const popcornEligible =
    !!member && event.kind === 'cinema' && event.id === CINEMA_EVENT_ID;
  if (
    data.checkIns.some(
      (c) => c.credentialId === credentialId && c.eventId === event.id,
    )
  ) {
    return {
      ...base,
      order,
      popcornEligible,
      popcornRedeemed: redeemed,
      status: 'used',
      title: 'Entrée déjà validée',
      detail:
        'Cet accès a déjà été utilisé pour cet événement. Le retrait du popcorn reste suivi séparément.',
    };
  }
  return {
    ...base,
    order,
    popcornEligible,
    popcornRedeemed: redeemed,
    status: member ? 'valid-member' : 'valid-ticket',
    title: member ? 'Carte membre valide' : 'Ticket valide',
    detail: member
      ? 'Adhésion valable à la date de cet événement. Entrée gratuite autorisée.'
      : 'Ce ticket permet une entrée à la soirée cinéma.',
  };
}
