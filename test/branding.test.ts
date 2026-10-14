import { describe, it, expect } from 'vitest'
import type { AddressInfo } from 'node:net'
import { createApp } from '../src/app.js'

// The Crown and the GOV.UK brand are reserved for live services on gov.uk. The header and footer
// already avoid them; this guards the <head> too, where the Design System's default icons (favicon,
// mask icon, touch icon, web manifest) are the crown.
describe('branding', () => {
  it('serves a neutral favicon and none of the GOV.UK crown icons', async () => {
    const server = createApp().listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    try {
      const html = await (await fetch(`${base}/`)).text()
      const head = html.slice(0, html.indexOf('</head>'))
      expect(head).toContain('/assets/app-favicon.svg')
      for (const crown of ['images/favicon', 'govuk-icon', 'manifest.json', 'govuk-opengraph-image', 'govuk-crest']) {
        expect(head, crown).not.toContain(crown)
      }
      const icon = await fetch(`${base}/assets/app-favicon.svg`)
      expect(icon.status).toBe(200)
    } finally {
      server.close()
    }
  })
})
