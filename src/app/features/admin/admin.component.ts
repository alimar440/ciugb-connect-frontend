import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClubStore } from '../../services/club-store.service';
import { IconComponent } from '../../shared/icon.component';
import { AdminGateComponent } from '../../shared/admin-gate.component';
import { Reservation } from '../../models/domain';
import { STATUS_LABELS } from '../../core/catalog';
@Component({
  selector: 'app-admin',
  imports: [
    FormsModule,
    DatePipe,
    DecimalPipe,
    RouterLink,
    IconComponent,
    AdminGateComponent,
  ],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  readonly store = inject(ClubStore);
  readonly labels = STATUS_LABELS;
  readonly status = signal('all');
  readonly search = signal('');
  readonly error = signal('');
  readonly loading = signal(false);
  readonly busy = signal('');
  readonly confirmation = signal<Reservation | null>(null);
  readonly filtered = computed(() =>
    this.store
      .orders()
      .filter(
        (r) =>
          (this.status() === 'all' || r.status === this.status()) &&
          `${r.fullName} ${r.phone} ${r.reference}`
            .toLocaleLowerCase()
            .includes(this.search().trim().toLocaleLowerCase()),
      ),
  );
  readonly stats = computed(() => [
    {
      label: 'À contacter / régler',
      value: this.store.orders().filter((r) => r.status === 'pending_payment')
        .length,
      suffix: 'réservations en attente',
      icon: 'CalendarDays' as const,
    },
    {
      label: 'Billets validés',
      value: this.store
        .orders()
        .filter((r) => r.status === 'validated')
        .reduce((n, r) => n + r.quantity, 0),
      suffix: 'après confirmation du paiement',
      icon: 'Ticket' as const,
    },
    {
      label: 'Paiements confirmés',
      value: this.store
        .orders()
        .filter((r) => r.status === 'validated')
        .reduce((n, r) => n + r.amount, 0),
      suffix: 'FCFA · reçus par le club',
      icon: 'Check' as const,
    },
    {
      label: 'Entrées validées',
      value: this.store
        .orders()
        .reduce((n, r) => n + r.tickets.filter((t) => t.checkedInAt).length, 0),
      suffix: 'soirée des 72h',
      icon: 'Users' as const,
    },
  ]);
  constructor() {
    effect(() => {
      if (this.store.admin()) void this.load();
    });
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.store.loadAdmin();
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Chargement impossible.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  async action(
    reservation: Reservation,
    action: 'contact' | 'validate' | 'cancel',
  ): Promise<void> {
    if (this.busy()) return;
    this.busy.set(reservation.id);
    this.error.set('');
    try {
      await this.store.updateReservation(reservation.id, action);
      this.confirmation.set(null);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Modification impossible.',
      );
    } finally {
      this.busy.set('');
    }
  }
  whatsapp(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return `https://wa.me/${digits.length === 9 ? '221' + digits : digits}`;
  }
  async logout(): Promise<void> {
    try {
      await this.store.logout();
    } catch {
      this.error.set('Déconnexion impossible. Réessayez.');
    }
  }
}
