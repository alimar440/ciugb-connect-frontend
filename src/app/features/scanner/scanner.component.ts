import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClubStore } from '../../services/club-store.service';
import { AccessResult } from '../../models/domain';
import { IconComponent } from '../../shared/icon.component';
import { QrReaderComponent } from '../../shared/qr-reader.component';
import { AdminGateComponent } from '../../shared/admin-gate.component';
@Component({
  selector: 'app-scanner',
  imports: [
    FormsModule,
    RouterLink,
    IconComponent,
    QrReaderComponent,
    AdminGateComponent,
  ],
  templateUrl: './scanner.component.html',
})
export class ScannerComponent {
  readonly store = inject(ClubStore);
  readonly mode = signal<'code' | 'qr'>('code');
  readonly result = signal<AccessResult | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  credential = '';
  private checkedCode = '';
  async decoded(code: string): Promise<void> {
    this.credential = code;
    await this.verify();
  }
  async verify(): Promise<void> {
    if (this.busy()) return;
    this.error.set('');
    this.result.set(null);
    if (!this.credential.trim()) {
      this.error.set('Saisissez un code de billet.');
      return;
    }
    this.busy.set(true);
    try {
      const code = this.credential.trim();
      const result = await this.store.verify(code);
      this.checkedCode = code;
      this.result.set(result);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Vérification impossible.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  async checkIn(): Promise<void> {
    if (this.busy() || this.result()?.status !== 'valid') return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.result.set(await this.store.checkIn(this.checkedCode));
      this.store.notify('Entrée enregistrée pour la soirée des 72h.');
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Validation impossible.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
