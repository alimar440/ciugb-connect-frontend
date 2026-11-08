import { ClubStore } from './club-store.service';
import { EVENTS } from '../core/catalog';
import { Member } from '../models/domain';
const KEY = 'ciugb-connect-demo-v1';
const person: Member = {
  firstName: 'Awa',
  lastName: 'Test',
  email: 'awa@example.com',
  phone: '+221770000000',
  studentNumber: '',
};
describe('Local demo transactions', () => {
  let store: ClubStore;
  beforeEach(() => {
    localStorage.removeItem(KEY);
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-08T12:00:00Z'));
    store = new ClubStore();
  });
  afterEach(() => {
    localStorage.removeItem(KEY);
    jasmine.clock().uninstall();
  });
  it('issues one annual membership for 1000 FCFA with an opaque personal identifier', () => {
    const order = store.purchase('membership', 1, person, 'wave');
    expect(order.payment.amount).toBe(1000);
    expect(order.payment.status).toBe('simulated');
    expect(order.membership?.membershipStartDate).toBe('2026-11-08');
    expect(order.membership?.membershipEndDate).toBe('2027-07-31');
    expect(order.membership?.membershipStatus).toBe('active');
    expect(order.membership?.id).not.toContain('awa');
    expect(order.tickets.length).toBe(0);
  });
  it('rejects collective memberships and invalid ticket quantities', () => {
    expect(() =>
      store.purchase('membership', 2, person, 'wave'),
    ).toThrowError();
    for (const quantity of [0, -1, 1.5, 11, NaN])
      expect(() =>
        store.purchase('ticket', quantity, person, 'wave'),
      ).toThrowError();
  });
  it('generates a different QR identifier for every ticket and persists the purchase', () => {
    const order = store.purchase('ticket', 3, person, 'orange-money');
    expect(order.payment.amount).toBe(1500);
    expect(new Set(order.tickets.map((t) => t.id)).size).toBe(3);
    expect(new ClubStore().myOrders()[0].id).toBe(order.id);
  });
  it('rejects repeat entries without affecting popcorn', () => {
    store.checkIn('demo-member', EVENTS[0]);
    expect(() => store.checkIn('demo-member', EVENTS[0])).toThrowError();
    expect(store.data().popcornRedemptions.length).toBe(0);
    expect(store.verify('demo-member', EVENTS[0]).popcornEligible).toBeTrue();
    store.redeemPopcorn('demo-member', EVENTS[0]);
    expect(store.verify('demo-member', EVENTS[0]).popcornRedeemed).toBeTrue();
    expect(() => store.redeemPopcorn('demo-member', EVENTS[0])).toThrowError();
  });
  it('can distribute popcorn before entry, without consuming the entry', () => {
    store.redeemPopcorn('demo-member', EVENTS[0]);
    expect(store.verify('demo-member', EVENTS[0]).status).toBe('valid-member');
    store.checkIn('demo-member', EVENTS[0]);
    expect(store.data().popcornRedemptions.length).toBe(1);
  });
  it('allows the same membership to enter another event, but never after expiration', () => {
    store.checkIn('demo-member', EVENTS[0]);
    store.checkIn('demo-member', EVENTS[1]);
    expect(() => store.checkIn('demo-member', EVENTS[2])).toThrowError();
  });
  it('does not distribute popcorn for expired cards, tickets or workshops', () => {
    expect(() => store.redeemPopcorn('demo-expired', EVENTS[0])).toThrowError();
    expect(() => store.redeemPopcorn('demo-ticket', EVENTS[0])).toThrowError();
    expect(() => store.redeemPopcorn('demo-member', EVENTS[1])).toThrowError();
    expect(store.data().popcornRedemptions.length).toBe(0);
  });
  it('normalizes pasted identifiers before recording their consumption', () => {
    store.checkIn(' demo-member ', EVENTS[0]);
    expect(() => store.checkIn('demo-member', EVENTS[0])).toThrowError();
    store.redeemPopcorn(' demo-member ', EVENTS[0]);
    expect(() => store.redeemPopcorn('demo-member', EVENTS[0])).toThrowError();
  });
  it('resolves a typed ticket code to the same access as its QR', () => {
    expect(store.verify('t-demoticket', EVENTS[0]).credentialId).toBe('demo-ticket');
    store.checkIn('T-DEMOTICKET', EVENTS[0]);
    expect(store.verify('demo-ticket', EVENTS[0]).status).toBe('used');
    expect(() => store.checkIn('demo-ticket', EVENTS[0])).toThrowError();
  });
  it('uses the membership number for both entry and the independent popcorn withdrawal', () => {
    store.redeemPopcorn('ci-member', EVENTS[0]);
    expect(store.verify('demo-member', EVENTS[0]).popcornRedeemed).toBeTrue();
    expect(store.verify('CI-member', EVENTS[0]).status).toBe('valid-member');
    store.checkIn('CI-member', EVENTS[0]);
    expect(store.verify('demo-member', EVENTS[0]).status).toBe('used');
  });
  it('rejects ticket purchases beyond configured capacity', () => {
    store.updateEvent('cinema-72h', 2, EVENTS[0].simulationDate);
    expect(store.remaining()).toBe(0);
    expect(() => store.purchase('ticket', 1, person, 'wave')).toThrowError();
  });
  it('does not report success if local persistence fails', () => {
    spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
    expect(() => store.purchase('membership', 1, person, 'wave')).toThrowError(
      /stockage local/,
    );
    expect(store.myOrders().length).toBe(0);
  });
  it('recovers from invalid local JSON', () => {
    localStorage.setItem(KEY, '{broken');
    expect(new ClubStore().orders().length).toBe(4);
  });
});
