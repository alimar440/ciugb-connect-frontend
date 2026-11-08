import { Injectable, computed, signal } from '@angular/core';
import {
  Event,
  Member,
  Offer,
  Order,
  Payment,
  StoreData,
} from '../models/domain';
import { ACADEMIC_YEAR, EVENTS, MEMBERSHIP_PRICE } from '../core/catalog';
import { createDemoData } from '../core/demo-data';
import { verifyAccess } from '../core/membership-rules';
import { ticketAccessCode } from '../core/access-code';

const STORAGE_KEY = 'ciugb-connect-demo-v1';
@Injectable({ providedIn: 'root' })
export class ClubStore {
  private readonly state = signal<StoreData>(this.load());
  readonly data = this.state.asReadonly();
  readonly orders = computed(() => this.state().orders);
  readonly events = computed(() => this.state().events);
  readonly myOrders = computed(() => this.orders().filter((o) => !o.demo));
  readonly toast = signal('');
  private toastTimer?: ReturnType<typeof setTimeout>;

  private load(): StoreData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const value: StoreData = JSON.parse(raw);
        if (
          value.version === 1 &&
          Array.isArray(value.events) &&
          value.events.length === 3 &&
          value.events.every(
            (e) =>
              e.id &&
              Number.isInteger(e.capacity) &&
              e.capacity > 0 &&
              /^\d{4}-\d{2}-\d{2}$/.test(e.simulationDate),
          ) &&
          Array.isArray(value.orders) &&
          Array.isArray(value.checkIns) &&
          Array.isArray(value.popcornRedemptions) &&
          value.orders.every(
            (o) =>
              o.id &&
              o.member?.firstName &&
              Array.isArray(o.tickets) &&
              o.payment?.status === 'simulated',
          )
        )
          return value;
      }
    } catch {
      /* Les données inutilisables sont remplacées par la démo. */
    }
    return createDemoData();
  }

  private save(next: StoreData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw new Error(
        'Le stockage local est indisponible ou plein. Autorisez-le pour conserver votre achat simulé.',
      );
    }
    this.state.set(next);
  }

  notify(message: string): void {
    clearTimeout(this.toastTimer);
    this.toast.set(message);
    this.toastTimer = setTimeout(() => this.toast.set(''), 6000);
  }

  remaining(eventId = EVENTS[0].id): number {
    const event = this.events().find((e) => e.id === eventId)!;
    const sold = this.orders().reduce(
      (n, o) => n + o.tickets.filter((t) => t.eventId === eventId).length,
      0,
    );
    return Math.max(0, event.capacity - sold);
  }

  purchase(
    offer: Offer,
    quantity: number,
    member: Member,
    method: Payment['method'],
  ): Order {
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10 ||
      (offer === 'membership' && quantity !== 1)
    )
      throw new Error(
        'Choisissez de 1 à 10 tickets, ou une seule adhésion individuelle.',
      );
    if (
      !member.firstName.trim() ||
      !member.lastName.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email) ||
      !/^[+\d\s()-]{8,20}$/.test(member.phone)
    )
      throw new Error('Vérifiez vos coordonnées avant de continuer.');
    if (offer === 'ticket' && quantity > this.remaining())
      throw new Error(
        'Il ne reste pas assez de places pour cette réservation.',
      );
    const day = new Date().toISOString().slice(0, 10);
    if (offer === 'membership' && day > ACADEMIC_YEAR.end)
      throw new Error('La campagne d’adhésion de cette année est terminée.');
    const id = crypto.randomUUID();
    const order: Order = {
      id,
      reference: `CI-${id.slice(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      offer,
      member,
      tickets:
        offer === 'ticket'
          ? Array.from({ length: quantity }, () => ({
              id: crypto.randomUUID(),
              eventId: EVENTS[0].id,
            }))
          : [],
      membership:
        offer === 'membership'
          ? {
              id: crypto.randomUUID(),
              memberNumber: `CI-${ACADEMIC_YEAR.label.slice(0, 4)}-${id.slice(0, 6).toUpperCase()}`,
              membershipStartDate:
                day > ACADEMIC_YEAR.start ? day : ACADEMIC_YEAR.start,
              membershipEndDate: ACADEMIC_YEAR.end,
              membershipStatus: 'active',
            }
          : undefined,
      payment: {
        method,
        amount:
          offer === 'membership'
            ? MEMBERSHIP_PRICE
            : EVENTS[0].ticketPrice * quantity,
        status: 'simulated',
      },
      demo: false,
    };
    this.save({ ...this.state(), orders: [order, ...this.orders()] });
    return order;
  }

  verify(id: string, event: Event) {
    const input = id.trim();
    const matches = new Set<string>();
    for (const order of this.orders()) {
      if (
        order.membership &&
        [order.membership.id, order.membership.memberNumber].some(
          (code) => code.toUpperCase() === input.toUpperCase(),
        )
      )
        matches.add(order.membership.id);
      for (const ticket of order.tickets)
        if (
          [ticket.id, ticketAccessCode(ticket.id)].some(
            (code) => code.toUpperCase() === input.toUpperCase(),
          )
        )
          matches.add(ticket.id);
    }
    // Un code ambigu n’autorise aucune entrée ; le QR complet reste utilisable.
    return verifyAccess(
      this.state(),
      matches.size === 1 ? [...matches][0] : '',
      event,
    );
  }

  updateEvent(id: string, capacity: number, simulationDate: string): void {
    if (
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 10000 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(simulationDate) ||
      !Number.isFinite(Date.parse(simulationDate))
    )
      throw new Error(
        'Renseignez une capacité de 1 à 10 000 et une date valide.',
      );
    const minimum = Math.max(
      this.orders().reduce(
        (n, o) => n + o.tickets.filter((t) => t.eventId === id).length,
        0,
      ),
      this.state().checkIns.filter((c) => c.eventId === id).length,
    );
    if (capacity < minimum)
      throw new Error(
        'La capacité doit couvrir les tickets déjà vendus et les entrées validées.',
      );
    this.save({
      ...this.state(),
      events: this.events().map((e) =>
        e.id === id ? { ...e, capacity, simulationDate } : e,
      ),
    });
    this.notify('Configuration de démonstration enregistrée.');
  }

  checkIn(id: string, event: Event): void {
    const result = this.verify(id, event);
    if (result.status !== 'valid-member' && result.status !== 'valid-ticket')
      throw new Error(result.title);
    if (
      this.state().checkIns.filter((c) => c.eventId === event.id).length >=
      event.capacity
    )
      throw new Error('Capacité de cet événement atteinte.');
    this.save({
      ...this.state(),
      checkIns: [
        ...this.state().checkIns,
        {
          id: crypto.randomUUID(),
          credentialId: result.credentialId,
          eventId: event.id,
          checkedInAt: new Date().toISOString(),
        },
      ],
    });
    this.notify('Entrée validée dans la démonstration.');
  }

  redeemPopcorn(id: string, event: Event): void {
    const result = this.verify(id, event);
    if (
      !result.popcornEligible ||
      result.popcornRedeemed ||
      result.status === 'denied' ||
      result.status === 'unknown'
    )
      throw new Error(
        'Ce QR code ne permet pas un nouveau retrait de popcorn.',
      );
    this.save({
      ...this.state(),
      popcornRedemptions: [
        ...this.state().popcornRedemptions,
        {
          id: crypto.randomUUID(),
          credentialId: result.credentialId,
          eventId: event.id,
          redeemedAt: new Date().toISOString(),
        },
      ],
    });
    this.notify('Popcorn distribué. Le statut de l’entrée reste indépendant.');
  }
}
