import { expect, test } from '@playwright/test'

const activeLicense =
  'sd1.eyJlbWFpbEhhc2giOiI5NzNkZmU0NjNlYzg1Nzg1ZjVmOTVhZjViYTM5MDZlZWRiMmQ5MzFjMjRlNjk4MjRhODllYTY1ZGJhNGU4MTNiIiwidGllciI6InN1cHBvcnRlciIsImV4cGlyZXNBdCI6IjIwMjctMDUtMDQiLCJsaWZldGltZSI6ZmFsc2UsImlzc3VlZEF0IjoiMjAyNi0wNS0wNFQxNzozNzo0MS45NjlaIn0.zY4lmlngeXHjmmHBlKFWZkbbHA3RmaOHoCQAp_teulvIQGtoma7TroSrCMoE2Fub9K2bQAb6FcF6kGGUM4twkw'

async function clearAndOpen(page: import('@playwright/test').Page, hash = '') {
  await page.goto(`/${hash}`)
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto(`/${hash}`)
}

async function skipOnboarding(page: import('@playwright/test').Page) {
  await clearAndOpen(page)
  await expect(page.getByTestId('onboarding-page')).toBeVisible()
  await page.getByTestId('skip-onboarding').click()
  await expect(page.getByTestId('dashboard-page')).toBeVisible()
}

test('onboarding can complete, prefill dashboard, skip, and restart from settings', async ({ page }) => {
  await clearAndOpen(page)
  await expect(page.getByTestId('onboarding-page')).toBeVisible()
  await page.getByLabel('Mesečni prihodki skupaj').fill('650')
  await page.getByLabel('Trenutno na voljo (neobvezno)').fill('86')
  await page.getByLabel('Dom / najemnina').fill('120')
  await page.getByLabel('Prevoz').fill('25')
  await page.getByLabel('Hrana, boni, malica').fill('220')
  await page.getByLabel('Štipendija (neobvezno)').fill('150')
  await page.getByLabel('Študentsko delo (neobvezno)').fill('300')
  await page.getByTestId('complete-onboarding').click()
  await expect(page.getByTestId('dashboard-page')).toBeVisible()
  await expect(page.getByTestId('survival-card')).toContainText('86')
  await expect(page.locator('body')).not.toContainText(/NaN|Infinity/)

  await page.getByTestId('nav-settings').click()
  await expect(page.getByTestId('settings-page')).toBeVisible()
  await page.getByRole('button', { name: /Ponovno zaženi onboarding/ }).click()
  await expect(page.getByTestId('onboarding-page')).toBeVisible()

  await page.getByTestId('skip-onboarding').click()
  await expect(page.getByTestId('dashboard-page')).toBeVisible()
})

test('income and expense flows reject bad data and support decimal comma, edit, delete, repeat', async ({ page }) => {
  await skipOnboarding(page)

  await page.getByTestId('nav-income').click()
  await page.getByLabel('Znesek').fill('100,50')
  await page.getByLabel('Vir').selectOption('Štipendija')
  await page.getByRole('button', { name: /Dodaj/ }).click()
  await expect(page.getByTestId('income-page')).toContainText('100,50')

  await page.getByTestId('nav-expenses').click()
  await page.getByLabel('Znesek').fill('12,50')
  await page.getByLabel('Opis').fill('kava')
  await page.getByRole('button', { name: /Dodaj/ }).click()
  await expect(page.getByTestId('expenses-page')).toContainText('12,50')

  await page.getByLabel('Znesek').fill('Infinity')
  await page.getByRole('button', { name: /Dodaj/ }).click()
  await expect(page.locator('body')).not.toContainText(/Infinity|NaN/)

  await page.getByLabel('Uredi').first().click()
  await page.getByLabel('Znesek').fill('13,50')
  await page.getByRole('button', { name: /Shrani/ }).click()
  await expect(page.getByTestId('expenses-page')).toContainText('13,50')

  await page.getByRole('button', { name: /Ponovi zadnji/ }).click()
  await expect(page.getByTestId('expense-row')).toHaveCount(2)

  await page.getByLabel('Izbriši').first().click()
  await expect(page.locator('body')).not.toContainText(/NaN|Infinity/)
})

test('quick expense drawer saves an amount-first expense from dashboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 })
  await skipOnboarding(page)

  await page.getByTestId('quick-expense-open').click()
  await expect(page.getByTestId('quick-expense-drawer')).toBeVisible()
  await page.getByLabel('Znesek').fill('3,20')
  await page.getByRole('button', { name: 'Malica / kava' }).click()
  await page.getByPlaceholder('Opis, npr. kava, boni, bus').fill('kava')
  await page.getByRole('button', { name: /Shrani strošek/ }).click()

  await expect(page.getByTestId('quick-expense-drawer')).toBeHidden()
  await page.getByTestId('nav-expenses').click()
  await expect(page.getByTestId('expenses-page')).toContainText('3,20')
  await expect(page.getByTestId('expenses-page')).toContainText('kava')
})

