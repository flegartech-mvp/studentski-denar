import { expect, test, type Page } from '@playwright/test'

const activeLicense =
  'sd1.eyJlbWFpbEhhc2giOiI5NzNkZmU0NjNlYzg1Nzg1ZjVmOTVhZjViYTM5MDZlZWRiMmQ5MzFjMjRlNjk4MjRhODllYTY1ZGJhNGU4MTNiIiwidGllciI6InN1cHBvcnRlciIsImV4cGlyZXNBdCI6IjIwMjctMDUtMDQiLCJsaWZldGltZSI6ZmFsc2UsImlzc3VlZEF0IjoiMjAyNi0wNS0wNFQxNzozNzo0MS45NjlaIn0.zY4lmlngeXHjmmHBlKFWZkbbHA3RmaOHoCQAp_teulvIQGtoma7TroSrCMoE2Fub9K2bQAb6FcF6kGGUM4twkw'

const seededData = {
  version: 1,
  settings: {
    currency: 'EUR',
    language: 'sl',
    theme: 'default',
    activeProfileId: 'profile-click',
    onboardingCompleted: true,
    onboardingSkipped: false,
    lastBackupAt: '2026-05-01T10:00:00.000Z',
    backupReminderDays: 14,
    pendingSupporterAt: null,
  },
  profiles: [
    {
      id: 'profile-click',
      name: 'Click test',
      month: '2026-05',
      currentBalance: 86,
      budgetLimits: {},
      income: [],
      expenses: [],
      recurring: [],
      roommates: [],
      bills: [],
    },
  ],
  license: null,
}

const populatedData = {
  ...seededData,
  profiles: [
    {
      ...seededData.profiles[0],
      income: [{ id: 'income-seed', amount: 250, date: '2026-05-01', source: 'Seed income', note: 'seed' }],
      expenses: [
        { id: 'expense-seed', amount: 12.5, date: '2026-05-02', category: 'Hrana', note: 'seed lunch' },
      ],
      recurring: [
        {
          id: 'recurring-seed',
          name: 'Rent seed',
          amount: 120,
          category: 'Dom / najemnina',
          dayOfMonth: 5,
          active: true,
          paidMonths: [],
        },
      ],
      roommates: [
        { id: 'mate-a', name: 'Ana', sharePercent: 50 },
        { id: 'mate-b', name: 'Bojan', sharePercent: 50 },
      ],
      bills: [],
    },
  ],
}

function cloudPayload(appData = populatedData) {
  return {
    profile: {
      user_id: '00000000-0000-4000-8000-000000000001',
      monthly_income_estimate: 250,
      rent: 120,
      transport: null,
      food_estimate: null,
      roommates: true,
      current_balance: 86,
      settings: {
        app_data: appData,
        uploaded_at: '2026-05-05T00:00:00.000Z',
      },
    },
    transactions: [
      {
        id: 'income-cloud-click',
        user_id: '00000000-0000-4000-8000-000000000001',
        type: 'income',
        amount: 250,
        category: null,
        description: 'cloud',
        date: '2026-05-01',
        source: 'Cloud',
        metadata: { profile_id: 'profile-click' },
      },
    ],
    recurring: [],
    metadata: {
      user_id: '00000000-0000-4000-8000-000000000001',
      last_sync_at: '2026-05-05T00:00:00.000Z',
      last_pull_at: null,
      last_push_at: '2026-05-05T00:00:00.000Z',
      local_backup_recommended: false,
    },
  }
}

type StrictChecks = {
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
  badResponses: string[]
}

const checksByPage = new WeakMap<Page, StrictChecks>()

test.beforeEach(async ({ page }) => {
  const checks: StrictChecks = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  }
  checksByPage.set(page, checks)

  page.on('console', (message) => {
    if (message.type() === 'error') checks.consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => checks.pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown failure'
    if (!failure.includes('net::ERR_ABORTED')) checks.failedRequests.push(`${request.url()} ${failure}`)
  })
  page.on('response', (response) => {
    const status = response.status()
    if (status >= 400) checks.badResponses.push(`${status} ${response.url()}`)
  })
})

