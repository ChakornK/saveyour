# saveyour.tech backend

Elysia/Bun API foundation for saveyour.tech.

## Development

```sh
cp .env.example .env
bun install
bun run dev
```

Health endpoints:

- `GET /health/live`
- `GET /health/ready`
- `GET /openapi`

Feature modules should be added under `src/modules/` and exposed through `src/app.ts`. Keep database, storage, AI, and search dependencies behind ports so the four implementation specs remain independently testable.
