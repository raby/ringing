import { test, expect, type Page } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

const FUTURE_YEAR = String(new Date().getFullYear() + 1)

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

interface AxeNode {
  readonly html: string
}
interface AxeViolation {
  readonly id: string
  readonly nodes: readonly AxeNode[]
}

/**
 * GOV.UK Frontend's conditional reveal (the "other species" radio) adds `aria-expanded` to the radio
 * so screen readers announce that selecting it reveals more. `aria-expanded` is not in the ARIA spec's
 * allowed-attributes list for role="radio", so axe raises `aria-allowed-attr` — a spec-coverage gap,
 * not a real barrier, and a deliberate, documented decision that ships on GOV.UK's own services:
 * https://github.com/alphagov/govuk-frontend/issues/979
 *
 * It is filtered out *precisely* — only when every flagged node is that radio-reveal pattern — so any
 * other aria-allowed-attr problem (or extra node) still fails the gate.
 */
function isKnownGovukRevealFinding(v: AxeViolation): boolean {
  return (
    v.id === 'aria-allowed-attr' &&
    v.nodes.length > 0 &&
    v.nodes.every((n) => /govuk-(radios|checkboxes)__input/.test(n.html) && /aria-expanded/.test(n.html))
  )
}

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze()
  const violations = (results.violations as AxeViolation[]).filter((v) => !isKnownGovukRevealFinding(v))
  const summary = violations.map((v) => `${v.id} (${v.nodes.length})`)
  expect(summary, `axe violations: ${summary.join(', ')}`).toEqual([])
}

// Pages reachable without session state.
const standalonePages = [
  '/',
  '/applicant-name',
  '/species',
  '/reserve',
  '/start-date',
  '/accessibility',
  '/this-page-does-not-exist', // the 404 page
]

for (const path of standalonePages) {
  test(`has no WCAG 2.1 AA violations: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expectNoViolations(page)
  })
}

test('has no violations in the error state', async ({ page }) => {
  await page.goto('/applicant-name')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.locator('.govuk-error-summary')).toBeVisible()
  await expectNoViolations(page)
})

test('has no violations on check-answers or confirmation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Start now/i }).click()
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
  await expectNoViolations(page)

  await page.getByRole('button', { name: 'Accept and send' }).click()
  await expect(page.getByRole('heading', { name: 'Application submitted' })).toBeVisible()
  await expectNoViolations(page)
})
