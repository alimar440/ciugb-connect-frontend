import { Component, inject, input, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Order } from '../models/domain';
import { QrComponent } from './qr.component';
import { MemberCardComponent } from './member-card.component';
import { IconComponent } from './icon.component';
import { ClubStore } from '../services/club-store.service';
import { DownloadService, DownloadFormat } from '../services/download.service';
import { membershipStatusAt } from '../core/membership-rules';
import { ticketAccessCode } from '../core/access-code';
@Component({
  selector: 'app-credential',
  imports: [DatePipe, QrComponent, MemberCardComponent, IconComponent, FormsModule],
  template: ` <article class="credential-block">
    <div class="download-format"><label [for]="'download-format-' + order().id">Format de téléchargement</label><select [id]="'download-format-' + order().id" [ngModel]="format()" (ngModelChange)="format.set($event)" [disabled]="downloading()"><option value="pdf">PDF · prêt à imprimer</option><option value="png">PNG · image haute résolution</option><option value="svg">SVG · version vectorielle</option></select><p class="small muted">PDF pour imprimer, PNG pour enregistrer ou partager.</p></div>
    @if (order().membership; as member) {
      <app-member-card
        [name]="order().member.firstName + ' ' + order().member.lastName"
        [number]="member.memberNumber"
        [credential]="member.id"
        [validity]="
          'Du ' +
          (member.membershipStartDate | date: 'dd/MM/yyyy') +
          ' au ' +
          (member.membershipEndDate | date: 'dd/MM/yyyy')
        "
      />
      <div class="credential-info">
        <span class="status-pill" [class.status-good]="status() === 'active'">{{
          statusLabel()
        }}</span>
        <p>
          Validité : {{ member.membershipStartDate | date: 'dd/MM/yyyy' }} →
          {{ member.membershipEndDate | date: 'dd/MM/yyyy' }}. Les droits sont
          vérifiés à la date de chaque événement.
        </p>
        <p>
          Code de consultation : <code>{{ member.memberNumber }}</code>
        </p>
        <code>{{ member.id }}</code
        ><button class="button button-outline" (click)="download(member.id)" [disabled]="downloading()">
          <app-icon name="Download" /> {{ downloading() ? 'Préparation…' : 'Télécharger la carte' }}
        </button>
      </div>
    } @else {
      @for (ticket of order().tickets; track ticket.id; let i = $index) {
        <div class="digital-ticket">
          <div>
            <p class="eyebrow">SOIRÉE CINÉMA / 72H DU CLUB</p>
            <h3>
              {{ order().member.firstName }} {{ order().member.lastName }}
            </h3>
            <p>
              Ticket {{ i + 1 }} / {{ order().tickets.length }} · Date et salle
              à confirmer
            </p>
            <span class="status-pill" [class.status-good]="!used(ticket.id)">{{
              used(ticket.id) ? 'Entrée déjà validée' : 'Ticket disponible'
            }}</span>
            <p class="small muted">Popcorn non inclus</p>
            <p>
              Code de consultation : <code>{{ ticketCode(ticket.id) }}</code>
            </p>
            <code>{{ ticket.id }}</code
            ><button
              class="button button-outline button-small"
              (click)="download(ticket.id)"
              [disabled]="downloading()"
            >
              <app-icon name="Download" [size]="16" /> {{ downloading() ? 'Préparation…' : 'Télécharger le ticket' }}
            </button>
          </div>
          <app-qr [value]="ticket.id" />
        </div>
      }
    }
    <p class="small muted">
      {{ order().reference }} · Paiement simulé · QR généré localement, sans
      sécurisation serveur.
    </p>
  </article>`,
})
export class CredentialComponent {
  readonly format = signal<DownloadFormat>('pdf');
  readonly downloading = signal(false);
  readonly ticketCode = ticketAccessCode;
  readonly order = input.required<Order>();
  private readonly store = inject(ClubStore);
  private readonly downloads = inject(DownloadService);
  readonly status = computed(() =>
    this.order().membership
      ? membershipStatusAt(this.order().membership!, new Date().toISOString())
      : 'active',
  );
  readonly statusLabel = computed(
    () =>
      ({
        active: 'Carte active',
        expired: 'Carte expirée',
        pending: 'Carte pas encore active',
        suspended: 'Carte suspendue',
      })[this.status()],
  );
  used(id: string): boolean {
    return this.store
      .data()
      .checkIns.some(
        (c) => c.credentialId === id && c.eventId === 'cinema-72h',
      );
  }
  async download(id: string): Promise<void> {
    if (this.downloading()) return;
    this.downloading.set(true);
    try {
      await this.downloads.download(this.order(), id, this.format());
    } catch {
      this.store.notify('Le téléchargement a échoué. Réessayez.');
    } finally { this.downloading.set(false); }
  }
}
