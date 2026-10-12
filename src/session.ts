// Teach express-session about the two things this service keeps per session: the in-progress draft
// and, once submitted, the completed application. Augmenting SessionData means `req.session.application`
// is typed everywhere, not an `any` hole.

import 'express-session'
import type { ApplicationDraft, SubmittedApplication } from './journey.js'

declare module 'express-session' {
  interface SessionData {
    application?: ApplicationDraft
    submission?: SubmittedApplication
  }
}
