import { Component, inject, input, signal } from '@angular/core';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-club-logo',
  template: `
    <span
      class="logo-symbol"
      [class.light-logo]="(variant() ?? theme.current()) === 'light'"
      [hidden]="missing()"
      ><img
        [src]="'branding/logo-' + (variant() ?? theme.current()) + '.jpeg'"
        alt="Club Informatique de l’Université Gaston Berger de Saint-Louis"
        width="96"
        height="96"
        [hidden]="missing()"
        (load)="missing.set(false)"
        (error)="missing.set(true)"
    /></span>
    @if (missing()) {
      <span aria-label="Club Informatique UGB">CIUGB</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .logo-symbol {
      display: block;
      width: var(--club-logo-size, 64px);
      height: var(--club-logo-size, 64px);
      position: relative;
      overflow: hidden;
    }
    img {
      display: block;
      position: absolute;
      width: 185%;
      max-width: none;
      height: 185%;
      left: -38%;
      top: -9%;
      object-fit: contain;
    }
    .light-logo img {
      top: -14%;
    }
    [hidden] {
      display: none;
    }
  `,
})
export class ClubLogoComponent {
  readonly theme = inject(ThemeService);
  readonly variant = input<'dark' | 'light'>();
  readonly missing = signal(false);
}
