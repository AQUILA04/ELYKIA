import { expect, Locator, Page } from '@playwright/test';
import { LIVE_ACCOUNTS } from './accounts';

async function fillModalInput(modal: Locator, value: string): Promise<void> {
  const input = modal.locator('ion-input input:not([type="checkbox"]), input.native-input:not([type="checkbox"])').last();
  await input.waitFor({ state: 'visible', timeout: 20_000 });
  await input.click();
  await input.fill('');
  await input.fill(value);
  await input.dispatchEvent('input');
  await input.dispatchEvent('change');
  await input.blur();
}

async function visibleDialogText(page: Page): Promise<string> {
  const parts = await Promise.all([
    page.locator('ion-alert').last().innerText().catch(() => ''),
    page.locator('ion-toast').last().innerText().catch(() => ''),
  ]);
  return parts.map((text) => text.trim()).filter(Boolean).join(' | ');
}

export async function completeDailyConsentIfNeeded(page: Page): Promise<void> {
  const modal = page
    .locator('ion-modal')
    .filter({ hasText: /Démarrage des opérations|mot de passe de connexion/i })
    .last();
  if (!(await modal.isVisible({ timeout: 8_000 }).catch(() => false))) {
    return;
  }

  await fillModalInput(modal, LIVE_ACCOUNTS.commercial.password);
  await modal.getByRole('button', { name: 'Continuer' }).click();

  const challenge = modal.locator('.challenge-code');
  await expect(challenge).toBeVisible({ timeout: 15_000 });
  const code = ((await challenge.innerText()) ?? '').trim();
  expect(code.length).toBeGreaterThan(3);

  await fillModalInput(modal, code);
  await modal.locator('ion-checkbox').click();
  await modal.getByRole('button', { name: /Démarrer mes opérations/ }).click();
  await expect(modal).toBeHidden({ timeout: 20_000 });
}

export async function confirmOperationAmount(page: Page, amount: number): Promise<void> {
  const modal = page.locator('ion-modal').filter({ hasText: 'Confirmation du montant' }).last();
  await expect(modal).toBeVisible({ timeout: 20_000 });
  await fillModalInput(modal, String(amount));
  await modal.getByRole('button', { name: 'Confirmer' }).click();

  const toast = page.locator('ion-toast');
  if (await toast.isVisible({ timeout: 1_500 }).catch(() => false)) {
    throw new Error(`Confirmation montant refusée: ${(await toast.innerText()).trim()}`);
  }
  await expect(modal).toBeHidden({ timeout: 20_000 });
}

export async function closeTontineReceipt(page: Page): Promise<void> {
  await expect(page.getByText('Aperçu du Reçu')).toBeVisible({ timeout: 45_000 });
  await page.locator('ion-loading').waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
  const close = page.getByTestId('e2e-tontine-receipt-close');
  await expect(close).toBeVisible({ timeout: 10_000 });
  await close.click();
  await page.locator('ion-modal').filter({ hasText: 'Aperçu du Reçu' }).waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
}

export async function backToCommercialTabs(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 8 && !/\/tabs/.test(page.url()); attempt += 1) {
    await page.locator('ion-loading').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    const ionBack = page.locator('ion-buttons[slot="start"] ion-button').first();
    const headerBack = page.locator('button.header-icon').first();
    if (await ionBack.isVisible({ timeout: 800 }).catch(() => false)) {
      await ionBack.click();
    } else if (await headerBack.isVisible({ timeout: 800 }).catch(() => false)) {
      await headerBack.click();
    } else {
      break;
    }
    await page.waitForTimeout(500);
  }
  await expect(page).toHaveURL(/\/tabs/, { timeout: 20_000 });
}

export async function openTontineDashboard(page: Page): Promise<void> {
  if (/\/tontine\/dashboard/.test(page.url())) {
    await expect(page.locator('.member-card, .empty-state').first()).toBeVisible({ timeout: 30_000 });
    return;
  }
  await expect(page).toHaveURL(/\/tabs/, { timeout: 30_000 });
  await page.getByTestId('e2e-action-tontine').click();
  await expect(page).toHaveURL(/\/tontine\/dashboard/, { timeout: 30_000 });
  await expect(page.locator('.header-title, .member-card, .empty-state').first()).toBeVisible({
    timeout: 30_000,
  });
}

