import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { ScrollRevealDirective } from '../../shared/scroll-reveal.directive';
@Component({
  selector: 'app-home',
  imports: [RouterLink, IconComponent, ScrollRevealDirective],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  readonly trailerOpen = signal(false);
  readonly steps = [
    {
      title: 'Vous réservez.',
      text: 'Votre nom complet, votre téléphone et le nombre de places. C’est tout.',
    },
    {
      title: 'On vous contacte.',
      text: 'Le club vous appelle ou vous écrit pour convenir du paiement.',
    },
    {
      title: 'On confirme.',
      text: 'Après réception du paiement, un organisateur valide votre réservation.',
    },
    {
      title: 'Le billet est à vous.',
      text: 'Retrouvez votre QR et téléchargez votre billet en PDF ou PNG.',
    },
  ];
}
