import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClubStore } from '../../services/club-store.service';
import { Reservation } from '../../models/domain';
import { IconComponent } from '../../shared/icon.component';
@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent {
  readonly store = inject(ClubStore);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly completed = signal<Reservation | null>(null);
  private readonly requestId = crypto.randomUUID();
  readonly form = this.fb.nonNullable.group({
    fullName: [
      '',
      [
        Validators.required,
        Validators.pattern(/.*\S.*\S.*/),
        Validators.maxLength(120),
      ],
    ],
    phone: [
      '',
      [Validators.required, Validators.pattern(/^[+\d\s()-]{8,22}$/)],
    ],
    quantity: [
      this.initialQuantity(),
      [Validators.required, Validators.min(1), Validators.max(10)],
    ],
  });
  readonly quantity = signal(this.initialQuantity());
  readonly total = computed(
    () => this.quantity() * this.store.event().ticketPrice,
  );
  private initialQuantity(): number {
    const n = Number(this.route.snapshot.queryParamMap.get('quantite') ?? 1);
    return Number.isInteger(n) && n >= 1 && n <= 10 ? n : 1;
  }
  constructor() {
    this.form.controls.quantity.valueChanges.subscribe((n) =>
      this.quantity.set(Number(n)),
    );
  }
  invalid(field: 'fullName' | 'phone'): boolean {
    return (
      this.form.controls[field].touched && this.form.controls[field].invalid
    );
  }
  async submit(): Promise<void> {
    if (this.busy() || this.completed()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Vérifiez votre nom complet et votre téléphone.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const values = this.form.getRawValue();
      const reservation = await this.store.reserve({
        ...values,
        quantity: Number(values.quantity),
        requestId: this.requestId,
      });
      this.completed.set(reservation);
      setTimeout(() => document.getElementById('reservation-success')?.focus());
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Réservation impossible. Réessayez.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.completed()!.reference);
      this.store.notify(
        'Code de réservation copié. Conservez-le pour retrouver votre billet.',
      );
    } catch {
      this.store.notify('Sélectionnez le code affiché pour le copier.');
    }
  }
}
