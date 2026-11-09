import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler, { closeDatabaseConnection } from './handler';

const url = process.env['TEST_DATABASE_URL'];
describe(
  'Reservation API with real PostgreSQL',
  { skip: !url, concurrency: false },
  () => {
    let sql: ReturnType<typeof postgres>, server: Server, origin: string;
    const password = 'test-only-organizer-password';
    before(async () => {
      assert.ok(
        url && new URL(url).pathname.endsWith('_test'),
        'Use a dedicated database whose name ends in _test.',
      );
      process.env['DATABASE_URL'] = url;
      process.env['ADMIN_PASSWORD'] = password;
      process.env['ADMIN_SESSION_SECRET'] =
        'test-only-session-secret-with-at-least-32-characters';
      process.env['NODE_ENV'] = 'test';
      sql = postgres(url!, { max: 2 });
      await sql.unsafe(
        await readFile(
          new URL('../database/schema.sql', import.meta.url),
          'utf8',
        ),
      );
      server = createServer(async (request, response) => {
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const req = request as VercelRequest,
          res = response as VercelResponse;
        req.query = {};
        const text = Buffer.concat(chunks).toString();
        try {
          req.body = text ? JSON.parse(text) : undefined;
        } catch {
          req.body = text;
        }
        res.status = (code: number) => {
          response.statusCode = code;
          return res;
        };
        res.json = (value: unknown) => {
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(value));
          return res;
        };
        await handler(req, res);
      });
      await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve),
      );
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      origin = `http://127.0.0.1:${address.port}`;
    });
    beforeEach(async () => {
      await sql`TRUNCATE ciugb_tickets, ciugb_reservations, ciugb_request_limits`;
      await sql`UPDATE ciugb_event SET capacity=120, ticket_price=500 WHERE id=1`;
    });
    after(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await closeDatabaseConnection();
      await sql.end();
    });
    async function call(
      path: string,
      data?: unknown,
      cookie = '',
      method = data === undefined ? 'GET' : 'POST',
    ) {
      const response = await fetch(`${origin}/api/${path}`, {
        method,
        headers: {
          ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
          Origin: origin,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
      return {
        status: response.status,
        body: await response.json(),
        cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '',
      };
    }
    const input = (quantity = 1) => ({
      fullName: 'Awa Exemple',
      phone: '+221 77 000 00 00',
      quantity,
      requestId: randomUUID(),
    });
    const login = async () =>
      (await call('admin-session', { password })).cookie;
    it('reports public settings without exposing server secrets', async () => {
      const result = await call('config');
      assert.equal(result.status, 200);
      assert.equal(result.body.configured, true);
      assert.equal(result.body.event.ticketPrice, 500);
      assert.ok(!JSON.stringify(result.body).includes(password));
    });
    it('stores minimal data, stays pending and handles a repeated submission once', async () => {
      const data = input(2);
      const result = await call('reservations', data);
      const retry = await call('reservations', data);
      assert.equal(result.status, 201);
      assert.equal(result.body.status, 'pending_payment');
      assert.deepEqual(result.body.tickets, []);
      assert.equal(result.body.amount, 1000);
      assert.equal(result.body.phone, '+221770000000');
      assert.equal(retry.body.id, result.body.id);
      assert.ok(!('email' in result.body));
      const publicResult = await call('reservation', {
        reference: result.body.reference,
      });
      assert.deepEqual(publicResult.body.tickets, []);
      assert.equal(
        Number(
          (await sql`SELECT count(*) FROM ciugb_reservations`)[0]['count'],
        ),
        1,
      );
    });
    it('rejects admin reads and validation without an authenticated session', async () => {
      const reservation = (await call('reservations', input())).body;
      assert.equal((await call('admin-reservations')).status, 401);
      assert.equal(
        (
          await call('admin-reservation', {
            id: reservation.id,
            action: 'validate',
          })
        ).status,
        401,
      );
      assert.equal(
        (await call('admin-scan', { code: 'anything', confirm: true })).status,
        401,
      );
      assert.equal(
        (
          await call(
            'admin-reservations',
            undefined,
            'ciugb_admin=9999999999999.forged',
          )
        ).status,
        401,
      );
      assert.equal(
        Number((await sql`SELECT count(*) FROM ciugb_tickets`)[0]['count']),
        0,
      );
    });
    it('creates exactly one ticket per place only after manual payment confirmation', async () => {
      const reservation = (await call('reservations', input(2))).body;
      const cookie = await login();
      assert.equal(
        (
          await call(
            'admin-reservation',
            { id: reservation.id, action: 'contact' },
            cookie,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await call(
            'admin-reservation',
            { id: reservation.id, action: 'validate' },
            cookie,
          )
        ).status,
        200,
      );
      await call(
        'admin-reservation',
        { id: reservation.id, action: 'validate' },
        cookie,
      );
      const result = (
        await call('reservation', { reference: reservation.reference })
      ).body;
      assert.equal(result.status, 'validated');
      assert.equal(result.tickets.length, 2);
      assert.notEqual(result.tickets[0].id, result.tickets[1].id);
      assert.ok(result.contactedAt);
      assert.ok(result.validatedAt);
    });
    it('validates an entry once even when two scans arrive together', async () => {
      const reservation = (await call('reservations', input())).body;
      const cookie = await login();
      await call(
        'admin-reservation',
        { id: reservation.id, action: 'validate' },
        cookie,
      );
      const paid = (
        await call('reservation', { reference: reservation.reference })
      ).body;
      const code = paid.tickets[0].id;
      assert.equal(
        (await call('admin-scan', { code, confirm: false }, cookie)).body
          .status,
        'valid',
      );
      const results = await Promise.all([
        call('admin-scan', { code, confirm: true }, cookie),
        call('admin-scan', { code, confirm: true }, cookie),
      ]);
      assert.equal(
        results.filter((r) => r.body.title === 'Entrée validée').length,
        1,
      );
      assert.equal(
        results.filter((r) => r.body.title === 'Entrée déjà validée').length,
        1,
      );
      assert.equal(
        (
          await call(
            'admin-scan',
            { code: paid.tickets[0].code, confirm: false },
            cookie,
          )
        ).body.status,
        'used',
      );
    });
    it('refuses entry for a reservation code and invalidates a cancelled ticket', async () => {
      const reservation = (await call('reservations', input())).body;
      const cookie = await login();
      assert.notEqual(
        (
          await call(
            'admin-scan',
            { code: reservation.reference, confirm: false },
            cookie,
          )
        ).body.status,
        'valid',
      );
      await call(
        'admin-reservation',
        { id: reservation.id, action: 'validate' },
        cookie,
      );
      const paid = (
        await call('reservation', { reference: reservation.reference })
      ).body;
      await call(
        'admin-reservation',
        { id: reservation.id, action: 'cancel' },
        cookie,
      );
      assert.deepEqual(
        (await call('reservation', { reference: reservation.reference })).body
          .tickets,
        [],
      );
      assert.notEqual(
        (
          await call(
            'admin-scan',
            { code: paid.tickets[0].id, confirm: true },
            cookie,
          )
        ).body.status,
        'valid',
      );
      assert.equal(
        (
          await call(
            'admin-reservation',
            { id: reservation.id, action: 'validate' },
            cookie,
          )
        ).status,
        409,
      );
    });
    it('does not cancel a ticket that has already entered', async () => {
      const reservation = (await call('reservations', input())).body;
      const cookie = await login();
      await call(
        'admin-reservation',
        { id: reservation.id, action: 'validate' },
        cookie,
      );
      const paid = (
        await call('reservation', { reference: reservation.reference })
      ).body;
      await call(
        'admin-scan',
        { code: paid.tickets[0].id, confirm: true },
        cookie,
      );
      assert.equal(
        (
          await call(
            'admin-reservation',
            { id: reservation.id, action: 'cancel' },
            cookie,
          )
        ).status,
        409,
      );
    });
    it('reserves the last place atomically and rejects invalid personal details', async () => {
      await sql`UPDATE ciugb_event SET capacity=1 WHERE id=1`;
      const results = await Promise.all([
        call('reservations', input()),
        call('reservations', input()),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
      assert.equal(
        (await call('reservations', { ...input(), phone: 'wrong' })).status,
        400,
      );
      assert.equal(
        (await call('reservations', { ...input(), quantity: 1.5 })).status,
        400,
      );
    });
    it('blocks requests from an unrelated origin', async () => {
      const result = await fetch(`${origin}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://unrelated.example',
        },
        body: JSON.stringify(input()),
      });
      assert.equal(result.status, 403);
    });
    it('does not accept an unconfigured deployment as a working database', async () => {
      const secret = process.env['ADMIN_SESSION_SECRET'];
      delete process.env['ADMIN_SESSION_SECRET'];
      try {
        assert.equal((await call('config')).body.configured, false);
        assert.equal((await call('reservations', input())).status, 503);
      } finally {
        process.env['ADMIN_SESSION_SECRET'] = secret;
      }
    });
  },
);
