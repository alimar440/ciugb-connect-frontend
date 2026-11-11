import { EventConfig } from '../models/domain';
export const CINEMA: EventConfig = {
  name: 'Soirée cinéma des 72h',
  dateLabel: '29 novembre · 21h30',
  location: 'UGB 2 · Université Gaston Berger',
  ticketPrice: 500,
  capacity: 120,
  remaining: 120,
};
export const STATUS_LABELS = {
  pending_payment: 'En attente de paiement',
  validated: 'Billet validé',
  cancelled: 'Réservation annulée',
} as const;
