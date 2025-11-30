import { test } from '@playwright/test';

test.describe('モバイルUI確認', () => {
  test('ダッシュボードのスクリーンショット', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X サイズ
    await page.goto('/');
    await page.screenshot({ path: 'mobile-dashboard.png', fullPage: true });
  });

  test('顧客一覧のスクリーンショット', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/customers');
    await page.screenshot({ path: 'mobile-customers.png', fullPage: true });
  });

  test('顧客登録フォームのスクリーンショット', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/customers');

    // 新規登録ボタンをクリック
    await page.locator('button:has-text("新規登録")').click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'mobile-customer-form.png', fullPage: true });
  });

  test('架電履歴のスクリーンショット', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/call-histories');
    await page.screenshot({ path: 'mobile-call-histories.png', fullPage: true });
  });
});
