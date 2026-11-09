import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { validateReservation } from '../src/app/core/reservation-rules.js';
import type {
  AccessResult,
  Reservation,
  ReservationInput,
  ReservationStatus,
  Ticket,
} from '../src/app/models/domain.js';

let connection: ReturnType<typeof postgres> | undefined;
export async function closeDatabaseConnection(): Promise<void> {
  if (connection) await connection.end();
  connection = undefined;
}
function db() {
  return (connection ??= postgres(process.env['DATABASE_URL']!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  }));
}
class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
const fail = (status: number, message: string): never => {
  throw new ApiError(status, message);
};
const configured = (): boolean =>
  !!process.env['DATABASE_URL'] &&
  (process.env['ADMIN_PASSWORD']?.length ?? 0) >= 12 &&
  (process.env['ADMIN_SESSION_SECRET']?.length ?? 0) >= 32;
const constantEqual = (a: string, b: string): boolean =>
  timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest(),
  );
const signature = (value: string): string =>
  createHmac('sha256', process.env['ADMIN_SESSION_SECRET'] ?? '')
    .update(value)
    .digest('hex');
function authenticated(req: VercelRequest): boolean {
  const cookie = (req.headers.cookie ?? '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('ciugb_admin='))
    ?.slice('ciugb_admin='.length);
  if (!cookie) return false;
  const [expires, signed, extra] = cookie.split('.');
  return (
    !extra &&
    !!expires &&
    !!signed &&
    /^\d+$/.test(expires) &&
    Number(expires) > Date.now() &&
    constantEqual(signed, signature(expires))
  );
}
function body(req: VercelRequest): Record<string, unknown> {
  const value: unknown =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return fail(400, 'Demande invalide.');
  return value as Record<string, unknown>;
}
function requireAdmin(req: VercelRequest): void {
  if (!authenticated(req)) fail(401, 'Connectez-vous à l’espace organisateur.');
}
async function rateLimit(
  req: VercelRequest,
  action: string,
  limit: number,
  seconds: number,
): Promise<void> {
  const address = String(req.headers['x-forwarded-for'] ?? 'unknown')
    .split(',')[0]
    .trim();
  const key = signature(`${action}:${address}`);
  const rows =
    await db()`INSERT INTO ciugb_request_limits (key, attempts, expires_at) VALUES (${key}, 1, now() + ${seconds} * interval '1 second')
    ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN ciugb_request_limits.expires_at <= now() THEN 1 ELSE ciugb_request_limits.attempts + 1 END,
      expires_at = CASE WHEN ciugb_request_limits.expires_at <= now() THEN now() + ${seconds} * interval '1 second' ELSE ciugb_request_limits.expires_at END RETURNING attempts`;
  if (Number(rows[0]['attempts']) > limit)
    fail(429, 'Trop de tentatives. Patientez avant de réessayer.');
}
type ReservationRow = {
  id: string;
  reference: string;
  full_name: string;
  phone: string;
  quantity: number;
  amount: number;
  status: ReservationStatus;
  created_at: Date;
  contacted_at: Date | null;
  validated_at: Date | null;
  tickets?: Ticket[];
};
const iso = (value: Date | string | null): string | null =>
  value ? new Date(value).toISOString() : null;
function dto(row: ReservationRow): Reservation {
  return {
    id: row.id,
    reference: row.reference,
    fullName: row.full_name,
    phone: row.phone,
    quantity: row.quantity,
    amount: row.amount,
    status: row.status,
    createdAt: iso(row.created_at)!,
    contactedAt: iso(row.contacted_at),
    validatedAt: iso(row.validated_at),
    tickets:
      row.status === 'validated'
        ? (row.tickets ?? []).map((t) => ({
            ...t,
            checkedInAt: iso(t.checkedInAt),
          }))
        : [],
  };
}
async function byReference(reference: string): Promise<Reservation> {
  const rows = await db()<
    ReservationRow[]
  >`SELECT r.*, COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'code', t.code, 'checkedInAt', t.checked_in_at) ORDER BY t.code) FROM ciugb_tickets t WHERE t.reservation_id = r.id AND r.status = 'validated'), '[]'::jsonb) AS tickets FROM ciugb_reservations r WHERE r.reference = ${reference}`;
  if (!rows.length)
    return fail(404, 'Réservation introuvable. Vérifiez votre code.');
  return dto(rows[0]);
}
async function scan(code: string, confirm: boolean): Promise<AccessResult> {
  const normalized = code.trim().toUpperCase();
  if (confirm) {
    const updated =
      await db()`UPDATE ciugb_tickets t SET checked_in_at = now() FROM ciugb_reservations r WHERE t.reservation_id = r.id AND r.status = 'validated' AND t.checked_in_at IS NULL AND (upper(t.id::text) = ${normalized} OR t.code = ${normalized}) RETURNING t.id, t.code, r.full_name`;
    if (updated.length)
      return {
        status: 'used',
        title: 'Entrée validée',
        detail: 'Entrée enregistrée. Ce billet ne peut plus être utilisé.',
        fullName: String(updated[0]['full_name']),
        ticketCode: String(updated[0]['code']),
        ticketId: String(updated[0]['id']),
      };
  }
  const rows =
    await db()`SELECT t.id, t.code, t.checked_in_at, r.status, r.full_name FROM ciugb_tickets t JOIN ciugb_reservations r ON r.id = t.reservation_id WHERE upper(t.id::text) = ${normalized} OR t.code = ${normalized}`;
  if (!rows.length)
    return {
      status: 'unknown',
      title: 'Code inconnu',
      detail:
        'Présentez le QR ou le code d’un billet validé, pas le code de réservation.',
    };
  const row = rows[0];
  if (row['status'] !== 'validated')
    return {
      status: 'denied',
      title: 'Accès refusé',
      detail: 'Le paiement n’est pas confirmé ou la réservation est annulée.',
    };
  return {
    status: row['checked_in_at'] ? 'used' : 'valid',
    title: row['checked_in_at'] ? 'Entrée déjà validée' : 'Billet valide',
    detail: row['checked_in_at']
      ? 'Ce billet a déjà servi. Aucune nouvelle entrée autorisée.'
      : 'Paiement confirmé par l’organisateur. Une entrée autorisée.',
    fullName: String(row['full_name']),
    ticketId: String(row['id']),
    ticketCode: String(row['code']),
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const url = new URL(
      req.url ?? '/',
      `https://${req.headers.host ?? 'localhost'}`,
    );
    const route = String(
      req.query['route'] ?? url.pathname.replace(/^\/api\/?/, ''),
    ).replace(/^\/+|\/+$/g, '');
    const method = req.method ?? 'GET';
    if (method !== 'GET') {
      if (
        !String(req.headers['content-type'] ?? '').startsWith(
          'application/json',
        )
      )
        fail(415, 'Format de demande invalide.');
      const origin = req.headers.origin;
      const local =
        process.env['NODE_ENV'] !== 'production' &&
        origin &&
        ['localhost', '127.0.0.1'].includes(new URL(origin).hostname);
      if (!origin || (!local && origin !== `https://${req.headers.host}`))
        fail(403, 'Origine de la demande non autorisée.');
      if (
        Number(req.headers['content-length'] ?? 0) > 8192 ||
        JSON.stringify(req.body ?? '').length > 8192
      )
        fail(413, 'Demande trop volumineuse.');
    }
    if (route === 'config' && method === 'GET') {
      let capacity = 120,
        price = 500,
        occupied = 0;
      if (configured()) {
        const rows =
          await db()`SELECT e.capacity, e.ticket_price, COALESCE((SELECT sum(quantity) FROM ciugb_reservations WHERE status <> 'cancelled'), 0) occupied FROM ciugb_event e WHERE id = 1`;
        if (rows.length) {
          capacity = Number(rows[0]['capacity']);
          price = Number(rows[0]['ticket_price']);
          occupied = Number(rows[0]['occupied']);
        }
      }
      res
        .status(200)
        .json({
          configured: configured(),
          event: {
            name: 'Soirée thriller des 72h',
            dateLabel: 'Date et horaire à confirmer',
            location: 'Campus UGB, Saint-Louis · salle à confirmer',
            ticketPrice: price,
            capacity,
            remaining: Math.max(0, capacity - occupied),
          },
        });
      return;
    }
    if (!configured())
      fail(
        503,
        'Les réservations ne sont pas encore ouvertes. Contactez le club ou réessayez plus tard.',
      );
    if (route === 'admin-session') {
      if (method === 'GET') {
        res.json({ authenticated: authenticated(req) });
        return;
      }
      if (method === 'DELETE') {
        res.setHeader(
          'Set-Cookie',
          'ciugb_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0',
        );
        res.json({ ok: true });
        return;
      }
      if (method !== 'POST') fail(405, 'Méthode non autorisée.');
      await rateLimit(req, 'login', 10, 900);
      const password = body(req)['password'];
      if (
        typeof password !== 'string' ||
        !constantEqual(password, process.env['ADMIN_PASSWORD']!)
      )
        fail(401, 'Mot de passe incorrect.');
      const expires = String(Date.now() + 8 * 60 * 60 * 1000);
      res.setHeader(
        'Set-Cookie',
        `ciugb_admin=${expires}.${signature(expires)}; HttpOnly; ${process.env['NODE_ENV'] === 'production' ? 'Secure; ' : ''}SameSite=Strict; Path=/api; Max-Age=28800`,
      );
      res.json({ authenticated: true });
      return;
    }
    if (route === 'reservations' && method === 'POST') {
      await rateLimit(req, 'reserve', 10, 3600);
      let input: ReservationInput;
      try {
        input = validateReservation(body(req) as unknown as ReservationInput);
      } catch (error) {
        return fail(
          400,
          error instanceof Error ? error.message : 'Coordonnées invalides.',
        );
      }
      const reference = await db().begin(async (tx) => {
        const event =
          await tx`SELECT * FROM ciugb_event WHERE id = 1 FOR UPDATE`;
        if (!event.length)
          return fail(503, 'Les réservations ne sont pas encore ouvertes.');
        const prior =
          await tx`SELECT reference FROM ciugb_reservations WHERE request_id = ${input.requestId}`;
        if (prior.length) return String(prior[0]['reference']);
        const totals =
          await tx`SELECT COALESCE(sum(quantity), 0) occupied FROM ciugb_reservations WHERE status <> 'cancelled'`;
        if (
          Number(totals[0]['occupied']) + input.quantity >
          Number(event[0]['capacity'])
        )
          fail(409, 'Il ne reste pas assez de places.');
        const ref = `R-${randomBytes(16).toString('hex').toUpperCase()}`;
        await tx`INSERT INTO ciugb_reservations (id, reference, request_id, full_name, phone, quantity, amount) VALUES (${randomUUID()}, ${ref}, ${input.requestId}, ${input.fullName}, ${input.phone}, ${input.quantity}, ${input.quantity * Number(event[0]['ticket_price'])})`;
        return ref;
      });
      res.status(201).json(await byReference(String(reference)));
      return;
    }
    if (route === 'reservation' && method === 'POST') {
      await rateLimit(req, 'lookup', 60, 900);
      const reference = body(req)['reference'];
      if (
        typeof reference !== 'string' ||
        !/^R-[A-F\d]{32}$/i.test(reference.trim())
      )
        fail(404, 'Réservation introuvable. Vérifiez votre code.');
      res.json(await byReference((reference as string).trim().toUpperCase()));
      return;
    }
    requireAdmin(req);
    if (route === 'admin-reservations' && method === 'GET') {
      const rows = await db()<
        ReservationRow[]
      >`SELECT r.*, COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'code', t.code, 'checkedInAt', t.checked_in_at) ORDER BY t.code) FROM ciugb_tickets t WHERE t.reservation_id = r.id), '[]'::jsonb) AS tickets FROM ciugb_reservations r ORDER BY r.created_at DESC LIMIT 1000`;
      res.json(rows.map(dto));
      return;
    }
    if (route === 'admin-reservation' && method === 'POST') {
      const data = body(req);
      const id = data['id'];
      const action = data['action'];
      if (
        typeof id !== 'string' ||
        !/^[\da-f-]{36}$/i.test(id) ||
        !['contact', 'validate', 'cancel'].includes(String(action))
      )
        fail(400, 'Demande invalide.');
      await db().begin(async (tx) => {
        const rows = await tx<
          ReservationRow[]
        >`SELECT * FROM ciugb_reservations WHERE id = ${String(id)} FOR UPDATE`;
        if (!rows.length) fail(404, 'Réservation introuvable.');
        const reservation = rows[0];
        if (action === 'contact') {
          await tx`UPDATE ciugb_reservations SET contacted_at = now() WHERE id = ${String(id)}`;
          return;
        }
        if (action === 'cancel') {
          // Verrouiller les billets avant d’annuler, en concurrence avec le scan.
          const tickets =
            await tx`SELECT checked_in_at FROM ciugb_tickets WHERE reservation_id = ${String(id)} FOR UPDATE`;
          if (tickets.some((t) => t['checked_in_at']))
            fail(409, 'Un billet déjà utilisé ne peut pas être annulé.');
          await tx`DELETE FROM ciugb_tickets WHERE reservation_id = ${String(id)}`;
          await tx`UPDATE ciugb_reservations SET status = 'cancelled' WHERE id = ${String(id)}`;
          return;
        }
        if (reservation.status === 'cancelled')
          fail(409, 'Cette réservation est annulée.');
        if (reservation.status === 'validated') return;
        for (let i = 0; i < reservation.quantity; i++)
          await tx`INSERT INTO ciugb_tickets (id, reservation_id, code) VALUES (${randomUUID()}, ${String(id)}, ${`B-${randomBytes(8).toString('hex').toUpperCase()}`})`;
        await tx`UPDATE ciugb_reservations SET status = 'validated', validated_at = now() WHERE id = ${String(id)}`;
      });
      res.json({ ok: true });
      return;
    }
    if (route === 'admin-scan' && method === 'POST') {
      const data = body(req);
      if (
        typeof data['code'] !== 'string' ||
        data['code'].length > 100 ||
        typeof data['confirm'] !== 'boolean'
      )
        fail(400, 'Code invalide.');
      res.json(await scan(String(data['code']), data['confirm'] === true));
      return;
    }
    fail(404, 'Page introuvable.');
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: 'Demande invalide.' });
      return;
    }
    // Ne jamais journaliser le nom, le téléphone, le code privé ou l’URL SQL.
    console.error('CIUGB API: operation failed');
    res
      .status(503)
      .json({
        error:
          'Service momentanément indisponible. Réessayez dans quelques instants.',
      });
  }
}
