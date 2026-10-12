// Export a static, click-through walkthrough of the happy path for hosting on a static site (the
// portfolio case study). A static host cannot run the server, so this is not the real service — it is
// the real *pages*, rendered by the real app, with each form turned into a forward link. The case
// study says as much, and points at the repo for the real thing.
//
// Usage: tsx scripts/export-static.ts [outDir]   (default: ./static)
//
// It drives the journey once with a cookie so every page comes out pre-filled, saves each page, then
// rewrites absolute paths to relative and the submit buttons to links, and copies the GOV.UK assets
// (relinking the CSS's /assets/ font and image URLs to sit next to the pages).

import { createRequire } from 'node:module'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { AddressInfo } from 'node:net'
import { createApp } from '../src/app.js'

const outDir = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '..', 'static'))

interface PageSpec {
  readonly name: string
  readonly url: string
  /** The target for the page's primary submit button, once it becomes a link. */
  readonly next?: string
}

const PAGES: readonly PageSpec[] = [
  { name: 'index', url: '/' },
  { name: 'applicant-name', url: '/applicant-name', next: 'species.html' },
  { name: 'species', url: '/species', next: 'reserve.html' },
  { name: 'reserve', url: '/reserve', next: 'start-date.html' },
  { name: 'start-date', url: '/start-date', next: 'check-answers.html' },
  { name: 'check-answers', url: '/check-answers', next: 'confirmation.html' },
  { name: 'confirmation', url: '/confirmation' },
  { name: 'accessibility', url: '/accessibility' },
]

// Route path -> static file. Quote-bounded when applied, so "/species" never matches inside
// "/species?return=check-answers".
const HREF_MAP: ReadonlyArray<readonly [string, string]> = [
  ['/applicant-name?return=check-answers', 'applicant-name.html'],
  ['/species?return=check-answers', 'species.html'],
  ['/reserve?return=check-answers', 'reserve.html'],
  ['/start-date?return=check-answers', 'start-date.html'],
  ['/applicant-name', 'applicant-name.html'],
  ['/species', 'species.html'],
  ['/reserve', 'reserve.html'],
  ['/start-date', 'start-date.html'],
  ['/check-answers', 'check-answers.html'],
  ['/confirmation', 'confirmation.html'],
  ['/accessibility', 'accessibility.html'],
]

function rewrite(html: string, next: string | undefined): string {
  let out = html

  // Submit button -> link. Each page has exactly one (Continue, or Accept and send).
  if (next) {
    out = out.replace(
      /<button type="submit" class="govuk-button" data-module="govuk-button">\s*([^<]+?)\s*<\/button>/,
      `<a href="${next}" role="button" draggable="false" class="govuk-button" data-module="govuk-button">$1</a>`,
    )
  }

  // Internal routes -> static files (quote-bounded), then the home link, then assets.
  for (const [from, to] of HREF_MAP) out = out.split(`"${from}"`).join(`"${to}"`)
  out = out.split('href="/"').join('href="index.html"')
  out = out.split('/govuk/').join('./govuk/').split('/assets/').join('./assets/')
  return out
}

async function main(): Promise<void> {
  const app = createApp()
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const { port } = server.address() as AddressInfo
  const base = `http://127.0.0.1:${port}`

  // A representative future date, a year out.
  const year = String(new Date().getFullYear() + 1)
  const form = (data: Record<string, string>): RequestInit => ({
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data).toString(),
    redirect: 'manual',
  })

  let cookie = ''
  const withCookie = (init: RequestInit = {}): RequestInit => ({
    ...init,
    headers: { ...(init.headers ?? {}), ...(cookie ? { cookie } : {}) },
  })
  const captureCookie = (res: Response): void => {
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0] ?? cookie
  }

  // Populate the draft (the first POST creates the session cookie).
  for (const [url, data] of [
    ['/applicant-name', { 'applicant-name': 'Alex Finch', returnTo: '' }],
    ['/species', { species: 'kingfisher', returnTo: '' }],
    ['/reserve', { reserve: 'minsmere', returnTo: '' }],
    ['/start-date', { 'start-date-day': '5', 'start-date-month': '11', 'start-date-year': year, returnTo: '' }],
  ] as const) {
    captureCookie(await fetch(base + url, withCookie(form(data))))
  }

  await rm(outDir, { recursive: true, force: true })
  await mkdir(path.join(outDir, 'govuk'), { recursive: true })

  // Save the pre-filled pages (check-answers before we submit and clear the draft).
  for (const page of PAGES) {
    if (page.name === 'confirmation') {
      // Submit, then follow to the real confirmation so it carries a reference.
      await fetch(base + '/check-answers', withCookie({ method: 'POST', redirect: 'manual' }))
    }
    const res = await fetch(base + page.url, withCookie())
    const html = rewrite(await res.text(), page.next)
    await writeFile(path.join(outDir, `${page.name}.html`), html, 'utf8')
    process.stdout.write(`  ${page.name}.html\n`)
  }

  // Copy GOV.UK assets; relink the CSS's absolute /assets/ URLs to ../assets/ (it sits in ./govuk/).
  const require = createRequire(import.meta.url)
  const govukDist = path.join(path.dirname(require.resolve('govuk-frontend/package.json')), 'dist', 'govuk')
  await cp(path.join(govukDist, 'assets'), path.join(outDir, 'assets'), { recursive: true })
  await cp(path.join(govukDist, 'govuk-frontend.min.js'), path.join(outDir, 'govuk', 'govuk-frontend.min.js'))
  const css = await readFile(path.join(govukDist, 'govuk-frontend.min.css'), 'utf8')
  await writeFile(path.join(outDir, 'govuk', 'govuk-frontend.min.css'), css.split('/assets/').join('../assets/'), 'utf8')

  server.close()
  process.stdout.write(`\nStatic walkthrough written to ${outDir}\n`)
}

await main()
