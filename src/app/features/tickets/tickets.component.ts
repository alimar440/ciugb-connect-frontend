import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClubStore } from '../../services/club-store.service';
import { CredentialComponent } from '../../shared/credential.component';
import { IconComponent } from '../../shared/icon.component';
@Component({
  selector: 'app-tickets',
  imports: [RouterLink, CredentialComponent, IconComponent],
  template: ` <section class="section-shell page-intro">
      <p class="eyebrow">VOTRE ESPACE</p>
      <h1>Vos prochains<br /><span class="text-red">bons moments.</span></h1>
      <p>Billets et cartes de démonstration enregistrés sur ce navigateur.</p>
    </section>
    <section class="section-shell tickets-section">
      <div class="filter-tabs" role="group" aria-label="Filtrer mes achats">
        @for (filter of filters; track filter.value) {
          <button
            [class.active]="type() === filter.value"
            [attr.aria-pressed]="type() === filter.value"
            (click)="type.set(filter.value)"
          >
            {{ filter.label }}
          </button>
        }
      </div>
      @if (filtered().length) {
        <div class="credentials-list">
          @for (order of filtered(); track order.id) {
            <app-credential [order]="order" />
          }
        </div>
      } @else {
        <div class="empty-state">
          <span class="icon-box"><app-icon name="Ticket" [size]="34" /></span>
          <h2>
            {{
              store.myOrders().length
                ? 'Aucun achat dans cette catégorie.'
                : 'Votre prochaine sortie commence ici.'
            }}
          </h2>
          <p>
            Vos tickets et votre carte membre apparaîtront ici après un achat
            simulé.
          </p>
          <a class="button" routerLink="/commander"
            >Choisir ma formule <app-icon name="ArrowUpRight"
          /></a>
        </div>
      }
      <p class="small muted">
        Les données ne sont pas synchronisées entre appareils. Effacer les
        données du navigateur supprime les achats simulés. Aucun email n’est
        envoyé.
      </p>
    </section>`,
})
export class TicketsComponent {
  readonly store = inject(ClubStore);
  readonly type = signal('all');
  readonly filters = [
    { value: 'all', label: 'Tous mes achats' },
    { value: 'ticket', label: 'Tickets cinéma' },
    { value: 'membership', label: 'Cartes membres' },
  ];
  readonly filtered = computed(() =>
    this.store
      .myOrders()
      .filter((o) => this.type() === 'all' || o.offer === this.type()),
  );
}
