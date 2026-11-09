import {
  Component,
  HostListener,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClubStore } from '../../services/club-store.service';
import { CredentialComponent } from '../../shared/credential.component';
import { IconComponent } from '../../shared/icon.component';
@Component({
  selector: 'app-tickets',
  imports: [RouterLink, FormsModule, CredentialComponent, IconComponent],
  template: `
    <section class="section-shell page-intro">
      <p class="eyebrow">VOTRE ESPACE</p>
      <h1>La suite de<br /><span class="text-red">votre réservation.</span></h1>
      <p>
        Le club confirme votre paiement, puis votre billet devient disponible
        ici.
      </p>
    </section>
    <section class="section-shell tickets-section">
      <form class="panel lookup-form" (ngSubmit)="lookup()">
        <div>
          <label for="booking-code"
            >Retrouver une réservation avec son code</label
          ><input
            id="booking-code"
            name="reference"
            [(ngModel)]="reference"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            placeholder="R-…"
            required
          />
        </div>
        <button class="button" type="submit" [disabled]="busy()">
          {{ busy() ? 'Recherche…' : 'Consulter'
          }}<app-icon name="Search" [size]="18" />
        </button>
      </form>
      @if (error()) {
        <p class="error-banner" role="alert">{{ error() }}</p>
      }
      <div class="section-heading">
        <h2 class="small-heading">Mes réservations</h2>
        <button class="text-link" (click)="refresh()" [disabled]="busy()">
          Actualiser le statut <app-icon name="ArrowRight" [size]="17" />
        </button>
      </div>
      @if (loading()) {
        <div class="panel" role="status">Chargement de vos réservations…</div>
      } @else if (store.myOrders().length) {
        <div class="reservation-list">
          @for (reservation of store.myOrders(); track reservation.id) {
            <app-credential [reservation]="reservation" />
          }
        </div>
      } @else {
        <div class="empty-state">
          <app-icon name="Ticket" [size]="44" />
          <h2>Le prochain frisson vous attend.</h2>
          <p>
            Réservez une place ou retrouvez votre dossier avec le code reçu à la
            réservation.
          </p>
          <a routerLink="/commander" class="button"
            >Réserver ma place <app-icon name="ArrowUpRight"
          /></a>
        </div>
      }
      <p class="small muted">
        Le code de réservation permet de retrouver votre dossier sur un autre
        appareil. Conservez-le et ne le partagez pas publiquement. Aucun email
        n’est demandé.
      </p>
    </section>
  `,
})
export class TicketsComponent implements OnDestroy {
  readonly store = inject(ClubStore);
  reference = '';
  readonly error = signal('');
  readonly busy = signal(false);
  readonly loading = signal(true);
  private timer = setInterval(() => {
    if (!document.hidden) void this.refresh(false);
  }, 20000);
  constructor() {
    void this.refresh();
  }
  async refresh(showLoading = true): Promise<void> {
    if (showLoading) this.busy.set(true);
    try {
      await this.store.initialize();
      await this.store.refreshMine();
    } catch {
      this.error.set('Impossible d’actualiser. Réessayez.');
    } finally {
      this.loading.set(false);
      this.busy.set(false);
    }
  }
  async lookup(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.store.lookup(this.reference);
      await this.store.refreshMine();
      this.reference = '';
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Réservation introuvable.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  @HostListener('window:focus') onFocus(): void {
    void this.refresh(false);
  }
  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
