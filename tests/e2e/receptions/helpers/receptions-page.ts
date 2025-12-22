import { Locator, Page, expect } from '@playwright/test';

export interface PackInput {
  varietyLabel: string;
  formatLabel: string;
  trayLabel: string;
  traysQuantity: number;
  grossWeightKg: number;
  palletId?: number;
  palletTrays?: number;
}

export class ReceptionsPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async stubSilentPrint(): Promise<void> {
    await this.page.evaluate(() => {
      const api: any = (window as any).electronAPI ?? {};
      api.printHtml = () => Promise.resolve({ success: true });
      (window as any).electronAPI = api;
    });
  }

  async goto(): Promise<void> {
    await this.page.goto('http://localhost:3000/home/receptions/newRecepcion', {
      waitUntil: 'domcontentloaded',
    });
    await this.page.waitForSelector('[data-test-id="details-container"]', { timeout: 15000 });
    // Wait for producer options to be loaded
    await this.page.waitForSelector('[data-test-id="transaction-data-select"][data-has-options="true"]', { timeout: 10000 });
  }

  async selectProducer(label: string): Promise<void> {
    const root = this.page.locator('[data-test-id="transaction-data-select"]');
    const input = root.locator('[data-test-id="auto-complete-input"]');

    // Click the input to focus it
    await input.click();
    await input.fill('');
    // Press ArrowDown to open the dropdown
    await input.press('ArrowDown');
    await this.page.waitForTimeout(500);

    // Find and click the option with the matching label
    const option = this.page.locator('[data-test-id="auto-complete-list"]').locator('li').filter({ hasText: label });
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();

    await expect(root.locator('[data-test-id="auto-complete-input"]')).toHaveValue(label, { timeout: 5000 });
  }

  async setGuide(value: string): Promise<void> {
    const guideInput = this.page.locator('[data-test-id="transaction-data-guide"]');
    await guideInput.fill('');
    await guideInput.type(value);
  }

  async addPack(): Promise<number> {
    await this.page.locator('[data-test-id="details-container-add-pack"]').click();
    const cards = this.page.locator('[data-test-id="reception-pack-card"]');
    const total = await cards.count();
    const index = total - 1;
    await cards.nth(index).waitFor({ state: 'visible', timeout: 5000 });
    return index;
  }

  async configurePack(index: number, input: PackInput): Promise<void> {
    const card = this.packCard(index);
    await this.selectOption(card.locator('[data-test-id="pack-variety-select"]'), input.varietyLabel);
    await this.selectOption(card.locator('[data-test-id="pack-format-select"]'), input.formatLabel);
    await this.selectOption(card.locator('[data-test-id="pack-tray-select"]'), input.trayLabel);

    const traysInput = card.locator('input[data-test-id="pack-trays-quantity"]');
    await traysInput.fill('');
    await traysInput.type(String(input.traysQuantity));

    const grossInput = card.locator('[data-test-id="gross-weight-input"]');
    await grossInput.fill('');
    await grossInput.type(String(input.grossWeightKg));

    if (typeof input.palletId === 'number') {
      await this.assignPallet(index, input.palletId, input.palletTrays ?? input.traysQuantity);
    }
  }

  async assignPallet(index: number, palletId: number, trays: number): Promise<void> {
    await this.assignPallets(index, [{ palletId, trays }]);
  }

  async assignPallets(index: number, assignments: Array<{ palletId: number; trays: number }>): Promise<void> {
    if (!assignments.length) {
      return;
    }

    const card = this.packCard(index);
    await card.locator('[data-test-id="pack-pallet-toggle"]').click();

    const picker = this.page.locator('[data-test-id="pallet-picker"]').first();
    await picker.waitFor({ state: 'visible', timeout: 10000 });

    for (const { palletId, trays } of assignments) {
      const palletOption = this.page.locator(`[data-test-id="pallet-option-${palletId}"]`).first();
      await palletOption.waitFor({ state: 'visible', timeout: 5000 });
      await palletOption.click();

      const quantityInput = this.page.locator(`input[data-test-id="pallet-${palletId}-stepper"]`).first();
      await quantityInput.waitFor({ state: 'visible', timeout: 5000 });
      await quantityInput.fill(String(trays));
    }

    await picker.locator('button', { hasText: 'Cerrar' }).first().click();
  }

  async addTrayDevolution(trayLabel: string, quantity: number): Promise<void> {
    await this.page.locator('[data-test-id="tray-devolution-add"]').click();
    const cards = this.page.locator('[data-test-id="tray-devolution-card"]');
    const total = await cards.count();
    const card = cards.nth(total - 1);
    await card.waitFor({ state: 'visible', timeout: 5000 });

    await this.selectOption(card.locator('[data-test-id="tray-devolution-select"]'), trayLabel);

    const quantityInput = card.locator('input[data-test-id="tray-devolution-quantity"]');
    await quantityInput.fill('');
    await quantityInput.type(String(quantity));
  }

  async openSummary(): Promise<void> {
    const button = this.page.getByRole('button', { name: 'Procesar recepción' });
    await expect(button).toBeEnabled({ timeout: 10000 });
    await button.click();
    await this.summaryDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  summaryDialog(): Locator {
    return this.page.locator('[data-test-id="processed-reception-dialog"]');
  }

  async expectSummaryContains(text: string): Promise<void> {
    await expect(this.summaryDialog()).toContainText(text, { timeout: 5000 });
  }

  async submitReception(): Promise<void> {
    const dialog = this.summaryDialog();
    const saveButton = dialog.locator('button', { hasText: 'Guardar' });
    await saveButton.click();
    await dialog.waitFor({ state: 'hidden', timeout: 15000 });

    const printDialog = this.page.locator('[data-test-id="print-dialog-content"]');
    await printDialog.waitFor({ state: 'visible', timeout: 10000 });

    const printButton = this.page.locator('[data-test-id="print-dialog-actions"]').locator('button', { hasText: /Imprimir/i });
    await printButton.click();
    await printDialog.waitFor({ state: 'hidden', timeout: 10000 });

    // Esperar a que el formulario principal vuelva a su estado inicial
    const processButton = this.page.getByRole('button', { name: 'Procesar recepción' });
    await expect(processButton).toBeDisabled({ timeout: 5000 });
    await expect(this.page.locator('[data-test-id="reception-pack-card"]')).toHaveCount(0, { timeout: 5000 });
  }

  private packCard(index: number): Locator {
    return this.page.locator('[data-test-id="reception-pack-card"]').nth(index);
  }

  private async selectOption(trigger: Locator, label: string): Promise<void> {
    await trigger.click();

    // Las listas de opciones pueden cargarse al abrir el selector; esperamos a que estén listas.
    await expect(trigger).toHaveAttribute('data-has-options', 'true', { timeout: 10000 });

    const option = this.page.locator('li[data-test-id^="select-option-"]').filter({ hasText: label }).first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
  }
}
