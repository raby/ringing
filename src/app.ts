// Composition root — wires Nunjucks (with the GOV.UK Frontend templates on the search path), static
// assets, body parsing, sessions, and the journey routes into an Express app. Exported as a factory
// so tests can mount a fresh app without binding a port.

import { createRequire } from 'node:module'
import path from 'node:path'
import express, { type Express } from 'express'
import session from 'express-session'
import nunjucks from 'nunjucks'
import './session.js'
import { registerRoutes } from './routes.js'

export function createApp(): Express {
  const app = express()
  const require = createRequire(import.meta.url)
  const govukDist = path.join(path.dirname(require.resolve('govuk-frontend/package.json')), 'dist')
  const viewsDir = path.join(import.meta.dirname, 'views')

  // Our own templates first, then GOV.UK Frontend — so `{% extends "govuk/template.njk" %}` and the
  // component macros resolve. noCache in dev gives instant template edits; production caches.
  const env = nunjucks.configure([viewsDir, govukDist], {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV !== 'production',
  })
  // The error summary wants { text, href }; our validators speak { message, href, field }. One filter
  // keeps every page's summary block a one-liner and the validator shape single-sourced.
  env.addFilter('errorSummary', (errors: { message: string; href: string }[]) =>
    errors.map((e) => ({ text: e.message, href: e.href })),
  )
  app.set('view engine', 'njk')

  // Our own neutral favicon first (the Design System's icons are the GOV.UK crown, which this demo
  // must not wear), then fonts at /assets (the template's default assetPath); the compiled CSS and JS
  // under /govuk.
  app.use('/assets', express.static(path.join(import.meta.dirname, 'public')))
  app.use('/assets', express.static(path.join(govukDist, 'govuk', 'assets')))
  app.use('/govuk', express.static(path.join(govukDist, 'govuk')))

  app.use(express.urlencoded({ extended: false }))
  app.use(
    session({
      // A real deployment sets SESSION_SECRET and swaps the in-memory store (which leaks and is
      // single-process) for a shared one such as connect-redis.
      secret: process.env.SESSION_SECRET ?? 'ringing-dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 },
    }),
  )

  registerRoutes(app)
  return app
}
