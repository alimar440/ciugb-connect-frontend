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
    redirectTo: 'commander',
    pathMatch: 'full',
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
    title: 'Mes billets · CIUGB Connect',
    loadComponent: () =>
      import('./features/tickets/tickets.component').then(
        (m) => m.TicketsComponent,
      ),
  },
  {
    path: 'scan',
    title: 'Contrôle des billets · CIUGB Connect',
    loadComponent: () =>
      import('./features/scanner/scanner.component').then(
        (m) => m.ScannerComponent,
      ),
  },
  {
    path: 'admin',
    title: 'Organisateur · CIUGB Connect',
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },
  { path: '**', redirectTo: '' },
];
