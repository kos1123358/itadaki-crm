import { test, expect } from '@playwright/test';

test.describe('Itadaki CRM - 動作確認', () => {
  test('ダッシュボードページが正しく表示される', async ({ page }) => {
    await page.goto('/');

    // ヘッダータイトルが表示されることを確認
    await expect(page.locator('text=Itadaki CRM')).toBeVisible();

    // ダッシュボードのタイトルが表示されることを確認
    await expect(page.locator('h1:has-text("ダッシュボード")')).toBeVisible();

    // 統計カードが表示されることを確認
    await expect(page.locator('text=総顧客数')).toBeVisible();
    await expect(page.locator('text=アクティブ顧客')).toBeVisible();
    await expect(page.locator('text=総架電数')).toBeVisible();

    // ステータス別顧客数のカードが表示されることを確認
    await expect(page.locator('text=ステータス別顧客数')).toBeVisible();
  });

  test('顧客管理ページに遷移できる', async ({ page }) => {
    await page.goto('/');

    // サイドバーまたはモバイルメニューから顧客管理リンクをクリック
    const customerLink = page.locator('a:has-text("顧客管理")').first();
    await customerLink.click();

    // URLが変更されることを確認
    await expect(page).toHaveURL('/customers');

    // 顧客管理ページのタイトルが表示されることを確認
    await expect(page.locator('h1:has-text("顧客管理")')).toBeVisible();

    // 新規登録ボタンが表示されることを確認
    await expect(page.locator('button:has-text("新規登録")')).toBeVisible();
  });

  test('架電履歴ページに遷移できる', async ({ page }) => {
    await page.goto('/');

    // サイドバーまたはモバイルメニューから架電履歴リンクをクリック
    const callHistoryLink = page.locator('a:has-text("架電履歴")').first();
    await callHistoryLink.click();

    // URLが変更されることを確認
    await expect(page).toHaveURL('/call-histories');

    // 架電履歴ページのタイトルが表示されることを確認
    await expect(page.locator('h1:has-text("架電履歴一覧")')).toBeVisible();
  });

  test('ダッシュボードに戻れる', async ({ page }) => {
    await page.goto('/customers');

    // ダッシュボードリンクをクリック
    const dashboardLink = page.locator('a:has-text("ダッシュボード")').first();
    await dashboardLink.click();

    // URLが変更されることを確認
    await expect(page).toHaveURL('/');

    // ダッシュボードが表示されることを確認
    await expect(page.locator('h1:has-text("ダッシュボード")')).toBeVisible();
  });

  test('レスポンシブレイアウトが機能する', async ({ page }) => {
    // モバイルビューポート
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // モバイルメニューボタンが表示されることを確認（MenuOutlinedアイコン）
    const menuButton = page.locator('button[type="button"]').first();
    await expect(menuButton).toBeVisible();

    // デスクトップビューポート
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // サイドバーのメニューリンクが表示されることを確認
    await expect(page.locator('a[href="/"]').first()).toBeVisible();
  });
});
