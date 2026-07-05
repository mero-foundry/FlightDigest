import { expect, test } from '@playwright/test'

test('generates a TestFlight feedback digest and copies an issue export', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Import feedback' })).toBeVisible()
  await expect(page.getByText('TestFlight Feedback Digest')).toBeVisible()

  await page.getByLabel('Copy feedback from TestFlight or App Store Connect and paste below.').fill(`
App crashes immediately on launch after installing iOS 18.6 beta 4.
The app crashes on the splash screen every time.
Weather alerts are not showing even though notifications are enabled.
Rain alerts are missing from the lock screen.
Battery drains overnight with background location enabled.
Location accuracy is wrong after driving to a new city.
Widgets do not update until I open the app.
Text is cut off in the 7-day forecast on small phones.
Would love sunrise notification options.
The new hourly chart is cleaner and easier to read.
`)

  await page.getByRole('button', { name: /generate digest/i }).click()
  await expect(page.getByText('Digest generated', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Release blockers' })).toBeVisible()
  await expect(page.locator('.theme-table').getByText('Weather alerts not showing')).toBeVisible()
  await expect(page.locator('.issue-preview')).toContainText('**Priority:** High')

  await page.getByRole('button', { name: /^Copy to clipboard$/ }).click()
  await expect(page.getByText(/issue markdown (copied|is ready to copy)/i)).toBeVisible()

  await page.getByRole('button', { name: /Create GitHub issues/i }).click()
  await expect(page.getByText(/Add STRIPE_PAYMENT_LINK/)).toBeVisible()
  expect(consoleErrors).toEqual([])
})
