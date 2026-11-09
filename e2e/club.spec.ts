import { test, expect, Page } from '@playwright/test';

const adminPassword = process.env['E2E_ADMIN_PASSWORD'];
async function reserve(page: Page, name: string, quantity = 1): Promise<void> {
  await page.goto(`/commander?quantite=${quantity}`);
  await page.getByLabel('Nom complet *').fill(name);
  await page.getByLabel('Numéro de téléphone *').fill('+221770000000');
  await page.getByRole('button', { name:'Enregistrer ma réservation' }).click();
  await expect(page.locator('.reservation-code code')).toBeVisible();
}
async function validate(page: Page, name: string): Promise<void> {
  await page.goto('/admin');
  await page.getByLabel('Mot de passe organisateur').fill(adminPassword!);
  await page.getByRole('button', {name:'Se connecter', exact:true}).click();
  await page.locator('.admin-booking').filter({hasText:name}).getByRole('button', {name:'Confirmer le paiement'}).click();
  await page.getByRole('button', {name:'Oui, paiement reçu — valider le billet'}).click();
  await expect(page.locator('.admin-booking').filter({hasText:name}).getByText('Billet validé', {exact:true})).toBeVisible();
}
test('cinema home, minimal form and themes fit desktop and mobile', async ({page}) => {
  await page.goto('/'); await expect(page.locator('h1')).toContainText('Une soirée cinéma.');
  await expect(page.locator('.thriller-art img')).toHaveAttribute('src','cinema-poster.svg');
  await expect(page.locator('main')).not.toContainText('Carte membre');
  for (const path of ['/cinema','/commander','/mes-billets','/admin','/scan']) {
    await page.goto(path); await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.goto('/commander'); await expect(page.locator('form input')).toHaveCount(2);
  const before = await page.locator('html').getAttribute('data-theme'); await page.locator('.theme-toggle').click(); await page.reload();
  expect(await page.locator('html').getAttribute('data-theme')).not.toBe(before);
});
test('pending reservations expose no QR or download', async ({page}) => {
  await reserve(page, `Participant ${Date.now()}`, 2); await page.goto('/mes-billets');
  await expect(page.getByText('En attente de paiement',{exact:true})).toBeVisible();
  await expect(page.locator('app-qr')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Télécharger le billet'})).toHaveCount(0);
});
test('admin and scanner show login before exposing private content', async ({page}) => {
  for (const path of ['/admin','/scan']) {
    await page.goto(path);
    await expect(page.getByRole('heading',{name:'Connexion administrateur'})).toBeVisible();
    await expect(page.getByLabel('Mot de passe organisateur')).toBeVisible();
    await expect(page.locator('.admin-booking')).toHaveCount(0);
    await expect(page.getByLabel('Code du billet',{exact:true})).toHaveCount(0);
  }
});
test('failed authentication leaves the login visible', async ({page}) => {
  await page.goto('/admin');
  await page.getByLabel('Mot de passe organisateur').fill('wrong-password');
  await page.getByRole('button',{name:'Se connecter',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Connexion administrateur'})).toBeVisible();
  await expect(page.locator('.admin-booking')).toHaveCount(0);
});
test('connected API: payment confirmation unlocks downloadable tickets', async ({page}) => {
  test.skip(!adminPassword, 'Requires a test backend and E2E_ADMIN_PASSWORD; no demo authentication bypass.');
  const name = `Validation ${Date.now()}`; await reserve(page,name,2); await validate(page,name);
  await page.goto('/mes-billets'); await expect(page.locator('app-qr img')).toHaveCount(2);
  const pending = page.waitForEvent('download'); await page.getByRole('button',{name:'Télécharger le billet'}).first().click(); expect((await pending).suggestedFilename()).toMatch(/\.pdf$/);
});
test('connected API: cancellation hides QR and downloads', async ({page}) => {
  test.skip(!adminPassword, 'Requires a test backend and E2E_ADMIN_PASSWORD.');
  const name=`Annulation ${Date.now()}`; await reserve(page,name); await validate(page,name);
  await page.locator('.admin-booking').filter({hasText:name}).getByRole('button',{name:'Annuler la réservation'}).click();
  await page.goto('/mes-billets'); await expect(page.getByRole('heading',{name:'Réservation annulée',exact:true})).toBeVisible();
  await expect(page.locator('app-qr')).toHaveCount(0);
});
