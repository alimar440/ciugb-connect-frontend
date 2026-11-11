import type { Reservation } from '../models/domain';

const xml = (value: string): string => value.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
function nameLayout(name: string): { lines: string[]; size: number } {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return { lines: [name.slice(0, 40), name.slice(40, 120)], size: 20 };
  for (let size = 36; size >= 16; size -= 2) {
    context.font = `600 ${size}px Arial`;
    const lines: string[] = []; let line = '';
    for (const word of name.split(/\s+/)) {
      if (context.measureText([line, word].filter(Boolean).join(' ')).width <= 620) { line = [line, word].filter(Boolean).join(' '); continue; }
      if (line) { lines.push(line); line = ''; }
      for (const letter of Array.from(word)) {
        if (context.measureText(line + letter).width > 620) { lines.push(line); line = ''; }
        line += letter;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 2) return { lines, size };
  }
  return { lines: [name.slice(0, 60), name.slice(60, 120)], size: 16 };
}

export function credentialArtwork(reservation: Reservation, credentialId: string, qrSvg: string, logo: string, demo = false): string {
  const ticket = reservation.tickets.find(t => t.id === credentialId);
  if (reservation.status !== 'validated' || !ticket) throw new Error('Le billet n’est pas encore validé.');
  const { lines, size } = nameLayout(reservation.fullName);
  const name = lines.map((line, i) => `<text x="52" y="${392 + i*(size+8)}" fill="#faf3ee" font-size="${size}" font-weight="600">${xml(line)}</text>`).join('');
  const qr = qrSvg.replace(/<\?xml[^>]*>/, '').replace('<svg ', '<svg x="792" y="310" width="190" height="190" ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="650" viewBox="0 0 1040 650" role="img" aria-labelledby="title description">
<title id="title">Billet cinéma · ${xml(reservation.fullName)}</title><desc id="description">Soirée cinéma des 72h du Club Informatique UGB. ${xml(ticket.code)}. Paiement confirmé. Une entrée.</desc>
<defs><clipPath id="card"><rect x="1" y="1" width="1038" height="648" rx="20"/></clipPath></defs>
<g clip-path="url(#card)"><rect width="1040" height="650" fill="#21191c"/><rect x="750" width="290" height="650" fill="#191315"/><rect width="10" height="650" fill="#a51018"/>
<path d="M750 45v560" stroke="#77545d" stroke-dasharray="4 8"/>
<g font-family="Arial,Helvetica,sans-serif">
<svg x="48" y="42" width="76" height="76" viewBox="210 50 553 553" overflow="hidden"><image href="${logo}" width="1024" height="1024"/></svg>
<text x="146" y="74" fill="#faf3ee" font-size="18" font-weight="700" letter-spacing=".7">CLUB INFORMATIQUE</text><text x="146" y="101" fill="#baa6ac" font-size="12">Université Gaston Berger · Saint-Louis</text>
<text x="52" y="185" fill="#edb4bc" font-family="monospace" font-size="13" letter-spacing="1.4">LES 72H DU CLUB</text>
<text x="49" y="248" fill="#faf3ee" font-size="50" font-weight="650" letter-spacing="-1.5">Soirée cinéma</text>
<text x="52" y="285" fill="#baa6ac" font-size="16">UGB 2 · 29 novembre · 21h30</text>
<text x="52" y="346" fill="#baa6ac" font-size="11" letter-spacing="1">NOM DU PARTICIPANT</text>${name}
<text x="52" y="504" fill="#edb4bc" font-family="monospace" font-size="21">${xml(ticket.code)}</text>
<text x="52" y="540" fill="#baa6ac" font-size="14">Paiement confirmé · Entrée individuelle</text>
<path d="M52 578h635" stroke="#543940"/>
<text x="52" y="612" fill="#a99199" font-size="11">${demo ? 'DÉMONSTRATION LOCALE' : 'À PRÉSENTER À L’ENTRÉE AVEC VOTRE QR'}</text>
<text x="890" y="108" text-anchor="middle" fill="#edb4bc" font-family="monospace" font-size="38" font-weight="700">72H</text>
<text x="890" y="150" text-anchor="middle" fill="#baa6ac" font-size="13">BILLET CINÉMA</text>
<text x="890" y="237" text-anchor="middle" fill="#faf3ee" font-size="18">Une entrée</text>
<rect x="788" y="306" width="198" height="198" rx="9" fill="#fff"/>${qr}
<text x="887" y="544" text-anchor="middle" fill="#baa6ac" font-size="11">Présentez ce QR au contrôle.</text>
<text x="887" y="575" text-anchor="middle" fill="#a99199" font-family="monospace" font-size="12">${reservation.tickets.findIndex(t => t.id === credentialId)+1} / ${reservation.quantity}</text>
</g></g><rect x="1" y="1" width="1038" height="648" rx="20" fill="none" stroke="#69414b"/>
</svg>`;
}
