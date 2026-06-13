import { expect, test } from '@playwright/test'

const widths = [320, 375, 390, 414]
const height = 860

const seededData = {
  version: 1,
  settings: {
    currency: 'EUR',
    language: 'sl',
    theme: 'default',
    activeProfileId: 'profile-visual',
    onboardingCompleted: true,
    onboardingSkipped: false,
    lastBackupAt: '2026-05-01T10:00:00.000Z',
    backupReminderDays: 14,
    pendingSupporterAt: '2026-05-02T10:00:00.000Z',
  },
  profiles: [
    {
      id: 'profile-visual',
      name: 'Visual test',
      month: '2026-05',
      currentBalance: 86,
      income: [
        { id: 'i1', amount: 500, date: '2026-05-01', source: 'Štipendija', note: 'visual' },
      ],
      expenses: [
        { id: 'e1', amount: 12.5, date: '2026-05-03', category: 'Malica / kava', note: 'kava' },
        { id: 'e2', amount: 44, date: '2026-05-04', category: 'Hrana', note: 'trgovina' },
      ],
      recurring: [
        {
          id: 'r1',
          name: 'Najemnina',
          amount: 120,
          category: 'Dom / najemnina',
          dayOfMonth: 5,
          active: true,
          paidMonths: [],
        },
      ],
      roommates: [
        { id: 'u1', name: 'Jaz', sharePercent: 50 },
        { id: 'u2', name: 'Cimer/ka', sharePercent: 50 },
      ],
      bills: [],
    },
  ],
  license: null,
}

async function seed(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.addInitScript((data) => {
    localStorage.setItem('studentski-denar:v1', JSON.stringify(data))
  }, seededData)
  await page.evaluate((data) => {
    localStorage.setItem('studentski-denar:v1', JSON.stringify(data))
  }, seededData)
  await page.reload()
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(overflow).toBe(false)
}

for (const width of widths) {
  test.describe(`mobile visual ${width}px`, () => {
    test.use({ viewport: { width, height } })

    test('captures core mobile pages without overflow', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'visual widths are explicitly covered in chromium')
      await page.goto('/')
      await page.evaluate(() => localStorage.clear())
      await page.reload()
      await expect(page.getByTestId('onboarding-page')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await page.screenshot({ path: testInfo.outputPath(`onboarding-${width}.png`), fullPage: true })

      await seed(page)
      for (const route of ['dashboard', 'expenses', 'rent', 'settings', 'supporter', 'privacy']) {
        await page.goto(`/#${route}`)
        await page.reload()
        await expect(page.getByTestId(`${route === 'rent' ? 'rent' : route}-page`)).toBeVisible()
        await expectNoHorizontalOverflow(page)
        await page.screenshot({ path: testInfo.outputPath(`${route}-${width}.png`), fullPage: true })
      }

      await page.goto('/#not-a-real-page')
      await expect(page.getByTestId('not-found-page')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await page.screenshot({ path: testInfo.outputPath(`notfound-${width}.png`), fullPage: true })
    })

    test('sticky expense actions do not block recurring controls', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'visual widths are explicitly covered in chromium')
      await seed(page)
      await page.goto('/#rent')
      await page.getByTestId('nav-rent').click()
      await expect(page.getByTestId('recurring-row')).toBeVisible()
      await page.getByRole('button', { name: /Označi plačano/ }).click()
      await expect(page.getByRole('button', { name: /Označi neplačano/ })).toBeVisible()
      await expectNoHorizontalOverflow(page)
    })
  })
}
