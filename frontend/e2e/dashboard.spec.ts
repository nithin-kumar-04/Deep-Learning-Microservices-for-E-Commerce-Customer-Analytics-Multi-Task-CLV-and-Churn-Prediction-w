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
];

const OVERVIEW = {
  historical_monthly: [
    { date: '2024-01', revenue: 120000 },
    { date: '2024-02', revenue: 135000 },
  ],
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
  ],
  scatter: [
    { id: '12345', recency: 10, monetary: 1500, frequency: 25, clv: 2400, segment: 'Champions' },
  ],
};

const PRODUCTS = {
  top_products: [
    { stock_code: 'SKU-001', description: 'Ceramic Mug', revenue: 12500.75, quantity: 840, buyers: 312 },
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

test('renders the Velora dashboard and live health status', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Velora' })).toBeVisible();
  await expect(page.getByText('System Online')).toBeVisible();
  await expect(page.getByText(/Demo data: UCI Online Retail.*v1\.1\.0/)).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Customer Simulator' })).toBeVisible();
});

test('scores a customer and shows CLV, churn and recommendations', async ({ page }) => {
  await page.getByRole('button', { name: 'Generate AI Insights' }).click();

  await expect(page.getByText('1234.56')).toBeVisible();
  await expect(page.getByText('91.0')).toBeVisible();
  await expect(page.getByText('High Risk')).toBeVisible();
  await expect(page.getByText('AI Rationale (SHAP Contributions)')).toBeVisible();

  await expect(page.getByText('Ceramic Mug')).toBeVisible();
  await expect(page.getByText('Tea Towel')).toBeVisible();
});

test('generates and copies a win-back email draft', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.getByRole('button', { name: 'Draft Win-Back Email' }).click();

  const draft = page.getByText(/We miss you!/);
  await expect(draft).toBeVisible();

  await page.getByRole('button', { name: 'Copy email draft' }).click();
  await expect(page.getByRole('button', { name: 'Email draft copied' })).toBeVisible();
});

test('lazy-loads the overview, segments and products tabs', async ({ page }) => {
  await page.getByRole('tab', { name: 'Overview' }).click();
  await expect(page.getByText('Revenue Trajectory')).toBeVisible();
  await expect(page.getByText('£12,456,789')).toBeVisible();
  await expect(page.getByText('£412,346')).toBeVisible();

  await page.getByRole('tab', { name: 'Segments' }).click();
  await expect(page.getByText('Customer Personas')).toBeVisible();
  await expect(page.getByRole('table').getByText('Champions')).toBeVisible();

  await page.getByRole('tab', { name: 'Products' }).click();
  await expect(page.getByText('Top Selling Products')).toBeVisible();
  await expect(page.getByText('Ceramic Mug')).toBeVisible();
  await expect(page.getByText('SKU-001')).toBeVisible();
});

test('exports at-risk customers to CSV', async ({ page }) => {
  await page.getByRole('tab', { name: 'At-Risk Customers' }).click();

  await expect(page.getByText('#12345')).toBeVisible();
  await expect(page.getByText('£1500.50')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('high_risk_customers.csv');
});

test('validates batch files and reports scoring success', async ({ page }) => {
  await page.getByRole('tab', { name: 'Batch Processing' }).click();

  await page.locator('#batch-upload').setInputFiles({
    name: 'missing-columns.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('foo,bar\n1,2\n'),
  });

  await expect(page.getByRole('tabpanel', { name: 'Batch Processing' }).getByRole('alert')).toContainText('Missing required columns');

  await page.locator('#batch-upload').setInputFiles({
    name: 'customers.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('CustomerID,Recency,Frequency,Monetary\n12345,10,5,500\n'),
  });

  await expect(page.getByText('customers.csv')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Process Batch File' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('batch_predictions.csv');
  await expect(page.getByRole('status')).toContainText('Batch scored successfully');
});

test('shows a retryable error when the segments API fails', async ({ page }) => {
  let segmentRequests = 0;

  // Registered after the page loaded, so it only overrides the lazy /segments
  // call that happens when the tab is opened.
  await page.route(/^http:\/\/localhost:8000\/segments$/, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }

    segmentRequests += 1;
    if (segmentRequests === 1) {
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

  await page.getByRole('tab', { name: 'Segments' }).click();

  await expect(page.getByRole('tabpanel', { name: 'Segments' }).getByRole('alert')).toContainText('The Velora API ran into an error');

  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Customer Personas')).toBeVisible();
});
