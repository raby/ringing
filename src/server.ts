// Entry point: build the app and listen. Everything testable lives in app.ts and the modules it
// pulls in; this file only owns the port.

import { createApp } from './app.js'

const port = Number(process.env.PORT ?? 3000)

createApp().listen(port, () => {
  console.log(`ringing listening on http://localhost:${port}`)
})
