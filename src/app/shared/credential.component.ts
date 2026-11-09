import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Reservation } from '../models/domain';
import { ClubStore } from '../services/club-store.service';
import { DownloadFormat, DownloadService } from '../services/download.service';
import { QrComponent } from './qr.component';
import { IconComponent } from './icon.component';
import { STATUS_LABELS } from '../core/catalog';
@Component({
  selector: 'app-credential',
  imports: [FormsModule, DatePipe, QrComponent, IconComponent],
  template: `
    <article class="credential-block reservation-card">
      <div class="reservation-card-heading">
        <div>
          <p class="eyebrow">SOIRÉE THRILLER · 72H UGB</p>
          <h3>{{ reservation().fullName }}</h3>
        </div>
        <span
          class="status-pill"
          [class.status-good]="reservation().status === 'validated'"
          >{{ labels[reservation().status] }}</span
        >
      </div>
      @if (reservation().status === 'validated') {
        <div class="download-format">
          <label [for]="'format-' + reservation().id"
            >Format de téléchargement</label
          ><select
            [id]="'format-' + reservation().id"
            [ngModel]="format()"
            (ngModelChange)="format.set($event)"
            [disabled]="busy()"
          >
            <option value="pdf">PDF · prêt à imprimer</option>
            <option value="png">PNG · image haute résolution</option>
            <option value="svg">SVG · version vectorielle</option>
          </select>
        </div>
        @for (
          ticket of reservation().tickets;
          track ticket.id;
          let i = $index
        ) {
          <div class="fun-ticket">
            <div class="ticket-rip" aria-hidden="true"></div>
            <div class="fun-ticket-copy">
              <span class="genre-label">THRILLER / 72H</span>
              <p class="eyebrow">UNE PLACE DANS L’HISTOIRE</p>
              <h3>Ne regardez<br />pas seul.</h3>
              <p>{{ reservation().fullName }}</p>
              <span class="ticket-admit"
                >ENTRÉE {{ i + 1 }} / {{ reservation().quantity }}</span
              >
              <p class="small">
                {{
                  ticket.checkedInAt
                    ? 'Entrée déjà utilisée'
                    : 'Paiement confirmé · Billet disponible'
                }}
              </p>
              <code>{{ ticket.code }}</code
              ><button
                class="button button-small"
                (click)="download(ticket.id)"
                [disabled]="busy()"
              >
                <app-icon name="Download" [size]="16" />{{
                  busy() ? 'Préparation…' : 'Télécharger le billet'
                }}
              </button>
            </div>
            <div class="ticket-qr-stub">
              <app-qr [value]="ticket.id" /><span
                >SCANNEZ. ENTREZ.<br />RETENEZ VOTRE SOUFFLE.</span
              >
            </div>
          </div>
        }
      } @else {
        <div class="pending-ticket">
          <app-icon
            [name]="
              reservation().status === 'cancelled'
                ? 'CircleAlert'
                : 'CalendarDays'
            "
            [size]="36"
          />
          <div>
            <h3>
              {{
                reservation().status === 'cancelled'
                  ? 'Réservation annulée'
                  : 'Le club prend la suite.'
              }}
            </h3>
            <p>
              {{
                reservation().status === 'cancelled'
                  ? 'Aucun billet n’est disponible pour cette réservation.'
                  : 'Nous vous contactons au ' +
                    reservation().phone +
                    ' pour le paiement de ' +
                    reservation().amount +
                    ' FCFA. Votre billet et son QR apparaîtront après validation par un organisateur.'
              }}
            </p>
          </div>
        </div>
      }
      <div class="reservation-receipt">
        <span
          >{{ reservation().quantity }} place(s) ·
          {{ reservation().amount }} FCFA</span
        ><span
          >Réservé le {{ reservation().createdAt | date: 'dd/MM/yyyy' }}</span
        >
      </div>
      <p class="small muted">
        Code de réservation confidentiel — à conserver pour retrouver votre
        dossier :
      </p>
      <code class="private-reference">{{ reservation().reference }}</code>
    </article>
  `,
})
export class CredentialComponent {
  readonly reservation = input.required<Reservation>();
  readonly labels = STATUS_LABELS;
  readonly format = signal<DownloadFormat>('pdf');
  readonly busy = signal(false);
  private readonly downloads = inject(DownloadService);
  private readonly store = inject(ClubStore);
  async download(id: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.downloads.download(this.reservation(), id, this.format());
    } catch (error) {
      this.store.notify(
        error instanceof Error ? error.message : 'Le téléchargement a échoué.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
