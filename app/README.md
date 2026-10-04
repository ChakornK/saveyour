# saveyour.tech Flutter app

Flutter does not automatically load `.env` files at runtime. Start the app from this directory with:

```bash
flutter run --dart-define-from-file=.env
```

For Android emulators, use the provided `.env.example` value `http://10.0.2.2:3000`; for a physical device, use the host machine's LAN address and ensure the backend binds to `0.0.0.0`.
