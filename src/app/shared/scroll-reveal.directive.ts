import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/** Reveals marketing sections once; functional screens deliberately do not use it. */
@Directive({ selector: '[appScrollReveal]', host: { class: 'scroll-reveal' } })
export class ScrollRevealDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    const target = this.element.nativeElement;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      target.dataset['visible'] = '';
      return;
    }
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        target.dataset['visible'] = '';
        this.observer?.disconnect();
      },
      { threshold: 0.08, rootMargin: '0px 0px -90px' },
    );
    this.observer.observe(target);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
