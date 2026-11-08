import { test, expect, Page } from '@playwright/test';
import QRCode from 'qrcode';
async function fillDetails(page: Page) {
  await page.getByLabel('Prénom *').fill('Awa');
  await page.getByLabel('Nom *', { exact: true }).fill('Test');
  await page.getByLabel('Adresse email *').fill('awa@example.com');
  await page.getByLabel('Téléphone *').fill('+221770000000');
}
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-08T12:00:00Z') });
});
test('annual benefits are visible on home, membership and checkout, without horizontal overflow', async ({
  page,
}, testInfo) => {
  for (const path of ['/', '/adhesion', '/commander?offre=membership']) {
    await page.goto(path);
    await expect(
      page.getByText("1 000 FCFA. Une année entière d'avantages.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText('Un popcorn offert pendant cette soirée', { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.goto('/');
  await page.screenshot({
    path: `artifacts/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test('membership checkout validates fields, saves an individual card and downloads it', async ({
  page,
}) => {
  await page.goto('/commander?offre=membership');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Complétez');
  await fillDetails(page);
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Tout est bon ?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Simuler le paiement' }).click();
  await expect(
    page.getByRole('heading', { name: 'C’est prêt, Awa !' }),
  ).toBeVisible();
  await expect(page.locator('app-qr img')).toBeVisible();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ciugb-connect-demo-v1')!),
  );
  const order = data.orders.find((o: { demo: boolean }) => !o.demo);
  expect(order.payment.amount).toBe(1000);
  expect(order.tickets).toHaveLength(0);
  expect(order.membership.membershipEndDate).toBe('2027-07-31');
  expect(order.membership.id).not.toContain('awa');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger la carte' }).click();
  expect((await downloading).suggestedFilename()).toMatch(/\.pdf$/);
  await page.goto('/mes-billets');
  await page.reload();
  await expect(page.getByText('Awa Test', { exact: true })).toBeVisible();
});
test('three tickets receive three distinct QR codes', async ({ page }) => {
  await page.goto('/commander?offre=ticket&quantite=3');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await fillDetails(page);
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByText('Orange Money', { exact: true }).click();
  await page
    .getByRole('button', { name: 'Simuler le paiement — 1500 FCFA' })
    .click();
  await expect(page.locator('app-qr img')).toHaveCount(3);
  const identifiers = await page
    .locator('.digital-ticket > div > code')
    .allTextContents();
  expect(new Set(identifiers).size).toBe(3);
});
test('entry and popcorn remain independent and cannot be used twice', async ({
  page,
}) => {
  await page.goto('/scan');
  await page
    .getByRole('button', { name: 'Membre valide', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Carte membre valide' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Valider le retrait du popcorn' })
    .click();
  await expect(
    page.getByRole('button', { name: 'Retrait déjà enregistré' }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Valider l’entrée', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('button', { name: 'Valider l’entrée', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Entrée déjà validée' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Entrée déjà enregistrée' }),
  ).toBeDisabled();
  await page.goto('/admin');
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'Popcorns distribués' })
      .locator('strong'),
  ).toHaveText('1');
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'Entrées validées' })
      .locator('strong'),
  ).toHaveText('2');
});

test('admin and control are dedicated to the 72h only', async ({ page }, testInfo) => {
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Modifier la simulation' }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.evaluate(() => {
    const data = JSON.parse(
      localStorage.getItem('ciugb-connect-demo-v1') || 'null',
    );
    if (data) {
      data.checkIns.push({
        id: 'outside',
        credentialId: 'demo-member',
        eventId: 'atelier-club',
        checkedInAt: '2027-03-20',
      });
      localStorage.setItem('ciugb-connect-demo-v1', JSON.stringify(data));
    }
  });
  await page.reload();
  await expect(page.locator('.stat-card').filter({ hasText: 'Entrées validées' }).locator('strong')).toHaveText('1');
  await expect(
    page.getByRole('heading', { name: 'Les 72h, côté coulisses.' }),
  ).toBeVisible();
  await expect(page.locator('.event-72h-config article')).toHaveCount(1);
  await expect(page.locator('main')).not.toContainText('Atelier du Club');
  await expect(page.locator('main')).not.toContainText('prochaine rentrée');
  await page.screenshot({ path: `artifacts/admin-72h-${testInfo.project.name}.png`, fullPage: true });
  await page.goto('/scan');
  await expect(page.locator('#scan-event')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('prochaine rentrée');
  await page.getByRole('button', { name: 'Scanner un QR code', exact: true }).click();
  await page.screenshot({ path: `artifacts/scan-qr-${testInfo.project.name}.png`, fullPage: true });
});

test('a manual ticket code and an uploaded QR address the same entry', async ({
  page,
}) => {
  await page.goto('/scan');
  await page.getByLabel('Code du billet ou numéro membre').fill('t-demoticket');
  await page.getByRole('button', { name: 'Vérifier l’accès' }).click();
  await expect(
    page.getByRole('heading', { name: 'Ticket valide', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Valider l’entrée', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Scanner un QR code', exact: true })
    .click();
  const buffer = await QRCode.toBuffer('demo-ticket', { width: 500 });
  await page
    .getByLabel('Ou lire le QR depuis une image')
    .setInputFiles({ name: 'ticket.png', mimeType: 'image/png', buffer });
  await expect(
    page.getByRole('heading', { name: 'Entrée déjà validée' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Entrée déjà enregistrée' }),
  ).toBeDisabled();
});

test('camera decodes a QR and releases its stream after recognition', async ({
  page,
}) => {
  await page.goto('/scan');
  const dataUrl = await QRCode.toDataURL('demo-member', { width: 500 });
  await page.evaluate((source) => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async () => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 500;
        canvas.getContext('2d')!.drawImage(image, 0, 0);
        const stream = canvas.captureStream(5);
        (window as Window & { cameraTrack?: MediaStreamTrack }).cameraTrack =
          stream.getVideoTracks()[0];
        return stream;
      },
    });
  }, dataUrl);
  await page
    .getByRole('button', { name: 'Scanner un QR code', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Activer la caméra', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Carte membre valide' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as Window & { cameraTrack?: MediaStreamTrack }).cameraTrack
          ?.readyState,
    ),
  ).toBe('ended');
  await expect(
    page.getByRole('button', { name: 'Valider l’entrée', exact: true }),
  ).toBeEnabled();
});

test('camera refusal keeps manual consultation available', async ({ page }) => {
  await page.goto('/scan');
  await page.evaluate(() =>
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async () => {
        throw new DOMException('Denied', 'NotAllowedError');
      },
    }),
  );
  await page
    .getByRole('button', { name: 'Scanner un QR code', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Activer la caméra', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Accès caméra refusé');
  await page
    .getByRole('button', { name: 'Saisir un code', exact: true })
    .click();
  await page.getByLabel('Code du billet ou numéro membre').fill('CI-member');
  await page.getByRole('button', { name: 'Vérifier l’accès' }).click();
  await expect(
    page.getByRole('heading', { name: 'Carte membre valide' }),
  ).toBeVisible();
});
test('expired cards, unknown codes and used tickets show distinct results', async ({
  page,
}) => {
  await page.goto('/scan');
  await page
    .getByRole('button', { name: 'Carte expirée', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Accès refusé' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'QR inconnu', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'QR code inconnu' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Déjà utilisé', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Entrée déjà validée' }),
  ).toBeVisible();
});
test('all pages render and admin filters find the expired fixture', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of [
    '/',
    '/cinema',
    '/adhesion',
    '/commander',
    '/mes-billets',
    '/scan',
    '/admin',
  ]) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.getByLabel('Type d’achat').selectOption('membership');
  await page.getByLabel('Statut', { exact: true }).selectOption('expired');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('DEMO-expired');
  expect(errors).toEqual([]);
});
