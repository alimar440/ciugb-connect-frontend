import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { ClubStore } from './services/club-store.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    spyOn(TestBed.inject(ClubStore), 'initialize').and.resolveTo();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'ciugb-connect' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('ciugb-connect');
  });

  it('should expose ticket navigation without membership', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('nav')?.textContent).toContain('Mes billets');
    expect(compiled.querySelector('nav')?.textContent).not.toContain(
      'Carte membre',
    );
    expect(compiled.querySelector('main')).toBeTruthy();
  });
});
