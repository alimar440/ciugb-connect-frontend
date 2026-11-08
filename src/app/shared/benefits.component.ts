import { Component } from '@angular/core';
import { MEMBERSHIP_BENEFITS } from '../core/catalog';
import { IconComponent } from './icon.component';
@Component({
  selector: 'app-benefits',
  imports: [IconComponent],
  template: `<ul class="benefits">
    @for (benefit of benefits; track benefit) {
      <li>
        <app-icon name="Check" [size]="18" /><span>{{ benefit }}</span>
      </li>
    }
  </ul>`,
})
export class BenefitsComponent {
  readonly benefits = MEMBERSHIP_BENEFITS;
}