test('budget preset fills category limits', async ({ page }) => {
  await skipOnboarding(page)
  await page.getByTestId('nav-insights').click()
  await expect(page.getByTestId('budget-limits-panel')).toBeVisible()

  await page.getByRole('button', { name: /Študentski dom/ }).click()
  await expect(page.locator('#budget-Hrana')).toHaveValue('150')
})

test('recurring expenses affect survival mode and paid/unpaid does not create duplicate transactions', async ({ page }) => {
  await skipOnboarding(page)
  await page.getByTestId('nav-rent').click()
  await page.getByLabel('Ime').fill('Najemnina')
  await page.getByLabel('Znesek').fill('120')
  await page.getByLabel('Kategorija').selectOption('Dom / najemnina')
  await page.getByLabel('Dan v mesecu').fill('1')
  await page.getByRole('button', { name: /Dodaj/ }).click()
  await expect(page.getByTestId('rent-page')).toContainText('Najemnina')

  await page.getByTestId('nav-dashboard').click()
  await expect(page.getByTestId('survival-real-balance')).toContainText(/[-−]120/)

  await page.getByTestId('nav-rent').click()
  await page.getByRole('button', { name: /Označi plačano/ }).click()
  await page.getByTestId('nav-dashboard').click()
  await expect(page.getByTestId('survival-real-balance')).toContainText('0')

  await page.getByTestId('nav-rent').click()
  await page.getByRole('button', { name: /Označi neplačano/ }).click()
  await expect(page.getByTestId('recurring-row')).toHaveCount(1)
})

test('backup import/export, invalid backup, corrupted storage, supporter states, and navigation', async ({ page }) => {
  await skipOnboarding(page)
  await page.getByTestId('nav-settings').click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /JSON izvoz/ }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()

  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('input[type="file"]').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{bad'),
  })

  await page.evaluate(() => localStorage.setItem('studentski-denar:v1', '{bad'))
  await page.reload()
  await expect(page.getByTestId('onboarding-page')).toBeVisible()

  await page.goto('/#supporter')
  await page.getByTestId('skip-onboarding').click()
  await expect(page.getByTestId('supporter-page')).toContainText('Free uporabnik')
  await page.getByRole('button', { name: /Označi kot poslano/ }).click()
  await expect(page.getByTestId('supporter-page')).toContainText('V preverjanju')
  await page.locator('textarea[placeholder="sd1...."]').fill(activeLicense)
  await page.getByRole('button', { name: /Preveri licenco/ }).click()
  await expect(page.getByTestId('supporter-page')).toContainText('Aktiven supporter')

  await page.goto('/#privacy')
  await expect(page.getByTestId('privacy-page')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('privacy-page')).toBeVisible()
  await page.getByTestId('nav-dashboard').click()
  await expect(page.getByTestId('dashboard-page')).toBeVisible()
  await page.goBack()
  await expect(page.getByTestId('privacy-page')).toBeVisible()
  await page.goForward()
  await expect(page.getByTestId('dashboard-page')).toBeVisible()
  await page.goto('/#definitely-not-a-page')
  await expect(page.getByTestId('not-found-page')).toBeVisible()
})

test('survival mode covers positive, low, negative, and empty states without NaN/Infinity', async ({ page }) => {
  await skipOnboarding(page)
  await expect(page.getByTestId('survival-card')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/NaN|Infinity/)

  await page.getByTestId('nav-income').click()
  await page.getByLabel('Znesek').fill('20')
  await page.getByLabel('Vir').selectOption('Pomoč staršev')
  await page.getByRole('button', { name: /Dodaj/ }).click()
  await page.getByTestId('nav-dashboard').click()
  await expect(page.getByTestId('survival-card')).toContainText('Max dnevna poraba')

  await page.getByTestId('nav-rent').click()
  await page.getByLabel('Ime').fill('Velik račun')
  await page.getByLabel('Znesek').fill('200')
  await page.getByRole('button', { name: /Dodaj/ }).click()
  await page.getByTestId('nav-dashboard').click()
  await expect(page.getByTestId('survival-card')).toContainText('Treba je prilagoditi')
  await expect(page.locator('body')).not.toContainText(/NaN|Infinity/)
})
