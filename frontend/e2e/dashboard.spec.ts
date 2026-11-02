import { test, expect, type Page, type Route } from '@playwright/test';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,x-api-key',
};

const AT_RISK = [
  {
    id: '12345',
    churnRisk: 0.91,
    clv: 1500.5,
    recency: 180,
    freq: 2,
    status: 'High Risk',
  },
  {
    id: '13000',
    churnRisk: 0.72,
    clv: 320.25,
    recency: 120,
    freq: 3,
    status: 'Monitor',
  },
  {
    id: '15000',
    churnRisk: 0.85,
    clv: 980,
    recency: 90,
    freq: 4,
    status: 'High Risk',
  },
  {
    id: '14000',
    churnRisk: 0.31,
    clv: 2200,
    recency: 15,
    freq: 9,
    status: 'Watch',
  },
];

const MONTHS = [
  '2023-01',
  '2023-02',
  '2023-03',
  '2023-04',
  '2023-05',
  '2023-06',
  '2023-07',
  '2023-08',
  '2023-09',
  '2023-10',
  '2023-11',
  '2023-12',
];

const OVERVIEW = {
  historical_monthly: MONTHS.map((date, index) => ({
    date,
    revenue: 900000 + index * 32000,
  })),
  forecast_90d: 412345.67,
  total_historical: 12456789,
};

const SEGMENTS = {
  summary: [
    {
      Segment: 'Champions',
      count: 1200,
      avg_clv: 2450.5,
      avg_churn: 0.08,
      avg_recency: 12.4,
      avg_frequency: 18,
      avg_monetary: 4200,
    },
    {
      Segment: 'Loyal Customers',
      count: 900,
      avg_clv: 1800,
      avg_churn: 0.18,
      avg_recency: 28,
      avg_frequency: 11,
      avg_monetary: 2600,
    },
    {
      Segment: 'At-Risk VIPs',
      count: 420,
      avg_clv: 2900,
      avg_churn: 0.64,
      avg_recency: 96,
      avg_frequency: 4,
      avg_monetary: 3900,
    },
    {
      Segment: 'Hibernating',
      count: 600,
      avg_clv: 380,
      avg_churn: 0.79,
      avg_recency: 210,
      avg_frequency: 2,
      avg_monetary: 420,
    },
  ],
  scatter: [
    { id: '12345', recency: 10, monetary: 1500, frequency: 25, clv: 2400, segment: 'Champions' },
    { id: '13000', recency: 120, monetary: 320, frequency: 3, clv: 900, segment: 'At-Risk VIPs' },
    { id: '15000', recency: 90, monetary: 980, frequency: 4, clv: 1500, segment: 'At-Risk VIPs' },
    { id: '14000', recency: 15, monetary: 2200, frequency: 9, clv: 2100, segment: 'Loyal Customers' },
    { id: '16000', recency: 220, monetary: 120, frequency: 1, clv: 180, segment: 'Hibernating' },
  ],
};

const PRODUCTS = {
  top_products: [
    { stock_code: 'SKU-001', description: 'Ceramic Mug', revenue: 12500.75, quantity: 840, buyers: 312 },
    { stock_code: 'SKU-002', description: 'Tea Towel', revenue: 9400.5, quantity: 610, buyers: 244 },
    { stock_code: 'SKU-003', description: 'Glass Jar', revenue: 7800, quantity: 520, buyers: 198 },
    { stock_code: 'SKU-004', description: 'Paper Garland', revenue: 5200.25, quantity: 430, buyers: 176 },
    { stock_code: 'SKU-005', description: 'Wooden Heart', revenue: 4100, quantity: 390, buyers: 160 },
    { stock_code: 'SKU-006', description: 'Vintage Sign', revenue: 3300.4, quantity: 210, buyers: 121 },
  ],
};

type MockOptions = {
  segmentsFailures?: number;
};

