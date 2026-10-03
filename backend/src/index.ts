import { createApp } from './app'
import { loadConfig } from './config/env'

const config = loadConfig()
const app = createApp(config).listen({ hostname: config.host, port: config.port })

console.log(`saveyour.tech API listening on http://${config.host}:${app.server?.port ?? config.port}`)