test.afterEach(async ({ page }) => {
  const checks = checksByPage.get(page)
  expect(checks?.pageErrors ?? [], 'uncaught page errors').toEqual([])
  expect(checks?.consoleErrors ?? [], 'browser console errors').toEqual([])
  expect(checks?.failedRequests ?? [], 'failed network requests').toEqual([])
  expect(checks?.badResponses ?? [], 'HTTP 4xx/5xx responses').toEqual([])
})

async function openSeeded(
  page: Page,
  hash = 'dashboard',
  options: {
    data?: typeof seededData
    loggedIn?: boolean
    cloud?: unknown
    cloudError?: string
  } = {},
) {
  const payload = {
    data: options.data ?? seededData,
    loggedIn: options.loggedIn ?? false,
    cloud: options.cloud ?? null,
    cloudError: options.cloudError ?? '',
  }
  await page.goto('/')
  await page.evaluate(({ data, loggedIn, cloud, cloudError }) => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('studentski-denar:v1', JSON.stringify(data))
    if (loggedIn) localStorage.setItem('studentski-denar:test-auth-email', 'click@example.com')
    if (cloud) localStorage.setItem('studentski-denar:test-cloud:v1', JSON.stringify(cloud))
    if (cloudError) localStorage.setItem('studentski-denar:test-cloud-error', cloudError)
  }, payload)
  await page.goto(`/?seed=${Date.now()}#${hash}`)
}

async function expectNoHorizontalOverflow(page: Page) {
  await page.waitForLoadState('networkidle')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(overflow).toBe(false)
}

async function expectAllButtonsNamed(page: Page) {
  const unnamed = await page.getByRole('button').evaluateAll((buttons) =>
    buttons
      .filter((button) => !(button instanceof HTMLInputElement && button.type === 'file'))
      .map((button) => button.textContent?.trim() || button.getAttribute('aria-label') || '')
      .filter((name) => !name),
  )
  expect(unnamed).toEqual([])
}

async function submitFirstFormWithEnter(page: Page, pageTestId: string) {
  const form = page.getByTestId(pageTestId).locator('form').first()
  await form.locator('input, select, textarea').first().focus()
  await page.keyboard.press('Enter')
}

test('desktop route map, navigation, refresh, back-forward, dialogs, and invalid route all work', async ({ page }) => {
  await openSeeded(page, 'dashboard', { data: populatedData })

  const routes = [
    ['dashboard', 'dashboard-page'],
    ['income', 'income-page'],
    ['expenses', 'expenses-page'],
    ['rent', 'rent-page'],
    ['roommates', 'roommates-page'],
    ['insights', 'insights-page'],
    ['supporter', 'supporter-page'],
    ['privacy', 'privacy-page'],
    ['settings', 'settings-page'],
    ['profile', 'profile-page'],
    ['change-password', 'change-password-page'],
  ] as const

  for (const [hash, testId] of routes) {
    await page.goto(`/#${hash}`)
    await expect(page.getByTestId(testId)).toBeVisible()
    await expectAllButtonsNamed(page)
    await page.reload()
    await expect(page.getByTestId(testId)).toBeVisible()
  }

  for (const nav of ['dashboard', 'income', 'expenses', 'rent', 'roommates', 'insights', 'supporter', 'privacy', 'settings', 'profile']) {
    await page.getByTestId(`nav-${nav}`).click()
    await expect(page).toHaveURL(new RegExp(`#${nav}$`))
  }

  await page.goto('/#dashboard')
  await page.getByRole('button', { name: /^Prihodek$/ }).click()
  await expect(page.getByTestId('income-page')).toBeVisible()
  await page.goBack()
  await expect(page.getByTestId('dashboard-page')).toBeVisible()
  await page.goForward()
  await expect(page.getByTestId('income-page')).toBeVisible()

  await page.goto('/#definitely-not-real')
  await expect(page.getByTestId('not-found-page')).toBeVisible()
  await page.getByRole('button').first().click()
  await expect(page.getByTestId('dashboard-page')).toBeVisible()

  await page.goto('/#settings')
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: /Izbri/ }).click()
  await expect(page.getByTestId('settings-page')).toBeVisible()
})

