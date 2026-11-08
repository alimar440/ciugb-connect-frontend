import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'CIUGB Connect · Les 72h du Club Informatique',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'cinema',
    title: 'Soirée cinéma · CIUGB Connect',
    loadComponent: () =>
      import('./features/events/event.component').then((m) => m.EventComponent),
  },
  {
    path: 'adhesion',
    title: 'Carte membre annuelle · CIUGB Connect',
    loadComponent: () =>
      import('./features/membership/membership.component').then(
        (m) => m.MembershipComponent,
      ),
  },
  {
    path: 'commander',
    title: 'Réserver · CIUGB Connect',
    loadComponent: () =>
      import('./features/checkout/checkout.component').then(
        (m) => m.CheckoutComponent,
      ),
  },
  {
    path: 'mes-billets',
    title: 'Mes billets et cartes · CIUGB Connect',
    loadComponent: () =>
      import('./features/tickets/tickets.component').then(
        (m) => m.TicketsComponent,
      ),
  },
  {
    path: 'scan',
    title: 'Contrôle des accès · Démonstration',
    loadComponent: () =>
      import('./features/scanner/scanner.component').then(
        (m) => m.ScannerComponent,
      ),
  },
  {
    path: 'admin',
    title: 'Organisateur · Démonstration',
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },
  { path: '**', redirectTo: '' },
];
