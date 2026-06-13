import { expect, test } from '@playwright/test'

const localData = {
  version: 1,
  settings: {
    currency: 'EUR',
    language: 'sl',
    theme: 'default',
    activeProfileId: 'profile-sync',
    onboardingCompleted: true,
    onboardingSkipped: false,
    lastBackupAt: null,
    backupReminderDays: 14,
    pendingSupporterAt: null,
  },
  profiles: [
    {
      id: 'profile-sync',
      name: 'Sync test',
      month: '2026-05',
      currentBalance: 86,
      income: [{ id: 'income-sync-1', amount: 100, date: '2026-05-01', source: 'Test', note: '' }],
      expenses: [{ id: 'expense-sync-1', amount: 12, date: '2026-05-02', category: 'Hrana', note: 'kava' }],
      recurring: [
        {
          id: 'recurring-sync-1',
          name: 'Najemnina',
          amount: 120,
          category: 'Dom / najemnina',
          dayOfMonth: 5,
          active: true,
          paidMonths: [],
        },
      ],
      roommates: [],
      bills: [],
    },
  ],
  license: null,
}

const emptyLocalData = {
  ...localData,
  profiles: [
    {
      ...localData.profiles[0],
      currentBalance: null,
      income: [],
      expenses: [],
      recurring: [],
    },
  ],
}

function cloudPayload(appData = localData) {
  return {
    profile: {
      user_id: '00000000-0000-4000-8000-000000000001',
      monthly_income_estimate: 100,
      rent: 120,
      transport: null,
      food_estimate: null,
      roommates: false,
      current_balance: 86,
      settings: {
        app_data: appData,
        uploaded_at: '2026-05-05T00:00:00.000Z',
      },
    },
    transactions: [
      {
        id: 'income-cloud-1',
        user_id: '00000000-0000-4000-8000-000000000001',
        type: 'income',
        amount: 100,
        category: null,
        description: '',
        date: '2026-05-01',
        source: 'Cloud',
        metadata: { profile_id: 'profile-sync' },
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

async function openSettings(
  page: import('@playwright/test').Page,
  options: { loggedIn?: boolean; local?: unknown; cloud?: unknown } = {},
) {
  await page.addInitScript(({ loggedIn, local, cloud }) => {
    localStorage.clear()
    sessionStorage.clear()
    if (loggedIn) localStorage.setItem('studentski-denar:test-auth-email', 'sync@example.com')
    if (local) localStorage.setItem('studentski-denar:v1', JSON.stringify(local))
    if (cloud) localStorage.setItem('studentski-denar:test-cloud:v1', JSON.stringify(cloud))
  }, options)
  await page.goto('/#settings')
  await expect(page.getByTestId('settings-page')).toBeVisible()
}

test('logged-out user sees local-only sync state and backup still exports', async ({ page }) => {
  await openSettings(page, { local: localData })
  await expect(page.getByTestId('cloud-sync-card')).toBeVisible()
  await expect(page.getByTestId('settings-page')).toContainText('Not logged in')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup first' }).click()
  expect(await (await downloadPromise).path()).toBeTruthy()
})

test('logged-in user sees cloud sync card and local-only upload path', async ({ page }) => {
  await openSettings(page, { loggedIn: true, local: localData })
  await expect(page.getByTestId('settings-page')).toContainText('sync@example.com')
  await expect(page.getByTestId('settings-page')).toContainText('local-only')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Upload local data to cloud' }).click()
  await expect(page.getByTestId('settings-page')).toContainText('uploaded to cloud')
})

test('cloud data with empty local state prompts restore path', async ({ page }) => {
  await openSettings(page, { loggedIn: true, local: emptyLocalData, cloud: cloudPayload() })
  await expect(page.getByTestId('settings-page')).toContainText('cloud-only')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Download cloud data to this device' }).click()
  await expect(page.getByTestId('settings-page')).toContainText('downloaded to this device')
})

test('both local and cloud data prompts merge and error states are visible', async ({ page }) => {
  await openSettings(page, { loggedIn: true, local: localData, cloud: cloudPayload() })
  await expect(page.getByTestId('settings-page')).toContainText('both-have-data')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Merge local + cloud data' }).click()
  await expect(page.getByTestId('settings-page')).toContainText('merged')
})

test('sync error state is shown for malformed mock cloud storage', async ({ page }) => {
  await page.addInitScript((local) => {
    localStorage.clear()
    localStorage.setItem('studentski-denar:test-auth-email', 'sync@example.com')
    localStorage.setItem('studentski-denar:v1', JSON.stringify(local))
    localStorage.setItem('studentski-denar:test-cloud-error', 'Mock sync failure')
  }, localData)
  await page.goto('/#settings')
  await expect(page.getByTestId('settings-page')).toBeVisible()
  await expect(page.getByTestId('settings-page')).toContainText('Mock sync failure')
})