test('finance forms handle invalid data, decimal comma/dot, add/edit/delete, repeat, templates, and keyboard submit', async ({ page }) => {
  await openSeeded(page)

  await page.getByTestId('nav-income').click()
  const income = page.getByTestId('income-page')
  await income.getByRole('button', { name: /Dodaj/ }).click()
  await expect(page.getByTestId('income-row')).toHaveCount(0)
  await income.locator('input').nth(0).fill('letters')
  await income.locator('select').first().selectOption({ index: 1 })
  await income.getByRole('button', { name: /Dodaj/ }).click()
  await expect(page.getByTestId('income-row')).toHaveCount(0)
  await income.locator('input').nth(0).fill('12.50')
  await submitFirstFormWithEnter(page, 'income-page')
  await expect(page.getByTestId('income-row')).toHaveCount(1)
  await income.locator('input').nth(0).fill('25,75')
  await income.locator('select').first().selectOption({ index: 1 })
  await income.getByRole('button', { name: /Dodaj/ }).dblclick()
  await expect(page.getByTestId('income-row')).toHaveCount(2)
  await page.getByTestId('income-row').first().getByRole('button').first().click()
  await income.locator('input').nth(0).fill('30')
  await income.getByRole('button', { name: /Shrani/ }).click()
  await expect(income).toContainText('30')
  await page.getByTestId('income-row').first().getByRole('button').nth(1).click()
  await expect(page.getByTestId('income-row')).toHaveCount(1)

  await page.getByTestId('nav-expenses').click()
  const expenses = page.getByTestId('expenses-page')
  for (const badAmount of ['0', '-1', '1000001', 'abc']) {
    await expenses.locator('input').nth(0).fill(badAmount)
    await expenses.getByRole('button', { name: /Dodaj/ }).click()
  }
  await expect(page.getByTestId('expense-row')).toHaveCount(0)
  await expenses.getByRole('button', { name: /Hrana/ }).first().click()
  await expenses.locator('input').nth(0).fill('12,50')
  await expenses.locator('input').nth(1).fill('2026-05-03')
  await expenses.locator('input').nth(2).fill('lunch')
  await expenses.getByRole('button', { name: /Dodaj/ }).click()
  await expect(page.getByTestId('expense-row')).toHaveCount(1)
  await expect(expenses).toContainText('lunch')

  await expenses.locator('input').nth(0).fill('13.25')
  await expenses.getByRole('button', { name: /Dodaj/ }).click()
  await expect(page.getByTestId('expense-row')).toHaveCount(2)
  await page.getByRole('button', { name: /Ponovi zadnji/ }).click()
  await expect(page.getByTestId('expense-row')).toHaveCount(3)
  await expenses.getByText(/Nedavne predloge/).scrollIntoViewIfNeeded()
  await expenses.getByRole('button', { name: /13,25/ }).first().click()
  await expect(page.getByTestId('expense-row')).toHaveCount(4)

  await page.getByTestId('expense-row').first().getByRole('button').first().click()
  await expenses.locator('input').nth(0).fill('14,25')
  await expenses.getByRole('button', { name: /Shrani/ }).click()
  await expect(expenses).toContainText('14,25')
  await page.getByTestId('expense-row').first().getByRole('button').nth(1).click()
  await expect(page.getByTestId('expense-row')).toHaveCount(3)
  await expect(page.locator('body')).not.toContainText(/NaN|Infinity/)
})

