import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClubStore } from '../../services/club-store.service';
import { IconComponent } from '../../shared/icon.component';
import { Event, Order } from '../../models/domain';
import { membershipStatusAt } from '../../core/membership-rules';
import { CINEMA_EVENT_ID } from '../../core/catalog';
@Component({
  selector: 'app-admin',
  imports: [FormsModule, DatePipe, DecimalPipe, RouterLink, IconComponent],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  readonly store = inject(ClubStore);
  readonly event = computed(() =>
    this.store.events().find((e) => e.id === CINEMA_EVENT_ID)!,
  );
  readonly orders = computed(() =>
    this.store
      .orders()
      .filter(
        (o) =>
          o.membership || o.tickets.some((t) => t.eventId === CINEMA_EVENT_ID),
      ),
  );
  readonly search = signal('');
  readonly type = signal('all');
  readonly status = signal('all');
  readonly editing = signal('');
  readonly error = signal('');
  capacity = 120;
  simulationDate = '';
  readonly stats = computed(() => {
    const data = this.store.data();
    return [
      {
        label: 'Tickets cinéma',
        value: this.orders().reduce(
          (n, o) =>
            n + o.tickets.filter((t) => t.eventId === CINEMA_EVENT_ID).length,
          0,
        ),
        suffix: 'vendus dans la démo',
        icon: 'Ticket' as const,
      },
      {
        label: 'Cartes membres',
        value: this.orders().filter((o) => o.offer === 'membership').length,
        suffix: 'adhésions de démo',
        icon: 'CreditCard' as const,
      },
      {
        label: 'Recettes simulées',
        value: this.orders().reduce(
          (n, o) =>
            n +
            (o.membership
              ? o.payment.amount
              : o.tickets.filter((t) => t.eventId === CINEMA_EVENT_ID).length *
                this.event().ticketPrice),
          0,
        ),
        suffix: 'FCFA · aucun débit réel',
        icon: 'Terminal' as const,
      },
      {
        label: 'Entrées validées',
        value: data.checkIns.filter((c) => c.eventId === CINEMA_EVENT_ID)
          .length,
        suffix: 'soirée cinéma des 72h',
        icon: 'Users' as const,
      },
      {
        label: 'Popcorns distribués',
        value: data.popcornRedemptions.filter(
          (p) => p.eventId === CINEMA_EVENT_ID,
        ).length,
        suffix: 'retraits indépendants',
        icon: 'Popcorn' as const,
      },
    ];
  });
  readonly filtered = computed(() =>
    this.orders().filter(
      (o) =>
        (this.type() === 'all' || o.offer === this.type()) &&
        (!this.search() ||
          o.reference
            .toLowerCase()
            .includes(this.search().toLowerCase().trim())) &&
        (this.status() === 'all' || this.orderStatus(o) === this.status()),
    ),
  );
  orderStatus(order: Order): string {
    if (order.membership)
      return membershipStatusAt(order.membership, this.event().simulationDate);
    return order.tickets
      .filter((t) => t.eventId === CINEMA_EVENT_ID)
      .every((t) =>
        this.store
          .data()
          .checkIns.some(
            (c) => c.credentialId === t.id && c.eventId === CINEMA_EVENT_ID,
          ),
      )
      ? 'used'
      : 'available';
  }
  statusLabel(order: Order): string {
    return (
      {
        active: 'Carte active',
        expired: 'Carte expirée',
        pending: 'À venir',
        suspended: 'Suspendue',
        used: 'Tickets utilisés',
        available: 'Tickets disponibles',
      } as Record<string, string>
    )[this.orderStatus(order)];
  }
  edit(event: Event): void {
    this.editing.set(event.id);
    this.capacity = event.capacity;
    this.simulationDate = event.simulationDate;
    this.error.set('');
  }
  save(): void {
    try {
      this.store.updateEvent(
        this.editing(),
        Number(this.capacity),
        this.simulationDate,
      );
      this.editing.set('');
      this.error.set('');
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Enregistrement impossible.',
      );
    }
  }
}
