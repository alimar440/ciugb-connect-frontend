import { StoreData, Order } from '../models/domain';
import { ACADEMIC_YEAR, EVENTS } from './catalog';

export function createDemoData(): StoreData {
  const order = (
    id: string,
    offer: 'ticket' | 'membership',
    firstName: string,
  ): Order => ({
    id,
    reference: `DEMO-${id}`,
    offer,
    createdAt: '2026-11-01T12:00:00Z',
    member: {
      firstName,
      lastName: 'Exemple',
      email: 'demo@example.com',
      phone: '770000000',
      studentNumber: '',
    },
    tickets:
      offer === 'ticket' ? [{ id: `demo-${id}`, eventId: 'cinema-72h' }] : [],
    membership:
      offer === 'membership'
        ? {
            id: `demo-${id}`,
            memberNumber: `CI-${id}`,
            membershipStartDate: ACADEMIC_YEAR.start,
            membershipEndDate: ACADEMIC_YEAR.end,
            membershipStatus: 'active',
          }
        : undefined,
    payment: {
      method: 'wave',
      amount: offer === 'ticket' ? 500 : 1000,
      status: 'simulated',
    },
    demo: true,
  });
  const expired = order('expired', 'membership', 'Membre expiré');
  expired.membership = {
    ...expired.membership!,
    membershipStartDate: '2025-10-01',
    membershipEndDate: '2026-07-31',
    membershipStatus: 'expired',
  };
  return {
    version: 1,
    events: EVENTS.map((event) => ({ ...event })),
    orders: [
      order('member', 'membership', 'Awa'),
      expired,
      order('ticket', 'ticket', 'Moussa'),
      order('used', 'ticket', 'Fatou'),
    ],
    checkIns: [
      {
        id: 'demo-entry',
        credentialId: 'demo-used',
        eventId: 'cinema-72h',
        checkedInAt: '2026-12-12T18:00:00Z',
      },
    ],
    popcornRedemptions: [],
  };
}
