import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ClubStore } from './services/club-store.service';
import { IconComponent } from './shared/icon.component';
import { ClubLogoComponent } from './shared/club-logo.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    ClubLogoComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'ciugb-connect';
  readonly store = inject(ClubStore);
  readonly theme = inject(ThemeService);
  readonly menuOpen = signal(false);
  readonly year = new Date().getFullYear();
  constructor() {
    void this.store.initialize();
  }
}
