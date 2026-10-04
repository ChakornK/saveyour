import { createApp } from "./app";
import { loadConfig } from "./config/env";

const config = loadConfig();
const app = createApp(config);
await app.initialize();
const server = app.listen({
  hostname: config.host,
  port: config.port,
});

console.log(
  `saveyour.tech API listening on http://${config.host}:${server.server?.port ?? config.port}`,
);
