import { Injectable } from '@angular/core';
import { toString } from 'qrcode';
import { Order } from '../models/domain';
import { credentialArtwork } from '../core/credential-artwork';
export type DownloadFormat = 'pdf' | 'png' | 'svg';
@Injectable({ providedIn: 'root' })
export class DownloadService {
  private async logoDataUrl(): Promise<string> {
    const response = await fetch(new URL('branding/logo-dark.jpeg', document.baseURI));
    if (!response.ok) throw new Error('Logo du club indisponible.');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Lecture du logo impossible.'));
      reader.readAsDataURL(blob);
    });
  }
  async download(order: Order, credentialId: string, format: DownloadFormat = 'pdf'): Promise<void> {
    const logo = await this.logoDataUrl();
    const qr = await toString(credentialId, { type: 'svg', margin: 3 });
    const svg = credentialArtwork(order, credentialId, qr, logo);
    const filename = `${order.reference}-${credentialId.slice(0, 8)}`;
    if (format === 'svg') { this.save(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${filename}.svg`); return; }
    const canvas = await this.rasterize(svg);
    if (format === 'png') {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Création PNG impossible.')), 'image/png'));
      this.save(blob, `${filename}.png`); return;
    }
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [104, 65], compress: true });
    pdf.setProperties({ title: order.membership ? 'Carte membre · Club Informatique UGB' : 'Ticket cinéma · 72h du Club Informatique', author: 'Club Informatique UGB' });
    pdf.addImage(canvas, 'PNG', 0, 0, 104, 65, undefined, 'FAST');
    this.save(pdf.output('blob'), `${filename}.pdf`);
  }

  private async rasterize(svg: string): Promise<HTMLCanvasElement> {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 2080; canvas.height = 1300;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Création de l’image impossible.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally { URL.revokeObjectURL(url); }
  }

  private save(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
