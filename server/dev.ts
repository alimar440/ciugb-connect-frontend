import { createServer } from 'node:http';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './handler';

// Serveur de développement seulement ; Vercel exécute api/handler.ts en production.
createServer(async (request, response) => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8192) {
      response.writeHead(413).end();
      return;
    }
    chunks.push(Buffer.from(chunk));
  }
  const req = request as VercelRequest;
  const res = response as VercelResponse;
  req.query = Object.fromEntries(
    new URL(request.url ?? '/', 'http://localhost').searchParams,
  );
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    req.body = text ? JSON.parse(text) : undefined;
  } catch {
    req.body = text;
  }
  res.status = (status: number) => {
    response.statusCode = status;
    return res;
  };
  res.json = (value: unknown) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(value));
    return res;
  };
  await handler(req, res);
}).listen(3001, '127.0.0.1', () =>
  console.log('API locale : http://127.0.0.1:3001'),
);
