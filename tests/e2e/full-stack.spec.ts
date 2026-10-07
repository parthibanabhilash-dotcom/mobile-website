import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync, createHmac } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const enabled = !!process.env.E2E_DATABASE_URL;
const base = process.env.E2E_BASE_URL || 'http://localhost:3000';
const email = `customer-${Date.now()}@example.test`,
  adminEmail = `admin-${Date.now()}@example.test`,
  password = 'Testing-upgrade-2026';
const db = enabled
  ? new PrismaClient({ datasources: { db: { url: process.env.E2E_DATABASE_URL } } })
  : null;
const title = `Fixture phone ${Date.now()}`;
test.describe('full-stack customer and admin journey', () => {
  test.skip(!enabled, 'Requires an isolated E2E_DATABASE_URL and the loopback gateway fixture');
  test.beforeAll(async () => {
    if (!new URL(process.env.E2E_DATABASE_URL!).pathname.includes('_test'))
      throw new Error('E2E database name must contain _test');
    const salt = randomBytes(16).toString('hex');
    await db!.user.create({
      data: {
        email: adminEmail,
        name: 'Test Administrator',
        role: 'ADMIN',
        verified: true,
        passwordHash: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
      },
    });
  });
  test.afterAll(async () => {
    if (!db) return;
    const users = await db.user.findMany({ where: { email: { in: [email, adminEmail] } } });
    const ids = users.map((u) => u.id);
    const orders = await db.order.findMany({
      where: { userId: { in: ids } },
      include: { items: true, reservations: true },
    });
    for (const o of orders)
      for (const r of o.reservations)
        if (r.status === 'ACTIVE')
          await db.variant.update({
            where: { id: r.variantId },
            data: { reserved: { decrement: r.quantity } },
          });
    for (const o of orders)
      if (o.paymentStatus === 'PAID' && !o.inventoryConflict && o.status !== 'CANCELLED')
        for (const item of o.items)
          await db.variant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
    await db.webhookEvent.deleteMany({
      where: { OR: orders.map((o) => ({ id: { startsWith: `fixture-${o.id}` } })) },
    });
    await db.payment.deleteMany({ where: { order: { userId: { in: ids } } } });
    await db.order.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.product.deleteMany({ where: { title } });
    await db.$disconnect();
  });
  test('register, verify, preserve cart, pay, fulfil, review, and manage products', async ({
    page,
    browser,
    request,
  }) => {
    test.setTimeout(240000);
    await page.goto('/products/iphone-16-pro');
    await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
    await page.getByRole('button', { name: 'Save to wishlist' }).click();
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Create an account', exact: true }).click();
    await expect(page.locator('.auth-card input')).toHaveCount(3);
    await page.getByLabel('Name', { exact: true }).fill('Test Customer');
    await page.getByLabel('Email ID', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'verification link' })).toBeVisible();
    const files = (await readdir('.mail')).sort().reverse();
    let token = '';
    for (const file of files) {
      const text = await readFile(path.join('.mail', file), 'utf8');
      if (text.includes(`To: ${email}`) && text.includes('mode=verify')) {
        token = text.match(/token=([a-f0-9]{64})/)?.[1] || '';
        break;
      }
    }
    expect(token).not.toBe('');
    expect(
      (
        await page.request.post('/api/auth/verify', { headers: { origin: base }, data: { token } })
      ).status(),
    ).toBe(200);
    await page.getByRole('button', { name: 'Back to sign in' }).click();
    await page.getByLabel('Email ID', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Where should it go?' })).toBeVisible();
    await page.getByLabel('Full name', { exact: true }).fill('Test Customer');
    await page.getByLabel('Mobile number', { exact: true }).fill('9876543210');
    await page.getByLabel('Street address', { exact: true }).fill('42 Integration Road');
    await page.getByLabel('City', { exact: true }).fill('Mumbai');
    await page.getByLabel('State', { exact: true }).fill('Maharashtra');
    await page.getByLabel('Pincode', { exact: true }).fill('400001');
    await page.getByRole('button', { name: 'Save address', exact: true }).click();
    await page.getByRole('button', { name: 'Continue to summary' }).click();
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await page.route('https://checkout.razorpay.com/v1/checkout.js', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `window.Razorpay=class{constructor(o){this.options=o;window.fixtureOptions=o;}on(e,cb){window.fixtureFailed=cb;}open(){window.fixtureOpened=true;window.fixtureOpenCount=(window.fixtureOpenCount||0)+1;}};`,
      }),
    );
    await page.getByRole('button', { name: 'Pay securely with Razorpay' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).fixtureOpened)).toBe(true);
    const options = await page.evaluate(() => ({
      orderId: (window as any).fixtureOptions.order_id,
    }));
    await expect(page).toHaveURL(/order=/);
    const localId = new URL(page.url()).searchParams.get('order')!;
    expect(localId).toBeTruthy();
    let unexpectedCartWrites = 0;
    await page.route('**/api/cart', (route) => {
      if (route.request().method() === 'PUT') {
        unexpectedCartWrites++;
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Stock already reserved' }),
        });
      }
      return route.continue();
    });
    await page.evaluate(() => (window as any).fixtureOptions.modal.ondismiss());
    await expect(
      page.getByText('Checkout closed. You can check payment status in your orders or try again.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Pay securely with Razorpay' }).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).fixtureOptions.order_id))
      .toBe(options.orderId);
    await expect.poll(() => page.evaluate(() => (window as any).fixtureOpenCount)).toBe(2);
    await page.evaluate(() => (window as any).fixtureFailed());
    await expect(
      page.getByText(
        'Payment did not complete. No order will be marked paid without verification.',
      ),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Pay securely with Razorpay' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).fixtureOpenCount)).toBe(3);
    await expect
      .poll(
        async () =>
          await db!.order.count({
            where: { userId: (await db!.user.findUniqueOrThrow({ where: { email } })).id },
          }),
      )
      .toBe(1);
    expect(unexpectedCartWrites).toBe(0);
    await page.unroute('**/api/cart');
    const mismatched = await (
      await request.post('http://127.0.0.1:4060/test/pay', {
        data: { orderId: options.orderId, amountDelta: 1 },
      })
    ).json();
    expect(
      (
        await page.request.post('/api/payments/verify', {
          headers: { origin: base },
          data: { orderId: localId, ...mismatched },
        })
      ).status(),
    ).toBe(409);
    const payment = await (
      await request.post('http://127.0.0.1:4060/test/pay', {
        data: { orderId: options.orderId, status: 'authorized' },
      })
    ).json();
    const invalid = await page.request.post('/api/payments/verify', {
      headers: { origin: base },
      data: { orderId: localId, ...payment, razorpay_signature: '0'.repeat(64) },
    });
    expect(invalid.status()).toBe(400);
    expect((await db!.order.findUniqueOrThrow({ where: { id: localId } })).paymentStatus).toBe(
      'PENDING',
    );
    expect((await request.get(`${base}/api/orders/${localId}`)).status()).toBe(401);
    expect((await page.request.get('/api/admin/dashboard')).status()).toBe(403);
    await page.evaluate(async (result) => {
      await (window as any).fixtureOptions.handler(result);
    }, payment);
    await expect(
      page.getByText(
        'We’re confirming your payment with Razorpay. This page will update after backend verification.',
      ),
    ).toBeVisible();
    expect((await db!.order.findUniqueOrThrow({ where: { id: localId } })).paymentStatus).toBe(
      'PENDING',
    );
    await page.reload();
    await expect(
      page.getByText(
        'We’re confirming your payment with Razorpay. This page will update after backend verification.',
      ),
    ).toBeVisible();
    expect((await db!.order.findUniqueOrThrow({ where: { id: localId } })).paymentStatus).toBe(
      'PENDING',
    );
    const captured = await request.post('http://127.0.0.1:4060/test/capture', {
      data: { paymentId: payment.razorpay_payment_id },
    });
    expect(captured.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /Payment successful/ })).toBeVisible();
    const order = await db!.order.findUniqueOrThrow({
      where: { id: localId },
      include: { items: true },
    });
    expect(order.paymentStatus).toBe('PAID');
    expect(order.status).toBe('CONFIRMED');
    const stock = (await db!.variant.findUniqueOrThrow({ where: { id: order.items[0].variantId } }))
      .stock;
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: payment.razorpay_payment_id } } },
    });
    const signature = createHmac('sha256', 'fixture-webhook').update(payload).digest('hex');
    for (let i = 0; i < 2; i++)
      expect(
        (
          await request.post(`${base}/api/payments/webhook`, {
            headers: {
              'content-type': 'application/json',
              'x-razorpay-signature': signature,
              'x-razorpay-event-id': `fixture-${localId}`,
            },
            data: payload,
          })
        ).status(),
      ).toBe(200);
    expect(
      (await db!.variant.findUniqueOrThrow({ where: { id: order.items[0].variantId } })).stock,
    ).toBe(stock);
    expect(
      (
        await request.post(`${base}/api/payments/webhook`, {
          headers: { 'content-type': 'application/json', 'x-razorpay-signature': '0'.repeat(64) },
          data: payload,
        })
      ).status(),
    ).toBe(400);
    for (const event of ['order.paid', 'payment.authorized', 'payment.captured']) {
      const raw = JSON.stringify({
        event,
        payload: { payment: { entity: { id: payment.razorpay_payment_id } } },
      });
      expect(
        (
          await request.post(`${base}/api/payments/webhook`, {
            headers: {
              'content-type': 'application/json',
              'x-razorpay-signature': createHmac('sha256', 'fixture-webhook')
                .update(raw)
                .digest('hex'),
              'x-razorpay-event-id': `fixture-${localId}-${event}`,
            },
            data: raw,
          })
        ).status(),
      ).toBe(200);
    }
    expect(await db!.payment.count({ where: { orderId: localId } })).toBe(1);
    expect(
      (await db!.variant.findUniqueOrThrow({ where: { id: order.items[0].variantId } })).stock,
    ).toBe(stock);
    await page.reload();
    await expect(page.getByRole('heading', { name: /Payment successful/ })).toBeVisible();
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await admin.goto(`${base}/admin`);
    await admin.getByLabel('Email ID', { exact: true }).fill(adminEmail);
    await admin.getByLabel('Password', { exact: true }).fill(password);
    await admin.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(admin.getByRole('heading', { name: 'Store overview' })).toBeVisible();
    await admin.goto(`${base}/admin/orders/${localId}`);
    for (const status of ['PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
      await admin.getByLabel('Next status', { exact: true }).selectOption(status);
      if (status === 'SHIPPED')
        await admin
          .getByLabel('Tracking information', { exact: true })
          .fill('Test Carrier · TEST123');
      await admin.getByRole('button', { name: 'Update order' }).click();
      await expect
        .poll(async () => (await db!.order.findUniqueOrThrow({ where: { id: localId } })).status)
        .toBe(status);
    }
    await page.goto('/products/iphone-16-pro');
    await page.getByRole('tab', { name: 'Reviews', exact: true }).click();
    await page
      .getByLabel('Share your experience')
      .fill('A thoughtful store with clear checkout and reliable order tracking.');
    await page.getByRole('button', { name: 'Submit review' }).click();
    await expect(page.getByText('Your review has been saved.')).toBeVisible();
    expect(
      await db!.review.count({ where: { userId: order.userId, productId: 'iphone-16-pro' } }),
    ).toBe(1);
    await admin.getByLabel('Next status', { exact: true }).selectOption('RETURNED');
    await admin.getByRole('button', { name: 'Update order' }).click();
    await expect
      .poll(async () => (await db!.order.findUniqueOrThrow({ where: { id: localId } })).status)
      .toBe('RETURNED');
    await admin.getByRole('button', { name: 'Record manual refund' }).click();
    await admin.getByLabel('Razorpay / bank refund reference').fill('SIMULATED-' + localId);
    await admin.getByLabel('I confirm this refund has already been processed.').check();
    await admin.getByRole('button', { name: 'Record refund', exact: true }).click();
    await expect
      .poll(
        async () => (await db!.order.findUniqueOrThrow({ where: { id: localId } })).refundStatus,
      )
      .toBe('REFUNDED');
    await admin.goto(`${base}/admin/products/new`);
    await admin.getByLabel('Product title', { exact: true }).fill(title);
    await admin
      .getByLabel('Description', { exact: true })
      .fill('A phone created by the browser integration test.');
    await admin.getByLabel('SKU', { exact: true }).fill(`SKU-${Date.now()}`);
    await admin.getByLabel('Inventory units', { exact: true }).fill('10');
    await admin.locator('input[type=file]').setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6oSAAAAAASUVORK5CYII=',
        'base64',
      ),
    });
    await expect(admin.getByAltText('Product preview 1')).toBeVisible();
    await admin.getByRole('button', { name: 'Save product', exact: true }).click();
    await expect(admin.getByRole('heading', { name: 'Products', exact: true })).toBeVisible({
      timeout: 45000,
    });
    await expect.poll(() => db!.product.count({ where: { title } })).toBe(1);
    await admin.screenshot({ path: 'test-results/admin-products.png', fullPage: true });
    // Recovery must invalidate existing sessions and consume its token once.
    expect(
      (
        await page.request.post('/api/auth/forgot', { headers: { origin: base }, data: { email } })
      ).status(),
    ).toBe(200);
    let resetToken = '';
    for (const file of (await readdir('.mail')).sort().reverse()) {
      const message = await readFile(path.join('.mail', file), 'utf8');
      if (message.includes(`To: ${email}`) && message.includes('mode=reset')) {
        resetToken = message.match(/token=([a-f0-9]{64})/)?.[1] || '';
        break;
      }
    }
    expect(resetToken).not.toBe('');
    const resetData = { token: resetToken, password: password + '-recovered' };
    expect(
      (
        await page.request.post('/api/auth/reset', { headers: { origin: base }, data: resetData })
      ).status(),
    ).toBe(200);
    expect((await (await page.request.get('/api/auth/me')).json()).user).toBeNull();
    expect(
      (
        await page.request.post('/api/auth/reset', { headers: { origin: base }, data: resetData })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post('/api/auth/login', {
          headers: { origin: base },
          data: { email, password: resetData.password },
        })
      ).status(),
    ).toBe(200);
    await adminContext.close();
  });
});
