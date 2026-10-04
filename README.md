# Stormhacks / saveyour.tech

## Verification

Run backend checks:

```bash
cd backend
bun run typecheck
bun test
```

Run Flutter checks:

```bash
cd app
flutter test --no-pub
flutter analyze --no-pub
```

Run the Flutter application with the API configuration:

```bash
cd app
flutter run --dart-define=API_BASE_URL=http://localhost:3000 \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=<google-client-id>
```

The backend requires the environment values documented in `backend/.env.example`; local development can use the in-memory adapters selected by the non-production environment.

The frontend/backend integration contract and implementation checklist are maintained in `.kiro/specs/frontend-backend-integration/`.
