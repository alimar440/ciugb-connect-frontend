import { Injectable, computed, signal } from '@angular/core';
import {
  AccessResult,
  EventConfig,
  Reservation,
  ReservationInput,
  Ticket,
} from '../models/domain';
import { CINEMA } from '../core/catalog';
import { createDemoReservations } from '../core/demo-data';
import { inspectAccess, validateReservation } from '../core/reservation-rules';

const DEMO_KEY = 'ciugb-reservations-demo-v2';
const REFERENCES_KEY = 'ciugb-reservation-references-v2';
@Injectable({ providedIn: 'root' })
export class ClubStore {
  readonly mode = signal<'loading' | 'demo' | 'live' | 'unavailable'>(
    'loading',
  );
  readonly event = signal<EventConfig>({ ...CINEMA });
  readonly admin = signal(false);
  readonly orders = signal<Reservation[]>([]);
  readonly myOrders = signal<Reservation[]>([]);
  readonly toast = signal('');
  readonly startupError = signal('');
  private refs = this.readReferences();
  private initialization?: Promise<void>;
  private toastTimer?: ReturnType<typeof setTimeout>;
  private readonly demoRequests = new Map<string, string>();
  readonly remaining = computed(() =>
    this.mode() === 'demo'
      ? Math.max(
          0,
          this.event().capacity -
            this.orders()
              .filter((r) => r.status !== 'cancelled')
              .reduce((n, r) => n + r.quantity, 0),
        )
      : this.event().remaining,
  );

