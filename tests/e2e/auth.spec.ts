import { expect, test } from '@playwright/test'

async function openAuth(page: import('@playwright/test').Page, hash: string) {
  await page.goto(`/#${hash}`)
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto(`/#${hash}`)
}

test('register page validates email, password strength, mismatched passwords, and consent', async ({ page }) => {
  await openAuth(page, 'register')
  await expect(page.getByTestId('register-page')).toBeVisible()
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.getByTestId('register-page')).toContainText('valid email')

  await page.getByLabel('Email').fill('ana@example.com')
  await page.getByLabel('Password', { exact: true }).fill('weak')
  await page.getByLabel('Confirm password').fill('weak2')
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.getByTestId('register-page')).toContainText('at least 10')

  await page.getByLabel('Password', { exact: true }).fill('Strong-pass-123')
  await page.getByLabel('Confirm password').fill('Strong-pass-456')
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.getByTestId('register-page')).toContainText('match')

  await page.getByLabel('Confirm password').fill('Strong-pass-123')
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.getByTestId('register-page')).toContainText('privacy')
})

test('login page validates required credentials and links to recovery/register', async ({ page }) => {
  await openAuth(page, 'login')
  await expect(page.getByTestId('login-page')).toBeVisible()
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByTestId('login-page')).toContainText('valid email')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByTestId('register-page')).toBeVisible()
  await page.goto('/#login')
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await expect(page.getByTestId('forgot-password-page')).toBeVisible()
})

test('forgot password success copy does not reveal whether email exists', async ({ page }) => {
  await openAuth(page, 'forgot-password')
  await page.getByLabel('Email').fill('not-real@example.com')
  await page.getByRole('button', { name: 'Send reset email' }).click()
  await expect(page.getByTestId('forgot-password-page')).toContainText('If an account exists')
})

test('reset and change password pages validate password UI on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 })
  await openAuth(page, 'reset-password')
  await page.getByLabel('New password', { exact: true }).fill('weak')
  await page.getByLabel('Confirm new password', { exact: true }).fill('weak')
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByTestId('reset-password-page')).toContainText('at least 10')

  await page.goto('/#change-password')
  await expect(page.getByTestId('change-password-page')).toBeVisible()
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByTestId('change-password-page')).toContainText('current password')
})

test('profile marketing consent toggle and logout UI render without configured provider', async ({ page }) => {
  await openAuth(page, 'profile')
  await expect(page.getByTestId('profile-page')).toBeVisible()
  await expect(page.getByLabel(/promotional emails/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Logout/ })).toBeVisible()
})

test('supporter pending and active states remain available in local fallback mode', async ({ page }) => {
  await openAuth(page, 'supporter')
  await page.getByTestId('skip-onboarding').click()
  await expect(page.getByTestId('supporter-page')).toContainText('Free uporabnik')
  await page.getByRole('button', { name: /Oznaci kot poslano/ }).click()
  await expect(page.getByTestId('supporter-page')).toContainText('V preverjanju')
})

test('logged-out users can use budget pages as guests and opt into account features later', async ({ page }) => {
  await openAuth(page, 'settings')
  await expect(page.getByTestId('onboarding-page')).toBeVisible()
  await page.getByTestId('skip-onboarding').click()
  await expect(page.getByTestId('settings-page')).toBeVisible()
  await expect(page.getByTestId('settings-page')).toContainText('Not logged in')
  await page.getByTestId('nav-dashboard').click()
  await expect(page.getByTestId('dashboard-page')).toBeVisible()
})
