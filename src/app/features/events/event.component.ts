import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClubStore } from '../../services/club-store.service';
import { IconComponent } from '../../shared/icon.component';
@Component({
  selector: 'app-event',
  imports: [RouterLink, IconComponent],
  template: ` <section class="section-shell page-intro">
      <p class="eyebrow">72H / SOIRÉE THRILLER</p>
      <h1>
        La soirée cinéma<br /><span class="text-red">des 72h du club.</span>
      </h1>
      <p>
        Retrouvez le Club Informatique de l’UGB pour une soirée cinéma sur le
        campus.
      </p>
    </section>
    <section class="section-shell event-layout">
      <div>
        <div class="event-cover">
          <img
            src="cinema-poster.svg"
            alt="Le campus fait son cinéma — affiche rouge des 72h du Club Informatique"
            width="720"
            height="880"
          />
        </div>
        <div class="event-details">
          <h2>Une projection sur le campus.</h2>
          <p>
            La soirée cinéma est organisée par le Club Informatique de l’UGB dans le cadre de ses 72h. Le film sera annoncé prochainement.
          </p>
          <div class="detail-row">
            <app-icon name="CalendarDays" />
            <div>
              <strong>{{ store.event().dateLabel }}</strong>
              <p>Le calendrier sera communiqué par le club.</p>
            </div>
          </div>
          <div class="detail-row">
            <app-icon name="MapPin" />
            <div>
              <strong>{{ store.event().location }}</strong>
              <p>La salle et les modalités d’accès seront confirmées.</p>
            </div>
          </div>
          <h3>Avant de venir</h3>
          <p>
            Le club vous contacte après votre réservation. Une fois le paiement
            reçu et confirmé par un organisateur, votre billet et son QR
            deviennent disponibles dans « Mes billets ». Présentez ce QR ou le
            code du billet à l’entrée.
          </p>
          <p class="small muted">
            Une entrée par billet. Le popcorn n’est pas inclus.
          </p>
        </div>
      </div>
      <aside class="panel booking-panel tinted-offer">
        <p class="eyebrow">RÉSERVER UNE PLACE</p>
        <h2>Billet cinéma</h2>
        <div class="price">
          {{ store.event().ticketPrice }} <span>FCFA / personne</span>
        </div>
        <div class="quantity-row">
          <span>Nombre de places</span>
          <div class="quantity-control">
            <button
              (click)="quantity.set(quantity() - 1)"
              [disabled]="quantity() <= 1"
              aria-label="Retirer une place"
            >
              <app-icon name="Minus" [size]="16" /></button
            ><output>{{ quantity() }}</output
            ><button
              (click)="quantity.set(quantity() + 1)"
              [disabled]="quantity() >= 10 || quantity() >= store.remaining()"
              aria-label="Ajouter une place"
            >
              <app-icon name="Plus" [size]="16" />
            </button>
          </div>
        </div>
        <div class="total-row">
          <span>À régler après contact</span
          ><strong>{{ quantity() * store.event().ticketPrice }} FCFA</strong>
        </div>
        <a
          routerLink="/commander"
          [queryParams]="{ quantite: quantity() }"
          class="button full-width"
          >Réserver ces places <app-icon name="ArrowRight"
        /></a>
        <p class="small muted">Aucun paiement demandé sur ce site.</p>
        @if (store.mode() === 'live') {
          <p class="small muted">
            {{ store.remaining() }} place(s) disponible(s)
          </p>
        } @else if (store.mode() === 'demo') {
          <p class="small muted">
            Capacité de démonstration : {{ store.remaining() }} places.
          </p>
        }
      </aside>
    </section>`,
})
export class EventComponent {
  readonly store = inject(ClubStore);
  readonly quantity = signal(1);
}
