import { EventConfig } from '../models/domain';
export const CINEMA: EventConfig = {
  name: 'Soirée thriller des 72h',
  dateLabel: 'Date et horaire à confirmer',
  location: 'Campus UGB, Saint-Louis · salle à confirmer',
  ticketPrice: 500,
  capacity: 120,
  remaining: 120,
};
export const STATUS_LABELS = {
  pending_payment: 'En attente de paiement',
  validated: 'Billet validé',
  cancelled: 'Réservation annulée',
} as const;
