import { ClubStore } from './club-store.service';
import { ReservationInput } from '../models/domain';
describe('Reservation lifecycle in local demonstration', () => {
  let store: ClubStore;
  const input = (): ReservationInput => ({
    fullName: 'Awa Test',
    phone: '+221770000000',
    quantity: 2,
    requestId: crypto.randomUUID(),
  });
  beforeEach(async () => {
    localStorage.removeItem('ciugb-reservations-demo-v2');
    localStorage.removeItem('ciugb-reservation-references-v2');
    spyOn(window, 'fetch').and.rejectWith(new Error('Local demo'));
    store = new ClubStore();
    await store.initialize();
    // Autorisation explicite du contexte de test ; aucun accès auto dans l’interface.
    store.admin.set(true);
  });
  afterEach(() => {
    localStorage.removeItem('ciugb-reservations-demo-v2');
    localStorage.removeItem('ciugb-reservation-references-v2');
  });
  it('records a reservation without granting a ticket or QR', async () => {
    const r = await store.reserve(input());
    expect(r.status).toBe('pending_payment');
    expect(r.tickets).toEqual([]);
    expect(r.amount).toBe(1000);
    expect((await store.lookup(r.reference)).tickets).toEqual([]);
    await expectAsync(
      store.authorizedTicket(r.reference, 'forged'),
    ).toBeRejected();
  });
  it('never authenticates an organizer with a local demo password', async () => {
    store.admin.set(false);
    await expectAsync(store.login('anything')).toBeRejected();
    expect(store.admin()).toBeFalse();
    await expectAsync(store.updateReservation('demo-pending', 'validate')).toBeRejected();
  });
  it('unlocks two separate tickets after manual validation only', async () => {
    const r = await store.reserve(input());
    await store.updateReservation(r.id, 'contact');
    expect((await store.lookup(r.reference)).tickets.length).toBe(0);
    await store.updateReservation(r.id, 'validate');
    const paid = await store.lookup(r.reference);
    expect(paid.tickets.length).toBe(2);
    expect(paid.tickets[0].id).not.toBe(paid.tickets[1].id);
    expect(
      (await store.authorizedTicket(r.reference, paid.tickets[0].id)).ticket.id,
    ).toBe(paid.tickets[0].id);
  });
  it('does not duplicate a submitted reservation or a validation', async () => {
    const data = input();
    const r = await store.reserve(data);
    expect((await store.reserve(data)).id).toBe(r.id);
    await store.updateReservation(r.id, 'validate');
    const paid = await store.lookup(r.reference);
    await store.updateReservation(r.id, 'validate');
    expect((await store.lookup(r.reference)).tickets).toEqual(paid.tickets);
  });
  it('refuses a reservation code and blocks reused tickets', async () => {
    expect((await store.verify('DEMO-ATTENTE')).status).toBe('denied');
    await store.checkIn('B-DEMO-VALIDE');
    expect((await store.verify('demo-ticket')).status).toBe('used');
    await expectAsync(store.checkIn('demo-ticket')).toBeRejected();
  });
  it('revokes access and downloads after cancellation', async () => {
    const r = await store.reserve(input());
    await store.updateReservation(r.id, 'validate');
    const paid = await store.lookup(r.reference);
    await store.updateReservation(r.id, 'cancel');
    expect((await store.lookup(r.reference)).tickets).toEqual([]);
    await expectAsync(
      store.authorizedTicket(r.reference, paid.tickets[0].id),
    ).toBeRejected();
  });
  it('refuses invalid quantities and phone numbers', async () => {
    await expectAsync(
      store.reserve({ ...input(), quantity: 0 }),
    ).toBeRejected();
    await expectAsync(
      store.reserve({ ...input(), quantity: 1.5 }),
    ).toBeRejected();
    await expectAsync(
      store.reserve({ ...input(), phone: 'hello' }),
    ).toBeRejected();
  });
});
