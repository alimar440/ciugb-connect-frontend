export type ReservationStatus = 'pending_payment' | 'validated' | 'cancelled';
export interface Ticket {
  id: string;
  code: string;
  checkedInAt: string | null;
}
export interface Reservation {
  id: string;
  reference: string;
  fullName: string;
  phone: string;
  quantity: number;
  amount: number;
  status: ReservationStatus;
  createdAt: string;
  validatedAt: string | null;
  contactedAt: string | null;
  tickets: Ticket[];
}
export interface ReservationInput {
  fullName: string;
  phone: string;
  quantity: number;
  requestId: string;
}
export interface AccessResult {
  status: 'valid' | 'used' | 'denied' | 'unknown';
  title: string;
  detail: string;
  fullName?: string;
  ticketCode?: string;
  ticketId?: string;
}
export interface EventConfig {
  name: string;
  dateLabel: string;
  location: string;
  ticketPrice: number;
  capacity: number;
  remaining: number;
}
