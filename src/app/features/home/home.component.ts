import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { BenefitsComponent } from '../../shared/benefits.component';
@Component({
  selector: 'app-home',
  imports: [RouterLink, IconComponent, BenefitsComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  readonly steps = [
    'Choisissez votre formule',
    'Renseignez vos informations',
    'Simulez votre paiement',
    'Recevez votre QR code',
    'Présentez-le à l’entrée',
  ];
}
