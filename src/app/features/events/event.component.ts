import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { EVENTS } from '../../core/catalog';
import { ClubStore } from '../../services/club-store.service';
import { Offer } from '../../models/domain';
@Component({
  selector: 'app-event',
  imports: [RouterLink, IconComponent],
  template: ` <section class="section-shell page-intro">
      <p class="eyebrow">72H DU CLUB INFORMATIQUE / LE RENDEZ-VOUS</p>
      <h1>
        On se retrouve<br /><span class="text-red">devant le grand écran.</span>
      </h1>
      <p>
        Une soirée cinéma sur le campus de l’UGB, pour partager un film et un
        bon moment.
      </p>
    </section>
    <section class="section-shell event-layout">
      <div>
        <div class="event-cover">
          <img
            src="cinema-poster.svg"
            alt="Le campus fait son cinéma, illustration des 72h du club"
            width="720"
            height="880"
          />
        </div>
        <div class="event-details">
          <h2>La soirée cinéma des 72h</h2>
          <p>
            Faites une pause, retrouvez vos amis et profitez d’une projection
            organisée par le Club Informatique. La programmation sera annoncée
            prochainement.
          </p>
          <div class="detail-row">
            <app-icon name="CalendarDays" />
            <div>
              <strong>Date et horaire à confirmer</strong>
              <p>Le calendrier officiel sera communiqué par le club.</p>
            </div>
          </div>
          <div class="detail-row">
            <app-icon name="MapPin" />
            <div>
              <strong>{{ event.location }}</strong>
              <p>La salle et les modalités pratiques seront confirmées.</p>
            </div>
          </div>
          <h3>Avant de venir</h3>
          <p>
            Gardez votre billet ou votre carte numérique à portée de main.
            Chaque participant présente son QR code à l’entrée. Le ticket cinéma
            n’inclut pas de popcorn ; il est offert aux membres disposant d’une
            carte valide.
          </p>
        </div>
      </div>
      <aside class="panel booking-panel">
        <span class="eyebrow">VOTRE PLACE VOUS ATTEND</span>
        <h2>Choisissez votre formule.</h2>
        <fieldset class="offer-selector">
          <legend class="sr-only">Formule de réservation</legend>
          <label [class.selected]="offer() === 'ticket'"
            ><input
              type="radio"
              name="event-offer"
              value="ticket"
              [checked]="offer() === 'ticket'"
              (change)="choose('ticket')"
            /><span
              ><strong>Ticket cinéma</strong
              ><small>Une entrée · QR individuel</small></span
            ><b>500 FCFA</b></label
          ><label [class.selected]="offer() === 'membership'"
            ><input
              type="radio"
              name="event-offer"
              value="membership"
              [checked]="offer() === 'membership'"
              (change)="choose('membership')"
            /><span
              ><strong>Carte membre annuelle</strong
              ><small>Cinéma + événements du club + popcorn</small></span
            ><b>1 000 FCFA</b></label
          >
        </fieldset>
        @if (offer() === 'ticket') {
          <div class="quantity-row">
            <span>Nombre de tickets</span>
            <div class="quantity-control">
              <button
                (click)="quantity.set(quantity() - 1)"
                [disabled]="quantity() <= 1"
                aria-label="Retirer un ticket"
              >
                <app-icon name="Minus" [size]="16" /></button
              ><output>{{ quantity() }}</output
              ><button
                (click)="quantity.set(quantity() + 1)"
                [disabled]="quantity() >= 10 || quantity() >= store.remaining()"
                aria-label="Ajouter un ticket"
              >
                <app-icon name="Plus" [size]="16" />
              </button>
            </div>
          </div>
        } @else {
          <p class="notice">
            Une carte = une personne. Adhésion valable jusqu’au 31 juillet 2027,
            selon le calendrier de démonstration.
          </p>
        }
        <div class="total-row">
          <span>Total</span><strong>{{ total() }} FCFA</strong>
        </div>
        <a
          class="button full-width"
          routerLink="/commander"
          [queryParams]="{ offre: offer(), quantite: quantity() }"
          >Continuer <app-icon name="ArrowRight"
        /></a>
        <p class="small muted">
          {{ store.remaining() }} tickets restants sur {{ event.capacity }} ·
          capacité fictive de démonstration
        </p>
        <p class="small muted">
          Vous êtes déjà membre ? Présentez votre carte valide. Aucun ticket
          supplémentaire n’est nécessaire.
        </p>
      </aside>
    </section>`,
})
export class EventComponent {
  readonly store = inject(ClubStore);
  get event() {
    return this.store.events()[0];
  }
  readonly offer = signal<Offer>('ticket');
  readonly quantity = signal(1);
  readonly total = computed(() =>
    this.offer() === 'membership' ? 1000 : this.quantity() * 500,
  );
  choose(offer: Offer) {
    this.offer.set(offer);
    this.quantity.set(1);
  }
}
