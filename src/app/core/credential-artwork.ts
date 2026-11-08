import { Order } from '../models/domain';
import { ticketAccessCode } from './access-code';

const xml = (value: string): string => value.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
const dateLabel = (date: string): string => date.slice(0, 10).split('-').reverse().join('/');

function nameLayout(name: string): { lines: string[]; size: number } {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return { lines: [name.slice(0, 40), name.slice(40)], size: 24 };
  for (let size = 44; size >= 18; size -= 2) {
    context.font = `600 ${size}px Arial`;
    const lines: string[] = []; let line = '';
    for (const word of name.split(/\s+/)) {
      if (context.measureText([line, word].filter(Boolean).join(' ')).width <= 650) { line = [line, word].filter(Boolean).join(' '); continue; }
      if (line) { lines.push(line); line = ''; }
      for (const letter of Array.from(word)) {
        if (context.measureText(line + letter).width > 650) { lines.push(line); line = ''; }
        line += letter;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 2) return { lines, size };
  }
  return { lines: [name.slice(0, 65), name.slice(65, 129)], size: 18 };
}

/** Document autonome : logo embarqué, vrai QR vectoriel, aucune police distante. */
export function credentialArtwork(order: Order, credentialId: string, qrSvg: string, logo: string): string {
  const membership = order.membership;
  const fullName = `${order.member.firstName.trim()} ${order.member.lastName.trim()}`;
  const { lines, size } = nameLayout(fullName);
  const code = membership?.memberNumber ?? ticketAccessCode(credentialId);
  const year = membership ? `${membership.membershipStartDate.slice(0, 4)}–${membership.membershipEndDate.slice(0, 4)}` : '72H';
  const qr = qrSvg.replace(/<\?xml[^>]*>/, '').replace('<svg ', '<svg x="798" y="350" width="190" height="190" ');
  const name = lines.map((line, i) => `<text x="52" y="${350 + i * (size + 10)}" fill="#faf7f2" font-size="${size}" font-weight="600" letter-spacing="-1">${xml(line)}</text>`).join('');
  const validity = membership ? `DU ${dateLabel(membership.membershipStartDate)} AU ${dateLabel(membership.membershipEndDate)}` : 'DATE ET SALLE À CONFIRMER';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="650" viewBox="0 0 1040 650" role="img" aria-labelledby="title description">
  <title id="title">${membership ? 'Carte membre' : 'Ticket cinéma'} · ${xml(fullName)}</title>
  <desc id="description">Club Informatique de l’Université Gaston Berger. ${xml(code)}. ${xml(validity)}. Document de démonstration.</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="0.7"><stop stop-color="#252525"/><stop offset="0.55" stop-color="#141414"/><stop offset="1" stop-color="#391016"/></linearGradient>
    <linearGradient id="edge"><stop stop-color="#a51018"/><stop offset="1" stop-color="#ed5e68"/></linearGradient>
    <clipPath id="card"><rect x="1" y="1" width="1038" height="648" rx="30"/></clipPath>
  </defs>
  <g clip-path="url(#card)">
    <rect width="1040" height="650" fill="url(#background)"/>
    <circle cx="1040" cy="-60" r="280" fill="none" stroke="#ad3540" stroke-width="1.5" opacity=".6"/>
    <circle cx="1040" cy="-60" r="340" fill="none" stroke="#ad3540" opacity=".2"/>
    <path d="M640 170 780 310 640 450M510 310h310" fill="none" stroke="#ffffff" stroke-width="35" opacity=".025"/>
    <rect x="0" y="642" width="1040" height="8" fill="url(#edge)"/>
    <g font-family="Arial, Helvetica, sans-serif">
      <svg x="48" y="44" width="86" height="86" viewBox="210 50 553 553" overflow="hidden"><image href="${logo}" width="1024" height="1024"/></svg>
      <text x="153" y="77" fill="#f8f4ee" font-size="19" font-weight="700" letter-spacing="1.2">CLUB INFORMATIQUE</text>
      <text x="153" y="103" fill="#bfb3b5" font-size="12" letter-spacing="1.3">UNIVERSITÉ GASTON BERGER · SAINT-LOUIS</text>
      <rect x="823" y="53" width="165" height="43" rx="8" fill="#1e1517" stroke="#75464c"/>
      <text x="905" y="81" text-anchor="middle" fill="#f4e6e7" font-family="monospace" font-size="18">${xml(year)}</text>
      <path d="M52 166h936" stroke="#ffffff" opacity=".12"/>
      <rect x="52" y="225" width="28" height="3" rx="1.5" fill="#e34b59"/>
      <text x="94" y="232" fill="#ed9ca4" font-size="13" letter-spacing="3">${membership ? 'CARTE MEMBRE ANNUELLE' : 'SOIRÉE CINÉMA DES 72H'}</text>
      <text x="52" y="293" fill="#a89b9f" font-size="11" letter-spacing="2">${membership ? 'MEMBRE DU CLUB' : 'PARTICIPANT'}</text>
      ${name}
      <text x="52" y="455" fill="#f4c5ca" font-family="monospace" font-size="20" letter-spacing="1">${xml(code)}</text>
      <text x="52" y="490" fill="#b5a8ac" font-size="13" letter-spacing="1">${xml(validity)}</text>
      <text x="52" y="533" fill="#9c8d92" font-size="12">${membership ? 'Votre QR personnel · Présentez-le à chaque contrôle.' : 'Une entrée individuelle · Popcorn non inclus.'}</text>
      <rect x="794" y="346" width="198" height="198" rx="12" fill="#fff"/>
      ${qr}
      <text x="893" y="570" text-anchor="middle" fill="#ac969d" font-family="monospace" font-size="11" letter-spacing="1.5">QR PERSONNEL</text>
      <path d="M52 585h690" stroke="#ffffff" opacity=".1"/>
      <text x="52" y="615" fill="#92858b" font-size="10" letter-spacing=".5">DÉMONSTRATION · PAIEMENT SIMULÉ · VALIDATION LOCALE</text>
      <text x="988" y="615" text-anchor="end" fill="#92858b" font-family="monospace" font-size="11">${xml(order.reference)}</text>
    </g>
  </g>
  <rect x="1" y="1" width="1038" height="648" rx="30" fill="none" stroke="#77434a"/>
</svg>`;
}
