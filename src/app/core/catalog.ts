import { Event } from '../models/domain';

// Hypothèse de démonstration, à remplacer par le calendrier officiel du club.
export const ACADEMIC_YEAR = {
  label: '2026–2027',
  start: '2026-10-01',
  end: '2027-07-31',
} as const;
export const MEMBERSHIP_PRICE = 1000;
export const CINEMA_EVENT_ID = 'cinema-72h';
export const MEMBERSHIP_BENEFITS = [
  'Accès gratuit à tous les événements du club pendant la validité de la carte',
  'Entrée gratuite à la soirée cinéma des 72h',
  'Un popcorn offert pendant cette soirée',
  'Carte membre numérique avec QR code personnel',
];
export const EVENTS: Event[] = [
  {
    id: 'cinema-72h',
    name: 'Soirée cinéma des 72h',
    kind: 'cinema',
    simulationDate: '2026-12-12',
    dateLabel: 'Date et horaire à confirmer',
    location: 'Campus UGB, Saint-Louis · salle à confirmer',
    capacity: 120,
    ticketPrice: 500,
  },
  {
    id: 'atelier-club',
    name: 'Atelier du Club Informatique',
    kind: 'workshop',
    simulationDate: '2027-03-20',
    dateLabel: 'Atelier fictif · pendant la validité',
    location: 'Campus UGB · lieu à confirmer',
    capacity: 80,
    ticketPrice: 500,
  },
  {
    id: 'rentrée-club',
    name: 'Rencontre de la prochaine rentrée',
    kind: 'workshop',
    simulationDate: '2027-10-12',
    dateLabel: 'Événement fictif · après expiration',
    location: 'Campus UGB · lieu à confirmer',
    capacity: 80,
    ticketPrice: 500,
  },
];
