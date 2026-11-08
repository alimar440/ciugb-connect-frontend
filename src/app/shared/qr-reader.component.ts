import {
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from './icon.component';

type Decoder = (typeof import('jsqr'))['default'];
@Component({
  selector: 'app-qr-reader',
  imports: [IconComponent],
  template: `
    <div class="scanner-frame camera-frame">
      <video
        #video
        autoplay
        muted
        playsinline
        [hidden]="!active()"
        aria-label="Aperçu de la caméra pour lire le QR code"
      ></video>
      @if (!active()) {
        <app-icon name="ScanLine" [size]="64" /><strong
          >Scanner un QR code</strong
        ><small
          >Présentez le QR du billet ou de la carte devant la caméra.</small
        >
      }
    </div>
    <div class="button-row">
      @if (active() || starting()) {
        <button
          class="button button-outline full-width"
          type="button"
          (click)="stop()"
        >
          {{ starting() ? 'Annuler l’ouverture' : 'Arrêter la caméra' }}
        </button>
      } @else {
        <button
          class="button full-width"
          type="button"
          (click)="start()"
          [disabled]="reading()"
        >
          <app-icon name="ScanLine" />Activer la caméra
        </button>
      }
    </div>
    <div class="qr-file-input">
      <label for="qr-image">Ou lire le QR depuis une image</label
      ><input
        id="qr-image"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        (change)="readImage($event)"
        [disabled]="reading() || starting()"
      />
    </div>
    <p class="small muted" role="status">
      {{
        reading()
          ? 'Lecture de l’image…'
          : starting()
            ? 'Autorisez la caméra dans votre navigateur…'
            : active()
              ? 'Recherche d’un QR code…'
              : message()
      }}
    </p>
    @if (error()) {
      <p class="error-banner" role="alert">{{ error() }}</p>
    }
    <p class="small muted">
      La caméra nécessite votre autorisation et une connexion HTTPS ou
      localhost. Les images sont lues sur votre appareil.
    </p>
  `,
})
export class QrReaderComponent implements OnDestroy {
  @ViewChild('video', { static: true })
  private video!: ElementRef<HTMLVideoElement>;
  readonly decoded = output<string>();
  readonly active = signal(false);
  readonly starting = signal(false);
  readonly reading = signal(false);
  readonly error = signal('');
  readonly message = signal('Aucune image n’est envoyée à un serveur.');
  private readonly zone = inject(NgZone);
  private stream?: MediaStream;
  private timer?: ReturnType<typeof setTimeout>;
  private decoder?: Decoder;
  private generation = 0;
  private destroyed = false;

  private async loadDecoder(): Promise<Decoder> {
    return (this.decoder ??= (await import('jsqr')).default);
  }

  async start(): Promise<void> {
    if (this.active() || this.starting()) return;
    this.error.set('');
    this.starting.set(true);
    const generation = ++this.generation;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          'La caméra est indisponible. Utilisez HTTPS/localhost, importez une image ou saisissez le code.',
        );
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (this.destroyed || generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      const video = this.video.nativeElement;
      video.srcObject = stream;
      await video.play();
      const decode = await this.loadDecoder();
      if (this.destroyed || generation !== this.generation) return;
      this.starting.set(false);
      this.active.set(true);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context)
        throw new Error(
          'Le navigateur ne peut pas lire la caméra. Essayez une image ou le code.',
        );
      this.zone.runOutsideAngular(() => {
        const scan = () => {
          if (generation !== this.generation || this.destroyed) return;
          try {
            if (video.readyState >= 2 && video.videoWidth > 0) {
              const scale = Math.min(1, 960 / video.videoWidth);
              canvas.width = Math.round(video.videoWidth * scale);
              canvas.height = Math.round(video.videoHeight * scale);
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const pixels = context.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              const code = decode(pixels.data, pixels.width, pixels.height);
              if (code?.data.trim()) {
                this.zone.run(() => this.accept(code.data));
                return;
              }
            }
            this.timer = setTimeout(scan, 250);
          } catch {
            this.zone.run(() => {
              this.stop();
              this.error.set(
                'Lecture caméra interrompue. Réessayez ou utilisez une image.',
              );
            });
          }
        };
        scan();
      });
    } catch (error) {
      if (this.destroyed || generation !== this.generation) return;
      this.stop();
      this.error.set(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Accès caméra refusé. Autorisez la caméra, importez une image ou saisissez le code.'
          : error instanceof DOMException && error.name === 'NotFoundError'
            ? 'Aucune caméra détectée. Importez une image ou saisissez le code.'
            : error instanceof Error
              ? error.message
              : 'Impossible d’ouvrir la caméra.',
      );
    }
  }

  stop(): void {
    ++this.generation;
    clearTimeout(this.timer);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    const video = this.video.nativeElement;
    video.pause();
    video.srcObject = null;
    this.active.set(false);
    this.starting.set(false);
  }

  private accept(value: string): void {
    this.stop();
    this.message.set('QR code lu. Consultez le résultat avant de valider.');
    this.error.set('');
    this.decoded.emit(value.trim());
  }

  async readImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.stop();
    this.error.set('');
    this.reading.set(true);
    let url = '';
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error('L’image doit peser moins de 10 Mo.');
      const decode = await this.loadDecoder();
      url = URL.createObjectURL(file);
      const image = new Image();
      image.src = url;
      await image.decode();
      if (this.destroyed) return;
      const scale = Math.min(
        1,
        1600 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('La lecture d’image n’est pas disponible.');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = decode(pixels.data, pixels.width, pixels.height);
      if (!code?.data.trim())
        throw new Error(
          'Aucun QR lisible dans cette image. Essayez une image plus nette ou saisissez le code.',
        );
      this.accept(code.data);
    } catch (error) {
      if (!this.destroyed)
        this.error.set(
          error instanceof Error ? error.message : 'Image illisible.',
        );
    } finally {
      if (url) URL.revokeObjectURL(url);
      input.value = '';
      this.reading.set(false);
    }
  }
  @HostListener('document:visibilitychange') onVisibilityChange(): void {
    if (document.hidden) this.stop();
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.stop();
  }
}