test('recurring expenses, survival mode, roommates, bills, and settlement actions are clickable', async ({ page }) => {
  await openSeeded(page)

  await page.getByTestId('nav-rent').click()
  const rent = page.getByTestId('rent-page')
  await rent.getByRole('button', { name: /Dodaj/ }).click()
  await expect(page.getByTestId('recurring-row')).toHaveCount(0)
  await rent.locator('input').nth(0).fill('Rent')
  await rent.locator('input').nth(1).fill('120')
  await rent.locator('select').first().selectOption({ index: 2 })
  await rent.locator('input').nth(2).fill('28')
  await rent.getByRole('button', { name: /Dodaj/ }).click()
  await expect(page.getByTestId('recurring-row')).toHaveCount(1)

  await page.getByTestId('nav-dashboard').click()
  await expect(page.getByTestId('survival-real-balance')).toContainText(/[-−]34/)
  await page.getByTestId('nav-rent').click()
  await page.getByRole('button', { name: /pla/ }).first().click()
  await page.getByTestId('nav-dashboard').click()
  await expect(page.getByTestId('survival-real-balance')).toContainText('86')
  await page.getByTestId('nav-rent').click()
  await page.getByRole('button', { name: /nepla/ }).first().click()
  await page.getByRole('button', { name: /Uredi/ }).click()
  await rent.locator('input').nth(0).fill('Edited rent')
  await rent.getByRole('button', { name: /Shrani/ }).click()
  await expect(rent).toContainText('Edited rent')
  await page.getByRole('button', { name: /Aktivno/ }).click()
  await expect(rent).toContainText('Pavzirano')
  await page.getByLabel(/Izbri/).click()
  await expect(page.getByTestId('recurring-row')).toHaveCount(0)

  await page.getByTestId('nav-roommates').click()
  const roommates = page.getByTestId('roommates-page')
  await roommates.locator('input').nth(0).fill('Ana')
  await roommates.locator('input').nth(1).fill('60')
  await roommates.getByRole('button', { name: /Dodaj/ }).first().click()
  await roommates.locator('input').nth(0).fill('Bojan')
  await roommates.locator('input').nth(1).fill('40')
  await roommates.getByRole('button', { name: /Dodaj/ }).first().click()
  await expect(roommates).toContainText('Ana')
  await expect(roommates).toContainText('Bojan')
  await roommates.locator('input').nth(2).fill('Electricity')
  await roommates.locator('input').nth(3).fill('80')
  await roommates.locator('select').nth(0).selectOption({ index: 1 })
  await roommates.locator('select').nth(1).selectOption('custom')
  await roommates.getByRole('button', { name: /Dodaj ra/ }).click()
  await expect(roommates).toContainText('Electricity')
  await page.getByRole('button', { name: /Odprto|Pla/ }).first().click()
  await expect(roommates).toContainText(/Pla|poravnano/)
  await page.getByRole('button', { name: /Izbri.*un/ }).click()
  await expect(roommates).not.toContainText('Electricity')
})

