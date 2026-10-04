# SaveYour

SaveYour is an application that allows uses to save social media posts from different platforms that are important to them.

## Configuration

The Flutter app does not read Google OAuth JSON files. Configure public app values through Dart defines, usually from a local ignored `.env` file copied from `app/.env.example`:

```bash
cd app
cp .env.example .env
flutter run --dart-define-from-file=.env
```

Set `API_BASE_URL` and `GOOGLE_SERVER_CLIENT_ID` in that file. The backend reads Google OAuth settings from environment variables documented in `backend/.env.example`; never commit `.env` files or OAuth credentials.
## Backend with Docker Compose

From the repository root, start the complete backend (API, workers, and dependencies) with:

```bash
docker compose -f backend/docker-compose.yml up --build
```

Stop the stack with `docker compose -f backend/docker-compose.yml down`.