async function mockApi(page: Page, options: MockOptions = {}) {
  let segmentsFailures = options.segmentsFailures ?? 0;
  await page.route(/^http:\/\/localhost:8000\//, async (route: Route) => {
    const request = route.request();

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }

    const { pathname } = new URL(request.url());

    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

    if (pathname === '/health') {
      await json({ status: 'healthy', version: '1.1.0', models_loaded: true });
      return;
    }

    if (pathname === '/at_risk_customers') {
      await json(AT_RISK);
      return;
    }

    if (pathname === '/predict/clv') {
      await json({ churn_probability: 0.91, predicted_clv_90d: 1234.56 });
      return;
    }

    if (pathname === '/explain') {
      await json({
        base_value: 0.35,
        prediction: 0.91,
        contributions: { Recency: 0.4, Frequency: -0.1, Monetary: 0.26 },
      });
      return;
    }

    if (pathname.startsWith('/recommend/')) {
      await json({
        customer_id: 12345,
        recommendations: [
          { rank: 1, stock_code: 'SKU-001', description: 'Ceramic Mug', affinity_score: 0.92 },
          { rank: 2, stock_code: 'SKU-002', description: 'Tea Towel', affinity_score: 0.81 },
        ],
      });
      return;
    }

    if (/^\/customer\/[^/]+\/rfm$/.test(pathname)) {
      await json({ recency: 10, frequency: 25, monetary: 1500 });
      return;
    }

    if (pathname.startsWith('/generate_email/')) {
      await json({
        email_template: 'Hi there,\n\nWe miss you! Here is 15% off your next order.\n\n— Velora',
      });
      return;
    }

    if (pathname === '/business_overview') {
      await json(OVERVIEW);
      return;
    }

    if (pathname === '/segments') {
      if (segmentsFailures > 0) {
        segmentsFailures -= 1;
        await json({ detail: 'temporary failure' }, 500);
        return;
      }
      await json(SEGMENTS);
      return;
    }

    if (pathname === '/product_analytics') {
      await json(PRODUCTS);
      return;
    }

    if (pathname === '/batch_predict') {
      await route.fulfill({
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'content-type': 'text/csv',
          'content-disposition': 'attachment; filename="batch_predictions.csv"',
        },
        body: 'CustomerID,ChurnProbability,PredictedCLV\n12345,0.91,1234.56\n',
      });
      return;
    }

    await json({ detail: `No mock for ${pathname}` }, 404);
  });
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
});

test('renders the app shell, navigation and live health status', async ({ page }) => {
  await expect(
    page.getByRole('heading', { name: 'Revenue that stays ahead of churn' }),
  ).toBeVisible();
  await expect(page.getByText('API online')).toBeVisible();
  await expect(page.getByText(/Model service v1\.1\.0/)).toBeVisible();

  for (const label of ['Overview', 'Simulator', 'Segments', 'Products', 'At-Risk', 'Batch']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  }

  await expect(page.getByText('Historical revenue')).toBeVisible();
  await expect(page.getByText('£12,456,789')).toBeVisible();
  await expect(page.getByText('£412,346').first()).toBeVisible();
  await expect(page.getByText('Segment pulse')).toBeVisible();
});

test('navigates with the command palette keyboard shortcut', async ({ page }) => {
  await page.keyboard.press('Control+K');
  const palette = page.getByRole('dialog', { name: 'Command palette' });
  await expect(palette).toBeVisible();

  await palette.getByLabel('Search views').fill('batch');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'Batch scoring' })).toBeVisible();
  await expect(palette).toHaveCount(0);
});

