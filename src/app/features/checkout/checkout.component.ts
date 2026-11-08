import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { BenefitsComponent } from '../../shared/benefits.component';
import { Order, Offer, Payment } from '../../models/domain';
import { ClubStore } from '../../services/club-store.service';
import { CredentialComponent } from '../../shared/credential.component';

@Component({
  selector: 'app-checkout',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IconComponent,
    BenefitsComponent,
    CredentialComponent,
  ],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent {
  readonly store = inject(ClubStore);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly step = signal(1);
  readonly offer = signal<Offer>(
    this.route.snapshot.queryParamMap.get('offre') === 'membership'
      ? 'membership'
      : 'ticket',
  );
  readonly quantity = signal(this.initialQuantity());
  readonly method = signal<Payment['method']>('wave');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly completed = signal<Order | null>(null);
  readonly total = computed(() =>
    this.offer() === 'membership' ? 1000 : 500 * this.quantity(),
  );
  readonly steps = [
    'Votre formule',
    'Vos informations',
    'Paiement simulé',
    'Votre QR code',
  ];
  readonly form = this.fb.nonNullable.group({
    firstName: [
      '',
      [
        Validators.required,
        Validators.pattern(/.*\S.*/),
        Validators.maxLength(60),
      ],
    ],
    lastName: [
      '',
      [
        Validators.required,
        Validators.pattern(/.*\S.*/),
        Validators.maxLength(60),
      ],
    ],
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(160)],
    ],
    phone: [
      '',
      [Validators.required, Validators.pattern(/^[+\d\s()-]{8,20}$/)],
    ],
    studentNumber: ['', Validators.maxLength(40)],
  });
  private initialQuantity(): number {
    if (this.offer() === 'membership') return 1;
    const quantity = Number(
      this.route.snapshot.queryParamMap.get('quantite') ?? 1,
    );
    return Number.isInteger(quantity) && quantity >= 1 && quantity <= 10
      ? quantity
      : 1;
  }
  choose(offer: Offer): void {
    this.offer.set(offer);
    if (offer === 'membership') this.quantity.set(1);
    this.error.set('');
  }
  continueFromButton(): void {
    if (this.step() !== 2) this.next();
  }
  next(): void {
    this.error.set('');
    if (this.step() === 2 && this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complétez les champs indiqués pour continuer.');
      return;
    }
    if (this.offer() === 'ticket' && this.quantity() > this.store.remaining()) {
      this.error.set('Le nombre de places demandé n’est plus disponible.');
      return;
    }
    this.step.update((step) => Math.min(3, step + 1));
    this.focusHeading();
  }
  back(): void {
    this.step.update((step) => Math.max(1, step - 1));
    this.focusHeading();
  }
  invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }
  async pay(): Promise<void> {
    if (this.busy() || this.completed()) return;
    if (this.form.invalid) {
      this.step.set(2);
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 650));
      const values = this.form.getRawValue();
      const member = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value.trim()]),
      ) as typeof values;
      const order = this.store.purchase(
        this.offer(),
        this.quantity(),
        member,
        this.method(),
      );
      this.completed.set(order);
      this.step.set(4);
      this.focusHeading();
      this.store.notify(
        'Achat simulé enregistré sur cet appareil. Aucun débit effectué.',
      );
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'La simulation a échoué. Réessayez.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  private focusHeading(): void {
    setTimeout(() => document.getElementById('checkout-heading')?.focus());
  }
}
