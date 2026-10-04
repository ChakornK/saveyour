import { createApp } from './app'
import { loadConfig } from './config/env'

const config = loadConfig()
const application = createApp(config)
await application.initialize()
const app = application.listen({ hostname: config.host, port: config.port })

console.log(`saveyour.tech API listening on http://${config.host}:${app.server?.port ?? config.port}`)

const shutdown = async () => {
  app.stop()
  await application.close()
  process.exit(0)
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
