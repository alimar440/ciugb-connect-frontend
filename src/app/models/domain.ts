export type Offer = 'ticket' | 'membership';
export type MembershipStatus = 'active' | 'expired' | 'pending' | 'suspended';
export interface Event {
  id: string;
  name: string;
  kind: 'cinema' | 'workshop';
  simulationDate: string;
  dateLabel: string;
  location: string;
  capacity: number;
  ticketPrice: number;
}
export interface Member {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  studentNumber: string;
}
export interface Membership {
  id: string;
  memberNumber: string;
  membershipStartDate: string;
  membershipEndDate: string;
  membershipStatus: MembershipStatus;
}
export interface Ticket {
  id: string;
  eventId: string;
}
export interface Payment {
  method: 'wave' | 'orange-money';
  amount: number;
  status: 'simulated';
}
export interface Order {
  id: string;
  reference: string;
  createdAt: string;
  offer: Offer;
  member: Member;
  tickets: Ticket[];
  membership?: Membership;
  payment: Payment;
  demo: boolean;
}
export interface CheckIn {
  id: string;
  credentialId: string;
  eventId: string;
  checkedInAt: string;
}
export interface PopcornRedemption {
  id: string;
  credentialId: string;
  eventId: string;
  redeemedAt: string;
}
export interface StoreData {
  version: 1;
  events: Event[];
  orders: Order[];
  checkIns: CheckIn[];
  popcornRedemptions: PopcornRedemption[];
}
export type AccessStatus =
  'valid-ticket' | 'valid-member' | 'unknown' | 'used' | 'denied';
export interface AccessResult {
  status: AccessStatus;
  title: string;
  detail: string;
  order?: Order;
  credentialId: string;
  popcornEligible: boolean;
  popcornRedeemed: boolean;
}
