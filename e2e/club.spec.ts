import { test, expect, Page } from '@playwright/test';
import QRCode from 'qrcode';
async function reserve(
  page: Page,
  fullName = 'Awa Test',
  quantity = 1,
): Promise<string> {
  await page.goto(`/commander?quantite=${quantity}`);
  await page.getByLabel('Nom complet *').fill(fullName);
  await page.getByLabel('Numéro de téléphone *').fill('+221770000000');
  await page
    .getByRole('button', { name: 'Enregistrer ma réservation' })
    .click();
  await expect(
    page.getByRole('heading', { name: new RegExp('Votre place est réservée') }),
  ).toBeVisible();
  return (await page.locator('.reservation-code code').textContent())!;
}
async function validate(page: Page, fullName = 'Awa Test'): Promise<void> {
  await page.goto('/admin');
  const booking = page.locator('.admin-booking').filter({ hasText: fullName });
  await booking.getByRole('button', { name: 'Confirmer le paiement' }).click();
  await page
    .getByRole('button', { name: 'Oui, paiement reçu — valider le billet' })
    .click();
  await expect(
    booking.getByText('Billet validé', { exact: true }),
  ).toBeVisible();
}
test('thriller home, minimal form and both themes fit mobile and desktop', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Une soirée cinéma.');
  await expect(page.locator('main')).not.toContainText('Carte membre');
  await page.screenshot({
    path: `artifacts/thriller-home-${info.project.name}.png`,
    fullPage: true,
  });
  for (const path of [
    '/',
    '/cinema',
    '/commander',
    '/mes-billets',
    '/admin',
    '/scan',
  ]) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.goto('/commander');
  await expect(page.locator('form input')).toHaveCount(2);
  await expect(page.locator('input[type=email]')).toHaveCount(0);
  const toggle = page.locator('.theme-toggle');
  const old = await page.locator('html').getAttribute('data-theme');
  await toggle.click();
  expect(await page.locator('html').getAttribute('data-theme')).not.toBe(old);
  await page.reload();
  expect(await page.locator('html').getAttribute('data-theme')).not.toBe(old);
});
test('reservation stays locked until payment confirmation, then offers separate tickets', async ({
  page,
}) => {
  const reference = await reserve(page, 'Awa Test', 2);
  await expect(page.locator('app-qr')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Télécharger le billet' }),
  ).toHaveCount(0);
  await page.goto('/mes-billets');
  await expect(
    page.getByText('En attente de paiement', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('app-qr')).toHaveCount(0);
  await page.goto('/admin');
  const booking = page
    .locator('.admin-booking')
    .filter({ hasText: 'Awa Test' });
  await booking.getByRole('button', { name: 'Marquer contacté' }).click();
  await expect(booking.getByText('Contact enregistré')).toBeVisible();
  await page.goto('/mes-billets');
  await expect(page.locator('app-qr')).toHaveCount(0);
  await validate(page);
  await page.goto('/mes-billets');
  await expect(page.locator('app-qr img')).toHaveCount(2);
  const downloading = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Télécharger le billet' })
    .first()
    .click();
  expect((await downloading).suggestedFilename()).toMatch(/\.pdf$/);
  await page.evaluate(() =>
    localStorage.removeItem('ciugb-reservation-references-v2'),
  );
  await page.reload();
  await expect(page.locator('app-qr')).toHaveCount(0);
  await page
    .getByLabel('Retrouver une réservation avec son code')
    .fill(reference);
  await page.getByRole('button', { name: 'Consulter', exact: true }).click();
  await expect(page.locator('app-qr img')).toHaveCount(2);
});
test('cancelled reservation exposes neither QR nor download', async ({
  page,
}) => {
  await reserve(page, 'Test Annulation');
  await validate(page, 'Test Annulation');
  await page.goto('/admin');
  await page
    .locator('.admin-booking')
    .filter({ hasText: 'Test Annulation' })
    .getByRole('button', { name: 'Annuler la réservation' })
    .click();
  await page.goto('/mes-billets');
  await expect(
    page.getByRole('heading', { name: 'Réservation annulée', exact: true }),
  ).toBeVisible();
  await expect(page.locator('app-qr')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Télécharger le billet' }),
  ).toHaveCount(0);
});
test('manual code and QR image consume the same validated ticket once', async ({
  page,
}) => {
  await page.goto('/scan');
  await page.getByLabel('Code du billet').fill('B-DEMO-VALIDE');
  await page.getByRole('button', { name: 'Vérifier le billet' }).click();
  await expect(
    page.getByRole('heading', { name: 'Billet valide', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Valider l’entrée', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Scanner un QR code', exact: true })
    .click();
  await page
    .getByLabel('Ou lire le QR depuis une image')
    .setInputFiles({
      name: 'ticket.png',
      mimeType: 'image/png',
      buffer: await QRCode.toBuffer('demo-ticket', { width: 500 }),
    });
  await expect(
    page.getByRole('heading', { name: 'Entrée déjà validée' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Billet déjà utilisé' }),
  ).toBeDisabled();
});
test('pending reservation code is refused at the entrance', async ({
  page,
}) => {
  await page.goto('/scan');
  await page
    .getByRole('button', { name: 'Paiement en attente', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Accès refusé' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Valider l’entrée' }),
  ).toBeDisabled();
});
