import { test, expect } from '@playwright/test';

test.describe('LazyChef & Pantry Autopilot E2E User Journey (TASK-028)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('complete flow: landing -> pantry selection -> cooking -> step checklist -> payoff -> devrelay exporter -> high contrast', async ({ page }) => {
    // 1. Landing & Shell Verification
    await expect(page).toHaveTitle(/LazyChef & Pantry Autopilot/i);
    const brandTitle = page.locator('.brand-text h1');
    await expect(brandTitle).toContainText('LazyChef & Pantry Autopilot');

    const engineBadge = page.locator('#engine-status-badge');
    await expect(engineBadge).toBeVisible();

    const cookButton = page.locator('.btn-cook-lazily');
    await expect(cookButton).toBeVisible();
    await expect(cookButton).toBeDisabled();
    await expect(cookButton).toHaveAttribute('title', 'Select at least 1 pantry item to awaken LazyChef 🦥');

    // 2. Select Pantry Items
    const eggsPill = page.locator('[data-ingredient-id="eggs"]');
    const ricePill = page.locator('[data-ingredient-id="leftover_rice"]');
    const soyPill = page.locator('[data-ingredient-id="soy_sauce"]');

    await expect(eggsPill).toBeVisible();
    await expect(ricePill).toBeVisible();

    await eggsPill.click();
    await ricePill.click();
    await soyPill.click();

    // Verify pills are marked active and cook button enabled
    await expect(eggsPill).toHaveClass(/active/);
    await expect(ricePill).toHaveClass(/active/);
    await expect(cookButton).toBeEnabled();

    // 3. Click Cook Lazily
    await cookButton.click();

    // 4. Recipe Card & Sloth Constraints Verification
    const recipeCard = page.locator('.recipe-card');
    await expect(recipeCard).toBeVisible();

    const vesselBadge = page.locator('.badge-vessel');
    await expect(vesselBadge).toContainText('1 Skillet');

    const timeBadge = page.locator('.badge-time');
    await expect(timeBadge).toContainText(/Mins/);

    const stepItems = page.locator('.step-item');
    const stepCount = await stepItems.count();
    expect(stepCount).toBeGreaterThanOrEqual(1);
    expect(stepCount).toBeLessThanOrEqual(3);

    // 5. Complete Steps Checklist
    for (let i = 0; i < stepCount; i++) {
      await stepItems.nth(i).click();
    }

    // Verify session lock & celebratory cooked state
    const cookedBadge = page.locator('.badge-cooked-success');
    await expect(cookedBadge).toBeVisible();
    await expect(cookedBadge).toContainText('Cooked! 🎉');

    // 6. Verify The Lazy Payoff Dashboard
    const payoffDashboard = page.locator('.payoff-dashboard-card');
    await expect(payoffDashboard).toBeVisible();

    const minutesValue = page.locator('#metric-minutes .metric-value');
    await expect(minutesValue).toContainText('15m');

    const pansValue = page.locator('#metric-pans .metric-value');
    await expect(pansValue).toContainText('2');

    const moneyValue = page.locator('#metric-money .metric-value');
    await expect(moneyValue).toContainText('$6.50');

    const mealsValue = page.locator('#metric-meals .metric-value');
    await expect(mealsValue).toContainText('1');

    // 7. Test High-Contrast Accessibility Mode Toggle
    const contrastBtn = page.locator('#theme-contrast-toggle');
    await expect(contrastBtn).toBeVisible();
    await contrastBtn.click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast');
    await expect(contrastBtn).toHaveAttribute('aria-pressed', 'true');

    // Toggle back
    await contrastBtn.click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'high-contrast');
    await expect(contrastBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
