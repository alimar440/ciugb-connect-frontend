import { build } from 'esbuild';
await build({
  entryPoints: ['server/handler.ts'],
  outfile: 'server/runtime.cjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  legalComments: 'none',
});
console.log('API Node prête : server/runtime.cjs');
