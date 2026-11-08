import { Component, input } from '@angular/core';
import { QrComponent } from './qr.component';
import { ACADEMIC_YEAR } from '../core/catalog';
import { ClubLogoComponent } from './club-logo.component';
@Component({
  selector: 'app-member-card',
  imports: [QrComponent, ClubLogoComponent],
  template: `<div class="member-card">
    <div class="card-top">
      <span class="card-brand"
        ><app-club-logo variant="dark" style="--club-logo-size: 54px" /><small
          >CLUB INFORMATIQUE<br />UNIVERSITÉ GASTON BERGER</small
        ></span
      ><span class="card-year">{{ year }}</span>
    </div>
    <div class="card-watermark" aria-hidden="true">&lt;/&gt;</div>
    <div class="card-bottom">
      <div>
        <span class="eyebrow">MEMBRE DU CLUB</span>
        <h3>{{ name() }}</h3>
        <p>{{ number() }}</p>
        <small>{{ validity() }}</small>
      </div>
      <app-qr [value]="credential()" />
    </div>
  </div>`,
})
export class MemberCardComponent {
  readonly name = input('Votre prénom & nom');
  readonly number = input('CI-2026-APERÇU');
  readonly credential = input('preview-not-valid');
  readonly validity = input('Jusqu’au 31 juillet 2027 · hypothèse de démo');
  readonly year = ACADEMIC_YEAR.label;
}
