import { createDemoData } from './demo-data';
import { membershipStatusAt, verifyAccess } from './membership-rules';
import { EVENTS } from './catalog';

describe('Annual membership access rules', () => {
  const member = createDemoData().orders[0].membership!;
  it('includes the first and last day of validity', () => {
    expect(membershipStatusAt(member, '2026-10-01')).toBe('active');
    expect(membershipStatusAt(member, '2027-07-31T23:59:59Z')).toBe('active');
  });
  it('refuses the day before the start and the day after the end', () => {
    expect(membershipStatusAt(member, '2026-09-30')).toBe('pending');
    expect(membershipStatusAt(member, '2027-08-01')).toBe('expired');
  });
  it('never reactivates an explicitly expired or suspended membership', () => {
    expect(
      membershipStatusAt(
        { ...member, membershipStatus: 'expired' },
        '2026-12-12',
      ),
    ).toBe('expired');
    expect(
      membershipStatusAt(
        { ...member, membershipStatus: 'suspended' },
        '2026-12-12',
      ),
    ).toBe('suspended');
  });
  it('rejects an invalid control date', () =>
    expect(membershipStatusAt(member, 'invalid')).toBe('expired'));
  it('checks expiry against each event, rather than the purchase date', () => {
    const data = createDemoData();
    expect(verifyAccess(data, 'demo-member', EVENTS[0]).status).toBe(
      'valid-member',
    );
    expect(verifyAccess(data, 'demo-member', EVENTS[1]).status).toBe(
      'valid-member',
    );
    expect(verifyAccess(data, 'demo-member', EVENTS[2]).status).toBe('denied');
    expect(
      verifyAccess(data, 'demo-member', EVENTS[2]).popcornEligible,
    ).toBeFalse();
  });
  it('does not offer popcorn at a non-cinema event', () => {
    expect(
      verifyAccess(createDemoData(), 'demo-member', EVENTS[1]).popcornEligible,
    ).toBeFalse();
  });
  it('reserves the free popcorn for the cinema evening of the 72h', () => {
    expect(
      verifyAccess(createDemoData(), 'demo-member', {
        ...EVENTS[0],
        id: 'other-cinema',
      }).popcornEligible,
    ).toBeFalse();
  });
  it('refuses expired cards and tickets for another event', () => {
    expect(
      verifyAccess(createDemoData(), 'demo-expired', EVENTS[0]).status,
    ).toBe('denied');
    expect(
      verifyAccess(createDemoData(), 'demo-ticket', EVENTS[1]).status,
    ).toBe('denied');
  });
  it('distinguishes unknown codes and already used tickets', () => {
    expect(verifyAccess(createDemoData(), 'unknown', EVENTS[0]).status).toBe(
      'unknown',
    );
    expect(verifyAccess(createDemoData(), 'demo-used', EVENTS[0]).status).toBe(
      'used',
    );
  });
});
