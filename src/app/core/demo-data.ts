import { Reservation } from '../models/domain';
export function createDemoReservations(): Reservation[] {
  return [
    {
      id: 'demo-pending',
      reference: 'DEMO-ATTENTE',
      fullName: 'Awa Exemple',
      phone: '+221770000001',
      quantity: 1,
      amount: 500,
      status: 'pending_payment',
      createdAt: '2026-11-09T10:00:00Z',
      validatedAt: null,
      contactedAt: null,
      tickets: [],
    },
    {
      id: 'demo-paid',
      reference: 'DEMO-VALIDE',
      fullName: 'Moussa Exemple',
      phone: '+221770000002',
      quantity: 1,
      amount: 500,
      status: 'validated',
      createdAt: '2026-11-09T10:00:00Z',
      validatedAt: '2026-11-09T11:00:00Z',
      contactedAt: '2026-11-09T10:30:00Z',
      tickets: [
        { id: 'demo-ticket', code: 'B-DEMO-VALIDE', checkedInAt: null },
      ],
    },
    {
      id: 'demo-used',
      reference: 'DEMO-UTILISE',
      fullName: 'Fatou Exemple',
      phone: '+221770000003',
      quantity: 1,
      amount: 500,
      status: 'validated',
      createdAt: '2026-11-09T10:00:00Z',
      validatedAt: '2026-11-09T11:00:00Z',
      contactedAt: '2026-11-09T10:30:00Z',
      tickets: [
        {
          id: 'demo-used-ticket',
          code: 'B-DEMO-UTILISE',
          checkedInAt: '2026-11-09T12:00:00Z',
        },
      ],
    },
  ];
}
