import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClubStore } from '../services/club-store.service';
@Component({
  selector: 'app-admin-gate',
  imports: [FormsModule],
  template: `
    @if (store.mode() === 'loading') {
      <div class="panel" role="status">
        Chargement de l’espace organisateur…
      </div>
    } @else if (store.mode() === 'unavailable') {
      <p class="error-banner" role="alert">
        L’espace organisateur est momentanément indisponible.
      </p>
    } @else if (!store.admin()) {
      <section class="panel admin-login">
        <p class="eyebrow">RÉSERVÉ À L’ÉQUIPE DES 72H</p>
        <h2>Connexion organisateur</h2>
        <form (ngSubmit)="login()">
          <label for="admin-password">Mot de passe organisateur</label
          ><input
            id="admin-password"
            type="password"
            name="password"
            [(ngModel)]="password"
            autocomplete="current-password"
            required
            [disabled]="busy()"
          />
          @if (error()) {
            <p class="error-banner" role="alert">{{ error() }}</p>
          }
          <button
            class="button full-width"
            type="submit"
            [disabled]="busy() || !password"
          >
            {{ busy() ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>
      </section>
    } @else {
      @if (store.mode() === 'demo') {
        <p class="notice">
          Démonstration locale : les exemples et validations sont enregistrés
          sur cet appareil. Aucun participant réel n’est contacté.
        </p>
      }
      <ng-content />
    }
  `,
})
export class AdminGateComponent {
  readonly store = inject(ClubStore);
  password = '';
  readonly busy = signal(false);
  readonly error = signal('');
  async login(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.store.login(this.password);
      this.password = '';
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Connexion impossible.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