test('honours deep links and browser history', async ({ page }) => {
  await page.goto('/?deep-link=1#/simulator');
  await expect(page.getByRole('heading', { name: 'Customer simulator' })).toBeVisible();

  await page.getByRole('button', { name: 'Segments', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Customer personas' })).toBeVisible();
  await expect(page).toHaveURL(/#\/segments$/);

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Customer simulator' })).toBeVisible();

  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Customer personas' })).toBeVisible();
});

test('switches between light and dark themes', async ({ page }) => {
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole('button', { name: 'Dark theme' }).click();
  await expect(html).toHaveClass(/dark/);

  await page.getByRole('button', { name: 'Light theme' }).click();
  await expect(html).not.toHaveClass(/dark/);
});

test('scores a customer and shows CLV, churn, SHAP drivers and recommendations', async ({ page }) => {
  await page.getByRole('button', { name: 'Simulator', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Customer simulator' })).toBeVisible();

  await page.getByRole('button', { name: 'Run models' }).click();

  await expect(page.getByText('£1,234.56')).toBeVisible();
  await expect(page.getByText('91.0%')).toBeVisible();
  await expect(page.getByText('Critical', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why the model moved' })).toBeVisible();

  await expect(page.getByText('Ceramic Mug')).toBeVisible();
  await expect(page.getByText('Tea Towel')).toBeVisible();
  await expect(page.getByText('Versus portfolio average')).toBeVisible();

  await page.getByRole('button', { name: 'Run models' }).click();
  await expect(page.getByText('vs last run').first()).toBeVisible();
});

test('generates and copies a win-back email draft', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Simulator', exact: true }).click();

  await page.getByRole('button', { name: 'Draft win-back email' }).click();

  await expect(page.getByText(/We miss you!/)).toBeVisible();

  await page.getByRole('button', { name: 'Copy email draft' }).click();
  await expect(page.getByRole('button', { name: 'Email draft copied' })).toBeVisible();
});

test('renders segment personas, product analytics and exports reports', async ({ page }) => {
  await page.getByRole('button', { name: 'Segments', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Customer personas' })).toBeVisible();
  await expect(page.getByRole('table').getByText('Champions')).toBeVisible();
  await expect(page.getByText('Population composition')).toBeVisible();

  const segmentsDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report' }).click();
  expect((await segmentsDownload).suggestedFilename()).toBe('velora-segments.csv');

  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Product performance' })).toBeVisible();
  await expect(page.getByRole('table').getByText('Ceramic Mug')).toBeVisible();

  const productsDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  expect((await productsDownload).suggestedFilename()).toBe('velora-products.csv');
});

test('filters the at-risk queue and exports the current view', async ({ page }) => {
  await page.getByRole('button', { name: 'At-Risk', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'At-risk workspace' })).toBeVisible();

  const table = page.getByRole('table');
  await expect(table.getByText('#12345')).toBeVisible();
  await expect(table.getByText('#14000')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Exposure' })).toBeVisible();

  await page.getByRole('button', { name: /Critical/ }).click();
  await expect(table.getByText('#12345')).toBeVisible();
  await expect(table.getByText('#14000')).toHaveCount(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('velora-at-risk-customers.csv');
});

test('opens the simulator seeded from an at-risk account', async ({ page }) => {
  await page.getByRole('button', { name: 'At-Risk', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'At-risk workspace' })).toBeVisible();

  await page.getByRole('button', { name: 'Simulate customer 12345' }).click();
  await expect(page.getByRole('heading', { name: 'Customer simulator' })).toBeVisible();
  await expect(page.getByLabel('Customer ID')).toHaveValue('12345');
  await expect(page.getByText('£1,234.56')).toBeVisible();
});

test('validates batch files and reports scoring success', async ({ page }) => {
  await page.getByRole('button', { name: 'Batch', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Batch scoring' })).toBeVisible();

  await page.locator('#batch-upload').setInputFiles({
    name: 'missing-columns.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('foo,bar\n1,2\n'),
  });

  await expect(
    page.getByRole('alert').filter({ hasText: 'Missing required columns' }),
  ).toContainText('Missing required columns');

  await page.locator('#batch-upload').setInputFiles({
    name: 'customers.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('CustomerID,Recency,Frequency,Monetary\n12345,10,5,500\n13000,150,2,100\n'),
  });

  await expect(page.getByText('customers.csv')).toBeVisible();
  await expect(page.getByText(/2 data rows/)).toBeVisible();
  const preview = page.getByRole('table', { name: 'Batch file preview' });
  await expect(preview.getByText('12345')).toBeVisible();
  await expect(preview.getByText('500')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Process batch' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('batch_predictions.csv');

  await expect(page.getByText('Batch complete')).toBeVisible();
  await expect(page.getByText(/2 customers scored/).first()).toBeVisible();
});

test('rejects batch rows with non-numeric RFM values', async ({ page }) => {
  await page.getByRole('button', { name: 'Batch', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Batch scoring' })).toBeVisible();

  await page.locator('#batch-upload').setInputFiles({
    name: 'bad-values.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('CustomerID,Recency,Frequency,Monetary\n12345,ten,5,500\n'),
  });

  const alert = page.getByRole('alert').filter({ hasText: 'invalid values' });
  await expect(alert).toContainText('Row 2: Recency must be a non-negative number');
  await expect(page.getByRole('button', { name: 'Process batch' })).toBeDisabled();
});

test('shows a retryable error when the segments API fails', async ({ page }) => {
  let shouldFail = true;

  await page.route(/^http:\/\/localhost:8000\/segments$/, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }

    if (shouldFail) {
      await route.fulfill({
        status: 500,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
        body: JSON.stringify({ detail: 'temporary failure' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify(SEGMENTS),
    });
  });

  // Reload directly on the deep link so the segment cache starts empty.
  await page.goto('/?segments-test=1#/segments');

  await expect(
    page.getByRole('alert').filter({ hasText: 'The Velora API ran into an error' }),
  ).toBeVisible();

  shouldFail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Customer personas' })).toBeVisible();
  await expect(page.getByRole('table').getByText('Champions')).toBeVisible();
});

test('opens the mobile navigation drawer and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Open navigation' }).click();
  const drawer = page.getByRole('dialog', { name: 'Navigation' });
  await expect(drawer).toBeVisible();

  await drawer.getByRole('button', { name: 'Simulator', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Customer simulator' })).toBeVisible();
});