  initialize(): Promise<void> {
    return (this.initialization ??= this.start());
  }
  private async start(): Promise<void> {
    try {
      const config = await this.request<{
        configured: boolean;
        event: EventConfig;
      }>('/api/config');
      this.event.set(config.event);
      if (!config.configured)
        throw new Error(
          'Les réservations ne sont pas encore ouvertes. Réessayez plus tard ou contactez le club.',
        );
      this.mode.set('live');
      const session = await this.request<{ authenticated: boolean }>(
        '/api/admin-session',
      );
      this.admin.set(session.authenticated);
      await this.refreshMine();
    } catch (error) {
      if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
        this.mode.set('demo');
        this.admin.set(true);
        try {
          const stored = JSON.parse(localStorage.getItem(DEMO_KEY) ?? 'null');
          this.orders.set(
            this.validDemo(stored) ? stored : createDemoReservations(),
          );
        } catch {
          this.orders.set(createDemoReservations());
        }
        await this.refreshMine();
      } else {
        this.mode.set('unavailable');
        this.startupError.set(
          error instanceof Error
            ? error.message
            : 'Service momentanément indisponible.',
        );
      }
    }
  }
  private validDemo(value: unknown): value is Reservation[] {
    return (
      Array.isArray(value) &&
      value.every(
        (r) =>
          r &&
          typeof r.reference === 'string' &&
          typeof r.fullName === 'string' &&
          Array.isArray(r.tickets) &&
          ['pending_payment', 'validated', 'cancelled'].includes(r.status),
      )
    );
  }
  private readReferences(): string[] {
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem(REFERENCES_KEY) ?? '[]',
      );
      return Array.isArray(value)
        ? value.filter((r): r is string => typeof r === 'string').slice(0, 100)
        : [];
    } catch {
      return [];
    }
  }
  private remember(reference: string): void {
    this.refs = [...new Set([reference, ...this.refs])].slice(0, 100);
    try {
      localStorage.setItem(REFERENCES_KEY, JSON.stringify(this.refs));
    } catch {
      this.notify(
        'Conservez votre code de réservation : ce navigateur ne peut pas le mémoriser.',
      );
    }
  }
  private saveDemo(orders: Reservation[]): void {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(orders));
    } catch {
      throw new Error(
        'Stockage local indisponible. La démonstration ne peut pas enregistrer cette modification.',
      );
    }
    this.orders.set(orders);
  }
  private syncDemo(): void {
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem(DEMO_KEY) ?? 'null',
      );
      if (this.validDemo(value)) this.orders.set(value);
    } catch {
      /* Garder le dernier état valide. */
    }
  }
  private async request<T>(
    url: string,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
  ): Promise<T> {
    const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('application/json'))
      throw new Error('Service de réservation momentanément indisponible.');
    const value = await response.json();
    if (!response.ok) {
      if (response.status === 401) this.admin.set(false);
      throw new Error(
        typeof value.error === 'string'
          ? value.error
          : 'La demande a échoué. Réessayez.',
      );
    }
    return value as T;
  }
  notify(message: string): void {
    clearTimeout(this.toastTimer);
    this.toast.set(message);
    this.toastTimer = setTimeout(() => this.toast.set(''), 6000);
  }

  async reserve(raw: ReservationInput): Promise<Reservation> {
    await this.initialize();
    const input = validateReservation(raw);
    let reservation: Reservation;
    if (this.mode() === 'demo') {
      this.syncDemo();
      const prior = this.demoRequests.get(input.requestId);
      const existing = this.orders().find((r) => r.reference === prior);
      if (existing) return existing;
      if (input.quantity > this.remaining())
        throw new Error('Il ne reste pas assez de places.');
      reservation = {
        id: crypto.randomUUID(),
        reference: `R-${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`,
        fullName: input.fullName,
        phone: input.phone,
        quantity: input.quantity,
        amount: input.quantity * this.event().ticketPrice,
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
        validatedAt: null,
        contactedAt: null,
        tickets: [],
      };
      this.saveDemo([reservation, ...this.orders()]);
      this.demoRequests.set(input.requestId, reservation.reference);
    } else {
      if (this.mode() !== 'live')
        throw new Error(
          this.startupError() ||
            'Les réservations ne sont pas encore ouvertes.',
        );
      reservation = await this.request<Reservation>('/api/reservations', input);
    }
    this.remember(reservation.reference);
    await this.refreshMine();
    return reservation;
  }
  async lookup(reference: string, remember = true): Promise<Reservation> {
    await this.initializeIfNeeded();
    const code = reference.trim().toUpperCase();
    let reservation: Reservation;
    if (this.mode() === 'demo') {
      this.syncDemo();
      const found = this.orders().find(
        (r) => r.reference.toUpperCase() === code,
      );
      if (!found)
        throw new Error('Réservation introuvable. Vérifiez votre code.');
      reservation = structuredClone(found);
    } else {
      if (this.mode() !== 'live')
        throw new Error(this.startupError() || 'Service indisponible.');
      reservation = await this.request<Reservation>('/api/reservation', {
        reference: code,
      });
    }
    if (reservation.status !== 'validated')
      reservation = { ...reservation, tickets: [] };
    if (remember) this.remember(reservation.reference);
    return reservation;
  }
  private async initializeIfNeeded(): Promise<void> {
    if (this.mode() === 'loading') await this.initialize();
  }
  async refreshMine(): Promise<void> {
    if (this.mode() === 'demo') {
      this.syncDemo();
      this.myOrders.set(
        this.orders()
          .filter((r) => this.refs.includes(r.reference))
          .map((r) => (r.status === 'validated' ? r : { ...r, tickets: [] })),
      );
      return;
    }
    if (this.mode() !== 'live') return;
    const reservations: Reservation[] = [];
    for (const ref of this.refs) {
      try {
        reservations.push(await this.lookup(ref, false));
      } catch {
        /* Le code reste conservé pour une nouvelle tentative. */
      }
    }
    this.myOrders.set(reservations);
  }
  async login(password: string): Promise<void> {
    await this.initialize();
    if (this.mode() === 'demo') return;
    await this.request('/api/admin-session', { password });
    this.admin.set(true);
  }
  async logout(): Promise<void> {
    if (this.mode() === 'live')
      await this.request('/api/admin-session', {}, 'DELETE');
    this.admin.set(false);
    this.orders.set([]);
  }
  async loadAdmin(): Promise<void> {
    await this.initialize();
    if (!this.admin()) return;
    if (this.mode() === 'demo') {
      this.syncDemo();
      return;
    }
    this.orders.set(
      await this.request<Reservation[]>('/api/admin-reservations'),
    );
  }
  async updateReservation(
    id: string,
    action: 'contact' | 'validate' | 'cancel',
  ): Promise<void> {
    if (!this.admin())
      throw new Error('Connectez-vous à l’espace organisateur.');
    if (this.mode() === 'demo') {
      this.syncDemo();
      const reservation = this.orders().find((r) => r.id === id);
      if (!reservation) throw new Error('Réservation introuvable.');
      if (action === 'validate' && reservation.status === 'cancelled')
        throw new Error('Une réservation annulée ne peut plus être validée.');
      if (action === 'validate' && reservation.status === 'validated') return;
      if (action === 'cancel' && reservation.tickets.some((t) => t.checkedInAt))
        throw new Error('Un billet déjà utilisé ne peut pas être annulé.');
      const now = new Date().toISOString();
      const next =
        action === 'contact'
          ? { ...reservation, contactedAt: now }
          : action === 'cancel'
            ? { ...reservation, status: 'cancelled' as const, tickets: [] }
            : {
                ...reservation,
                status: 'validated' as const,
                validatedAt: now,
                tickets: Array.from({ length: reservation.quantity }, () => {
                  const id = crypto.randomUUID();
                  return {
                    id,
                    code: `B-${id.replace(/-/g, '').slice(0, 12).toUpperCase()}`,
                    checkedInAt: null,
                  };
                }),
              };
      this.saveDemo(this.orders().map((r) => (r.id === id ? next : r)));
    } else await this.request('/api/admin-reservation', { id, action });
    await this.loadAdmin();
    await this.refreshMine();
    this.notify(
      action === 'validate'
        ? 'Paiement confirmé. Le billet peut maintenant être consulté et téléchargé.'
        : action === 'contact'
          ? 'Contact enregistré.'
          : 'Réservation annulée.',
    );
  }
  async verify(code: string): Promise<AccessResult> {
    await this.initialize();
    if (!this.admin())
      throw new Error('Connectez-vous pour contrôler les billets.');
    if (this.mode() === 'demo') {
      this.syncDemo();
      return inspectAccess(this.orders(), code);
    }
    return this.request<AccessResult>('/api/admin-scan', {
      code,
      confirm: false,
    });
  }
  async checkIn(code: string): Promise<AccessResult> {
    if (this.mode() === 'demo') {
      const result = await this.verify(code);
      if (result.status !== 'valid') throw new Error(result.title);
      this.saveDemo(
        this.orders().map((r) => ({
          ...r,
          tickets: r.tickets.map((t) =>
            t.id === result.ticketId
              ? { ...t, checkedInAt: new Date().toISOString() }
              : t,
          ),
        })),
      );
      return this.verify(code);
    }
    const result = await this.request<AccessResult>('/api/admin-scan', {
      code,
      confirm: true,
    });
    await this.loadAdmin();
    return result;
  }
  async authorizedTicket(
    reference: string,
    ticketId: string,
  ): Promise<{ reservation: Reservation; ticket: Ticket }> {
    const reservation = await this.lookup(reference, false);
    const ticket = reservation.tickets.find((t) => t.id === ticketId);
    if (reservation.status !== 'validated' || !ticket)
      throw new Error(
        'Le billet sera disponible après confirmation du paiement par le club.',
      );
    return { reservation, ticket };
  }
}
