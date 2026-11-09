import { Reservation } from '../models/domain';
const xml = (value: string): string =>
  value.replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!,
  );
function nameLayout(name: string): { lines: string[]; size: number } {
  const context = document.createElement('canvas').getContext('2d');
  if (!context)
    return { lines: [name.slice(0, 40), name.slice(40, 120)], size: 20 };
  for (let size = 36; size >= 16; size -= 2) {
    context.font = `600 ${size}px Arial`;
    const lines: string[] = [];
    let line = '';
    for (const word of name.split(/\s+/)) {
      if (
        context.measureText([line, word].filter(Boolean).join(' ')).width <= 620
      ) {
        line = [line, word].filter(Boolean).join(' ');
        continue;
      }
      if (line) {
        lines.push(line);
        line = '';
      }
      for (const letter of Array.from(word)) {
        if (context.measureText(line + letter).width > 620) {
          lines.push(line);
          line = '';
        }
        line += letter;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 2) return { lines, size };
  }
  return { lines: [name.slice(0, 60), name.slice(60, 120)], size: 16 };
}
export function credentialArtwork(
  reservation: Reservation,
  credentialId: string,
  qrSvg: string,
  logo: string,
  demo = false,
): string {
  const ticket = reservation.tickets.find((t) => t.id === credentialId);
  if (reservation.status !== 'validated' || !ticket)
    throw new Error('Le billet n’est pas encore validé.');
  const { lines, size } = nameLayout(reservation.fullName);
  const name = lines
    .map(
      (line, i) =>
        `<text x="50" y="${420 + i * (size + 8)}" fill="#fff1dc" font-size="${size}" font-weight="600">${xml(line)}</text>`,
    )
    .join('');
  const qr = qrSvg
    .replace(/<\?xml[^>]*>/, '')
    .replace('<svg ', '<svg x="790" y="320" width="190" height="190" ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="650" viewBox="0 0 1040 650" role="img" aria-labelledby="title description">
<title id="title">Billet cinéma · ${xml(reservation.fullName)}</title><desc id="description">Soirée thriller des 72h du Club Informatique UGB. ${xml(ticket.code)}. Paiement confirmé. Date et salle à confirmer.</desc>
<defs><linearGradient id="tint" x2="1" y2="1"><stop stop-color="#36213f"/><stop offset=".6" stop-color="#201728"/><stop offset="1" stop-color="#471e34"/></linearGradient><linearGradient id="stub" x2="0" y2="1"><stop stop-color="#7b3649"/><stop offset="1" stop-color="#392137"/></linearGradient><pattern id="grain" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#fff" opacity=".08"/></pattern><mask id="shape"><rect width="1040" height="650" rx="26" fill="#fff"/><circle cx="740" cy="0" r="22" fill="#000"/><circle cx="740" cy="650" r="22" fill="#000"/></mask></defs>
<g mask="url(#shape)"><rect width="1040" height="650" fill="url(#tint)"/><rect x="740" width="300" height="650" fill="url(#stub)"/><rect width="1040" height="650" fill="url(#grain)"/>
<path d="M740 35v580" stroke="#e7a9a0" stroke-dasharray="5 8" opacity=".5"/><circle cx="600" cy="190" r="225" fill="none" stroke="#a65b79" opacity=".18"/><circle cx="600" cy="190" r="180" fill="none" stroke="#a65b79" opacity=".12"/>
<g font-family="Arial, Helvetica, sans-serif"><svg x="48" y="38" width="66" height="66" viewBox="210 50 553 553" overflow="hidden"><image href="${logo}" width="1024" height="1024"/></svg><text x="132" y="63" fill="#fff1dc" font-size="16" font-weight="700" letter-spacing="1.2">CLUB INFORMATIQUE</text><text x="132" y="87" fill="#bd9fb8" font-size="11" letter-spacing="1">UNIVERSITÉ GASTON BERGER · SAINT-LOUIS</text>
<text x="50" y="168" fill="#f0bd7d" font-family="monospace" font-size="13" letter-spacing="3">72H / SOIRÉE CINÉMA / THRILLER</text>
<text x="46" y="255" fill="#fff1dc" font-size="64" font-weight="900" letter-spacing="-3">NE REGARDEZ</text><text x="46" y="325" fill="#fff1dc" font-size="64" font-weight="900" letter-spacing="-3">PAS SEUL.</text><path d="M50 357h40" stroke="#ec987d" stroke-width="4"/>
<text x="50" y="386" fill="#c19eaf" font-size="10" letter-spacing="2">CE BILLET EST POUR</text>${name}
<text x="50" y="505" fill="#f7bd91" font-family="monospace" font-size="20" letter-spacing="1">${xml(ticket.code)}</text><text x="50" y="538" fill="#bca4b5" font-size="13">DATE ET SALLE À CONFIRMER · CAMPUS UGB</text>
<path d="M50 570h635" stroke="#ffffff" opacity=".14"/><text x="50" y="605" fill="#b398ab" font-size="11">${demo ? 'DÉMONSTRATION LOCALE · ' : ''}PAIEMENT CONFIRMÉ · UNE SEULE ENTRÉE</text>
<text x="890" y="80" fill="#f9d4a6" font-size="48" font-weight="900" text-anchor="middle">72H</text><g transform="rotate(8 890 156)"><rect x="790" y="124" width="200" height="54" rx="4" fill="#f4ce9b"/><text x="890" y="158" fill="#4a2437" font-size="20" font-weight="800" letter-spacing="3" text-anchor="middle">THRILLER</text></g>
<text x="890" y="237" fill="#fff1dc" font-size="19" letter-spacing="3" text-anchor="middle">UNE ENTRÉE</text><text x="890" y="268" fill="#d9b4bb" font-size="12" text-anchor="middle">Le frisson se partage.</text>
<rect x="786" y="316" width="198" height="198" rx="12" fill="#fff"/>${qr}<text x="885" y="550" fill="#e9c4bb" font-family="monospace" font-size="10" letter-spacing="1.5" text-anchor="middle">SCANNEZ. ENTREZ.</text><text x="885" y="570" fill="#e9c4bb" font-family="monospace" font-size="10" letter-spacing="1" text-anchor="middle">RETENEZ VOTRE SOUFFLE.</text>
</g></g></svg>`;
}