test('auth, profile, supporter, backup import-export, corrupted storage, and mocked cloud sync states work', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  await page.goto('/?auth=register#register')
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.getByTestId('register-page')).toContainText('valid email')
  await page.getByLabel('Email').fill('click@example.com')
  await page.getByLabel('Password', { exact: true }).fill('weak')
  await page.getByLabel('Confirm password').fill('weak2')
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.getByTestId('register-page')).toContainText('at least 10')
  await page.getByLabel('Show password').first().click()
  await page.getByLabel('Hide password').first().click()
  await page.getByRole('button', { name: /Log in/ }).click()

  await expect(page.getByTestId('login-page')).toBeVisible()
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByTestId('login-page')).toContainText('valid email')
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await page.getByLabel('Email').fill('missing@example.com')
  await page.getByRole('button', { name: 'Send reset email' }).click()
  await expect(page.getByTestId('forgot-password-page')).toContainText('If an account exists')

  await page.goto('/#reset-password')
  await page.getByLabel('New password', { exact: true }).fill('short')
  await page.getByLabel('Confirm new password', { exact: true }).fill('short')
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByTestId('reset-password-page')).toContainText('at least 10')

  await openSeeded(page, 'profile', { data: populatedData, loggedIn: true })
  await expect(page.getByTestId('profile-page')).toContainText('click@example.com')
  await page.getByLabel(/promotional emails/i).click()
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByTestId('profile-page')).toContainText(/Profile updated|Supabase/)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByTestId('change-password-page')).toBeVisible()
  await page.getByRole('button', { name: 'Back to profile' }).click()
  await page.getByRole('button', { name: /Logout/ }).click()
  await expect(page.getByTestId('login-page')).toBeVisible()

  await openSeeded(page, 'supporter', { data: populatedData })
  await expect(page.getByTestId('supporter-page')).toContainText('Free uporabnik')
  await page.getByRole('button', { name: /Oznaci kot poslano/ }).click()
  await expect(page.getByTestId('supporter-page')).toContainText('V preverjanju')
  await page.locator('textarea[placeholder="sd1...."]').fill('not-a-license')
  await page.getByRole('button', { name: /Preveri licenco/ }).click()
  await expect(page.getByTestId('supporter-page')).toContainText(/Licenca mora|Invalid|Napac|nevelj/i)
  await page.locator('textarea[placeholder="sd1...."]').fill(activeLicense)
  await page.getByRole('button', { name: /Preveri licenco/ }).click()
  await expect(page.getByTestId('supporter-page')).toContainText('Aktiven supporter')
  await page.getByRole('button', { name: /Odstrani licenco/ }).click()
  await expect(page.getByTestId('supporter-page')).toContainText(/Free uporabnik|V preverjanju/)

  await openSeeded(page, 'settings', { data: populatedData, loggedIn: true, cloud: cloudPayload() })
  const settings = page.getByTestId('settings-page')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'JSON izvoz' }).click()
  expect(await (await downloadPromise).path()).toBeTruthy()
  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{bad'),
  })
  await expect(settings).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Upload local data to cloud' }).click()
  await expect(settings).toContainText('uploaded to cloud')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Download cloud data to this device' }).click()
  await expect(settings).toContainText(/downloaded|no cloud budget/)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Merge local + cloud data' }).click()
  await expect(settings).toContainText(/merged|could not/)

  await page.evaluate(() => localStorage.setItem('studentski-denar:v1', '{bad'))
  await page.reload()
  await expect(page.getByTestId('onboarding-page')).toBeVisible()

  await openSeeded(page, 'settings', { data: populatedData, loggedIn: true, cloudError: 'Mock sync failure' })
  await expect(page.getByTestId('settings-page')).toContainText('Mock sync failure')
})

test('mobile click-through at required widths has no overflow and keeps key controls reachable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'explicit viewport matrix is covered once in chromium')

  for (const width of [320, 375, 390, 414, 768]) {
    await page.setViewportSize({ width, height: 860 })
    await openSeeded(page, 'dashboard', { data: populatedData })
    await expect(page.getByTestId('dashboard-page')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expect(page.getByTestId('quick-expense-open')).toBeVisible()

    await page.getByTestId('quick-expense-open').click()
    const drawer = page.getByTestId('quick-expense-drawer')
    await expect(drawer).toBeVisible()
    const box = await drawer.boundingBox()
    expect(box?.height ?? 0).toBeLessThanOrEqual(860)
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()

    await page.getByTestId('nav-expenses').click()
    await expect(page.getByTestId('expenses-page')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.getByTestId('quick-expense-open').click()
    await page.getByTestId('quick-expense-drawer').locator('input[placeholder="0,00"]').fill('3,20')
    await page.getByTestId('quick-expense-drawer').getByRole('button', { name: /Shrani/ }).click()
    await expect(page.getByTestId('quick-expense-drawer')).toBeHidden()
    await expect(page.getByTestId('expense-row')).toHaveCount(2)

    for (const route of ['rent', 'insights', 'settings', 'supporter', 'privacy']) {
      await page.getByTestId(`nav-${route}`).click()
      await expect(page.getByTestId(`${route}-page`)).toBeVisible()
      await expectNoHorizontalOverflow(page)
    }

    await page.getByTestId('nav-rent').click()
    await page.getByRole('button', { name: /Ozna/ }).first().scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: /Ozna/ }).first().click()
    await expect(page.getByRole('button', { name: /nepla|pla/ }).first()).toBeVisible()
  }
})
