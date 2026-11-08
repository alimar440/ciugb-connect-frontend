import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClubStore } from '../../services/club-store.service';
import { IconComponent } from '../../shared/icon.component';
import { QrReaderComponent } from '../../shared/qr-reader.component';
import { CINEMA_EVENT_ID } from '../../core/catalog';
@Component({
  selector: 'app-scanner',
  imports: [
    FormsModule,
    DatePipe,
    RouterLink,
    IconComponent,
    QrReaderComponent,
  ],
  templateUrl: './scanner.component.html',
})
export class ScannerComponent {
  readonly store = inject(ClubStore);
  readonly mode = signal<'code' | 'qr'>('code');
  readonly credential = signal('');
  readonly checkedId = signal('');
  readonly error = signal('');
  readonly event = computed(() =>
    this.store.events().find((e) => e.id === CINEMA_EVENT_ID)!,
  );
  readonly result = computed(() =>
    this.checkedId() ? this.store.verify(this.checkedId(), this.event()) : null,
  );
  readonly samples = [
    { label: 'Membre valide', id: 'demo-member' },
    { label: 'Carte expirée', id: 'demo-expired' },
    { label: 'Ticket valide', id: 'demo-ticket' },
    { label: 'Déjà utilisé', id: 'demo-used' },
    { label: 'QR inconnu', id: 'demo-unknown' },
  ];
  verify(): void {
    this.error.set('');
    if (!this.credential().trim()) {
      this.error.set('Saisissez un identifiant ou choisissez un exemple.');
      this.checkedId.set('');
      return;
    }
    this.checkedId.set(this.credential().trim());
  }
  sample(id: string): void {
    this.credential.set(id);
    this.verify();
  }
  act(action: 'entry' | 'popcorn'): void {
    try {
      this.error.set('');
      if (action === 'entry')
        this.store.checkIn(this.checkedId(), this.event());
      else this.store.redeemPopcorn(this.checkedId(), this.event());
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Action impossible.',
      );
    }
  }
}