function parseFcfa(label: string): number | null {
  const digits = label.replace(/[^\d]/g, '');
  if (!digits) {
    return null;
  }
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

export type RecordTontineCollectionOptions = {
  amount?: number;
  notes?: string;
};

export async function recordTontineCollection(
  page: Page,
  options: RecordTontineCollectionOptions = {},
): Promise<number> {
  await openTontineDashboard(page);
  await expect(page.locator('.member-card').first()).toBeVisible({ timeout: 90_000 });
  await page.locator('.member-card').first().click();
  await expect(page).toHaveURL(/member-detail/, { timeout: 20_000 });
  await page.getByTestId('e2e-member-record-collection').click();
  await expect(page).toHaveURL(/collection-recording/, { timeout: 20_000 });
  await expect(page.locator('ion-title').filter({ hasText: 'Enregistrer une Cotisation' })).toBeVisible({
    timeout: 20_000,
  });

  const memberItem = page.getByTestId('e2e-tontine-member-item').first();
  if (await memberItem.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await memberItem.click();
  }

  const expectedLabel = page.locator('.selected-member-card .member-amount');
  await expect(expectedLabel).toBeVisible({ timeout: 15_000 });
  const expectedAmount = parseFcfa(await expectedLabel.innerText());
  const collectionAmount =
    options.amount && options.amount >= 100
      ? options.amount
      : expectedAmount && expectedAmount >= 100
        ? expectedAmount
        : 1000;

  const amountHost = page.getByTestId('e2e-tontine-collection-amount').last();
  await expect(amountHost).toBeVisible({ timeout: 15_000 });
  await amountHost.locator('input').fill(String(collectionAmount));
  await amountHost.evaluate((host, value) => {
    const ion = host as HTMLIonInputElement;
    ion.value = String(value);
    const native = (host.shadowRoot?.querySelector('input') ?? host.querySelector('input')) as HTMLInputElement | null;
    if (native) {
      native.value = String(value);
      native.dispatchEvent(new Event('input', { bubbles: true }));
      native.dispatchEvent(new Event('change', { bubbles: true }));
    }
    host.dispatchEvent(new CustomEvent('ionInput', { bubbles: true, detail: { value } }));
    host.dispatchEvent(new CustomEvent('ionChange', { bubbles: true, detail: { value } }));
  }, collectionAmount);

  if (options.notes) {
    const notesHost = page.getByTestId('e2e-tontine-collection-notes');
    if (await notesHost.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await notesHost.locator('textarea').fill(options.notes).catch(() => undefined);
      await notesHost.evaluate((host, value) => {
        const ion = host as HTMLIonTextareaElement;
        ion.value = value;
        host.dispatchEvent(new CustomEvent('ionInput', { bubbles: true, detail: { value } }));
        host.dispatchEvent(new CustomEvent('ionChange', { bubbles: true, detail: { value } }));
      }, options.notes);
    }
  }

  const submit = page.getByTestId('e2e-tontine-collection-submit');
  await expect(submit).toBeEnabled({ timeout: 10_000 });
  await submit.click();

  const dialog = page.locator('ion-modal, ion-alert').last();
  await expect(dialog).toBeVisible({ timeout: 25_000 });
  const dialogText = ((await dialog.innerText().catch(() => '')) || '').trim();
  if (
    /utilisateur non trouvé|membre requis|erreur/i.test(dialogText) &&
    !/Confirmation du montant|Démarrage des opérations/i.test(dialogText)
  ) {
    throw new Error(`Collecte bloquée: ${dialogText}`);
  }

  await completeDailyConsentIfNeeded(page);
  await confirmOperationAmount(page, collectionAmount);

  await page.locator('ion-loading').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {});

  const fallback = page.locator('ion-alert').filter({ hasText: /Enregistrement serveur impossible/i });
  if (await fallback.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await fallback.getByRole('button', { name: 'Enregistrer hors ligne' }).click();
    await fallback.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await page.locator('ion-loading').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {});
  }

  const blocked = page.locator('ion-alert').filter({
    hasText: /Session Clôturée|Utilisateur non trouvé/i,
  });
  if (await blocked.isVisible({ timeout: 2_000 }).catch(() => false)) {
    throw new Error(`Collecte échouée: ${(await blocked.innerText()).trim()} | ${await visibleDialogText(page)}`);
  }

  await expect(page.getByText('Aperçu du Reçu')).toBeVisible({ timeout: 45_000 });
  return collectionAmount;
}
