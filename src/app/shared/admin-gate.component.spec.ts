import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminGateComponent } from './admin-gate.component';
import { ClubStore } from '../services/club-store.service';

@Component({ imports: [AdminGateComponent], template: '<app-admin-gate><p id="private-data">Réservations privées</p></app-admin-gate>' })
class HostComponent {}

describe('Private admin login screen', () => {
  const mode = signal<'loading'|'unavailable'|'demo'|'live'>('unavailable');
  const admin = signal(false);
  let login: jasmine.Spy;
  beforeEach(async () => {
    mode.set('unavailable'); admin.set(false);
    login = jasmine.createSpy('login').and.rejectWith(new Error('Connexion indisponible.'));
    await TestBed.configureTestingModule({ imports: [HostComponent], providers: [{ provide: ClubStore, useValue: { mode, admin, login } }] }).compileComponents();
  });
  it('keeps the login form visible when the server is unavailable', () => {
    const fixture = TestBed.createComponent(HostComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type=password]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Connexion administrateur');
    expect(fixture.nativeElement.querySelector('#private-data')).toBeNull();
  });
  it('does not hide login during startup or open admin in local demo mode', () => {
    const fixture = TestBed.createComponent(HostComponent);
    for (const state of ['loading','demo','live'] as const) {
      mode.set(state); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('input[type=password]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#private-data')).toBeNull();
    }
  });
  it('shows private content only after authentication', () => {
    const fixture = TestBed.createComponent(HostComponent); mode.set('live'); admin.set(true); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#private-data')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[type=password]')).toBeNull();
    admin.set(false); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#private-data')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type=password]')).toBeTruthy();
  });
  it('reports a failed login without revealing private content', async () => {
    const fixture = TestBed.createComponent(HostComponent); fixture.detectChanges(); await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input'); input.value = 'example-password'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles:true, cancelable:true })); await fixture.whenStable(); fixture.detectChanges();
    expect(login).toHaveBeenCalledWith('example-password');
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Connexion indisponible');
    expect(fixture.nativeElement.querySelector('#private-data')).toBeNull();
  });
});
