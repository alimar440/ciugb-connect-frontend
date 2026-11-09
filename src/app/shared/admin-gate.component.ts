import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClubStore } from '../services/club-store.service';
@Component({
  selector: 'app-admin-gate',
  imports: [FormsModule],
  template: `
    @if (!store.admin()) {
      <section class="panel admin-login">
        <p class="eyebrow">RÉSERVÉ À L’ÉQUIPE DES 72H</p>
        <h2>Connexion administrateur</h2>
        <p class="small muted">Cet espace est réservé à l’équipe du Club Informatique. Connectez-vous pour gérer les réservations et contrôler les billets.</p>
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
            aria-describedby="admin-connection-status"
          />
          @if (store.mode() === 'loading') {
            <p id="admin-connection-status" class="small muted" role="status">Vérification du service de connexion…</p>
          } @else if (store.mode() === 'unavailable') {
            <p id="admin-connection-status" class="notice">Le serveur de connexion est momentanément indisponible. Vous pouvez réessayer ci-dessous.</p>
          } @else if (store.mode() === 'demo') {
            <p id="admin-connection-status" class="small muted">La démonstration locale ne donne pas accès à l’administration. Une connexion au serveur du club est nécessaire.</p>
          }
          @if (error()) {
            <p class="error-banner" role="alert">{{ error() }}</p>
          }
          <button
            class="button full-width"
            type="submit"
            [disabled]="busy() || !password || store.mode() === 'loading'"
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
    if (this.busy() || !this.password.trim()) return;
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
