import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BenefitsComponent } from '../../shared/benefits.component';
import { MemberCardComponent } from '../../shared/member-card.component';
import { IconComponent } from '../../shared/icon.component';
@Component({
  selector: 'app-membership',
  imports: [RouterLink, BenefitsComponent, MemberCardComponent, IconComponent],
  template: ` <section class="section-shell page-intro">
      <p class="eyebrow">LA CARTE QUI VOUS CONNECTE</p>
      <h1>
        Plus qu’une carte.<br /><span class="text-red"
          >Faites partie du club.</span
        >
      </h1>
      <p>
        Une adhésion, des rendez-vous toute l’année et une communauté à
        retrouver.
      </p>
    </section>
    <section class="section-shell membership-layout">
      <div class="membership-copy">
        <p class="value-headline">1 000 FCFA. Une année entière d'avantages.</p>
        <app-benefits /><a
          routerLink="/commander"
          [queryParams]="{ offre: 'membership' }"
          class="button"
          >Obtenir ma carte — 1 000 FCFA <app-icon name="ArrowUpRight"
        /></a>
        <p class="small muted">
          Adhésion individuelle, valable pendant l’année universitaire en cours.
          Le QR code est personnel.
        </p>
      </div>
      <div class="card-showcase">
        <app-member-card />
        <p class="small muted text-center">
          Aperçu de la carte · QR d’illustration sans droit d’accès
        </p>
      </div>
    </section>
    <section class="section-shell rules-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">DES AVANTAGES, DES RÈGLES SIMPLES</p>
          <h2>Votre année au club.</h2>
        </div>
      </div>
      <div class="three-columns">
        <article>
          <app-icon name="CalendarDays" [size]="28" />
          <h3>Une année universitaire</h3>
          <p>
            La carte reste valable jusqu’à la fin de l’année universitaire. Dans
            cette démo : du 1er octobre 2026 au 31 juillet 2027. Ces dates sont
            une hypothèse à confirmer par le club.
          </p>
        </article>
        <article>
          <app-icon name="ScanLine" [size]="28" />
          <h3>Un contrôle à chaque événement</h3>
          <p>
            Présentez votre QR personnel. Une carte expirée, suspendue ou pas
            encore active ne permet plus l’entrée gratuite. Une seule entrée est
            validée par événement.
          </p>
        </article>
        <article>
          <app-icon name="Popcorn" [size]="28" />
          <h3>Un popcorn, à part</h3>
          <p>
            À la soirée cinéma des 72h, retirez votre popcorn avec le même QR.
            Son retrait est enregistré séparément de l’entrée et ne peut être
            validé qu’une seule fois.
          </p>
        </article>
      </div>
    </section>`,
})
export class MembershipComponent {}
