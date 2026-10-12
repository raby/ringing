import { test, expect, type Page } from '@playwright/test'

// A year that is always in the future, so the date never rots the suite.
const FUTURE_YEAR = String(new Date().getFullYear() + 1)

/** Walk the whole journey up to (but not submitting) the check-answers page. */
async function fillJourney(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: /Start now/i }).click()

  await expect(page.getByRole('heading', { name: 'What is your full name?' })).toBeVisible()
  await page.getByLabel('What is your full name?').fill('Alex Finch')
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByLabel('Kingfisher').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByLabel(/Minsmere/).check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByLabel('Day').fill('5')
  await page.getByLabel('Month').fill('11')
  await page.getByLabel('Year').fill(FUTURE_YEAR)
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { name: /Check your answers/ })).toBeVisible()
}

test('completes the whole journey and shows a reference', async ({ page }) => {
  await fillJourney(page)

  // Every answer is on the check-answers page.
  await expect(page.getByText('Alex Finch')).toBeVisible()
  await expect(page.getByText('Kingfisher')).toBeVisible()
  await expect(page.getByText('Minsmere, Suffolk')).toBeVisible()
  await expect(page.getByText(`5 November ${FUTURE_YEAR}`)).toBeVisible()

  await page.getByRole('button', { name: 'Accept and send' }).click()
  await expect(page.getByRole('heading', { name: 'Application submitted' })).toBeVisible()
  await expect(page.getByText(/RNG-[A-Z0-9]{4}-[A-Z0-9]{4}/)).toBeVisible()
})

test('a missing answer shows an error summary and moves focus to it', async ({ page }) => {
  await page.goto('/applicant-name')
  await page.getByRole('button', { name: 'Continue' }).click()

  const summary = page.locator('.govuk-error-summary')
  await expect(summary).toBeVisible()
  // GOV.UK Frontend's JS moves focus to the summary on load — the enhancement over the server render.
  await expect(summary).toBeFocused()

  // Following the summary link moves focus to the field it names.
  await summary.getByRole('link', { name: 'Enter your full name' }).click()
  await expect(page.getByLabel('What is your full name?')).toBeFocused()
})

test('a Change link edits an answer and returns to check-answers', async ({ page }) => {
  await fillJourney(page)

  await page.getByRole('link', { name: 'Change species' }).click()
  await expect(page).toHaveURL(/\/species\?return=check-answers/)

  await page.getByLabel('Barn owl').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  // Back on check-answers, with the edited value — not ploughing on to the next question.
  await expect(page.getByRole('heading', { name: /Check your answers/ })).toBeVisible()
  await expect(page.getByText('Barn owl')).toBeVisible()
})

test('jumping ahead bounces back to the first unanswered question', async ({ page }) => {
  await page.goto('/check-answers')
  await expect(page).toHaveURL(/\/applicant-name$/)
})

test('confirmation is not reachable without a submission', async ({ page }) => {
  await page.goto('/confirmation')
  await expect(page).toHaveURL(/\/$/)
})

test.describe('with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false })

  test('the whole journey still works as plain server-rendered forms', async ({ page }) => {
    await fillJourney(page)
    await page.getByRole('button', { name: 'Accept and send' }).click()
    await expect(page.getByRole('heading', { name: 'Application submitted' })).toBeVisible()
    await expect(page.getByText(/RNG-[A-Z0-9]{4}-[A-Z0-9]{4}/)).toBeVisible()
  })
})
