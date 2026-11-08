import { Component, effect, input, signal } from '@angular/core';
import { toDataURL } from 'qrcode';
@Component({
  selector: 'app-qr',
  template: `@if (source()) {
      <img
        [src]="source()"
        [alt]="'QR code personnel : ' + value()"
        width="164"
        height="164"
      />
    } @else if (error()) {
      <span role="alert">QR indisponible. Utilisez l’identifiant affiché.</span>
    } @else {
      <span class="skeleton" role="status">Génération du QR…</span>
    }`,
  styles:
    ':host { display: inline-block; } img { display: block; width: 100%; height: auto; border-radius: 8px; }',
})
export class QrComponent {
  readonly value = input.required<string>();
  readonly source = signal('');
  readonly error = signal(false);
  constructor() {
    effect((onCleanup) => {
      let cancelled = false;
      this.source.set('');
      this.error.set(false);
      toDataURL(this.value(), {
        width: 328,
        margin: 3,
        errorCorrectionLevel: 'M',
      })
        .then((url) => {
          if (!cancelled) this.source.set(url);
        })
        .catch(() => {
          if (!cancelled) this.error.set(true);
        });
      onCleanup(() => {
        cancelled = true;
      });
    });
  }
}
