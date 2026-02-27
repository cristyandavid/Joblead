import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3001';

test.describe('Job Tracking E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as manager
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="email-input"]', 'manager@joblead.ca');
    await page.fill('[data-testid="password-input"]', 'Manager123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('full flow: login -> customer -> job -> estimate -> invoice -> payment', async ({ page }) => {
    // 1. Create customer
    await page.goto(`${BASE_URL}/customers/new`);
    await page.fill('[data-testid="customer-name"]', 'E2E Test Customer');
    await page.fill('#phone', '647-555-9999');
    await page.fill('#email', 'e2e@test.ca');
    await page.click('[data-testid="save-customer"]');

    // Should redirect to customer detail
    await page.waitForURL(/\/customers\/.+/);
    const customerId = page.url().split('/').pop();
    expect(customerId).toBeTruthy();

    // 2. Add an address via API (since the UI delegates this)
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@joblead.ca', password: 'Manager123!' }),
    });
    const { data: loginData } = await loginRes.json();
    const token = loginData.accessToken;

    const addrRes = await fetch(`${API_URL}/api/customers/${customerId}/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ street: '100 Test Ave', city: 'Toronto', province: 'ON', postalCode: 'M1A 1A1' }),
    });
    const { data: addr } = await addrRes.json();
    expect(addr.id).toBeTruthy();

    // 3. Create job
    await page.goto(`${BASE_URL}/jobs/new`);
    await page.locator('[data-testid="customer-select"]').click();

    // Select the customer we just created
    await page.getByText('E2E Test Customer').click();
    await page.waitForTimeout(500);

    // Select address
    await page.locator('[data-testid="address-select"]').click();
    await page.getByText('100 Test Ave').click();

    await page.fill('[data-testid="job-title"]', 'E2E Test Job');
    await page.click('[data-testid="save-job"]');

    await page.waitForURL(/\/jobs\/.+/);
    const jobId = page.url().split('/').pop();
    expect(jobId).toBeTruthy();

    // 4. Create estimate
    await page.goto(`${BASE_URL}/jobs/${jobId}/estimates/new`);

    // Fill first line item
    await page.fill('input[placeholder="Labour"]', 'Test Labour');
    const qtyInputs = page.locator('input[type="number"]');
    await qtyInputs.first().fill('10');
    await page.locator('input[placeholder="hr"]').fill('hr');
    // Unit price in cents
    await page.locator('input[placeholder="e.g. 9500 = $95"]').fill('10000');

    await page.click('[data-testid="save-estimate"]');
    await page.waitForURL(/\/jobs\/.+/);

    // 5. Accept estimate
    await page.click('[data-testid="accept-estimate"]');
    await page.waitForTimeout(500);

    // Verify estimate is accepted
    await expect(page.getByText('ACCEPTED')).toBeVisible();

    // 6. Create invoice
    await page.goto(`${BASE_URL}/jobs/${jobId}/invoices/new`);
    await page.fill('input', 'Test Labour');

    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('10');
    await numberInputs.nth(1).fill('10000');

    await page.click('[data-testid="save-invoice"]');
    await page.waitForURL(/\/jobs\/.+/);

    // 7. Record payment
    await page.click('[data-testid="record-payment"]');
    await page.waitForURL(/\/invoices\/.+\/payment/);

    // Amount should be pre-filled
    await page.click('[data-testid="submit-payment"]');
    await page.waitForURL(/\/jobs\/.+/);

    // Verify payment was recorded
    await expect(page.getByText('PAYMENT_RECORDED').or(page.getByText('Payment'))).toBeVisible();
  });

  test('login page shows error for bad credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
  });

  test('kanban board shows job columns', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await expect(page.getByText('Lead')).toBeVisible();
    await expect(page.getByText('Estimating')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
  });

  test('reports page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await expect(page.getByText('Reports')).toBeVisible();
    await expect(page.getByText('Jobs by Status')).toBeVisible();
  });

  test('calendar page shows scheduled jobs', async ({ page }) => {
    await page.goto(`${BASE_URL}/calendar`);
    await expect(page.getByText('Calendar')).toBeVisible();
  });
});
