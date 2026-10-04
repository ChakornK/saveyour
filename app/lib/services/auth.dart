import 'session_store.dart';

class GoogleAuthorization {
  const GoogleAuthorization({
    required this.issuer,
    required this.audience,
    required this.nonce,
    required this.claims,
  });

  final String issuer;
  final String audience;
  final String nonce;
  final Map<String, dynamic> claims;
}

abstract interface class AuthProvider {
  Future<GoogleAuthorization?> authorize();
}

/// Adapter for the Google OAuth implementation currently under development.
/// The final platform implementation only needs to return verified provider
/// output; the rest of the app depends on this interface, not on OAuth SDKs.
class PendingGoogleAuthProvider implements AuthProvider {
  @override
  Future<GoogleAuthorization?> authorize() async => const GoogleAuthorization(
        issuer: 'test',
        audience: 'test',
        nonce: 'test',
        claims: {
          'subject': 'development-user',
          'email': 'you@example.com',
          'expiresAt': 4102444800,
        },
      );
}

class GoogleAuthService {
  GoogleAuthService({
    ApiAuthClient? api,
    SessionStore? sessions,
    AuthProvider? provider,
  })  : api = api ?? ApiAuthClient(request: (_, __, ___, ____) async => <String, dynamic>{}),
        sessions = sessions ?? MemorySessionStore(),
        provider = provider ?? PendingGoogleAuthProvider();

  final ApiAuthClient api;
  final SessionStore sessions;
  final AuthProvider provider;
  Session? _session;

  Session? get session => _session;
  bool get isSignedIn => _session != null;
  String? get email => _session?.email;

  Future<void> restore() async => _session = await sessions.read();

  Future<Session> signIn() async {
    final authorization = await provider.authorize();
    if (authorization == null) {
      throw const AuthException('Google sign-in is not available yet.');
    }
    final session = await api.exchangeGoogle(authorization);
    await sessions.write(session);
    _session = session;
    return session;
  }

  Future<void> signOut() async {
    final current = _session;
    if (current != null) {
      try {
        await api.signOut(current.token);
      } finally {
        await sessions.clear();
        _session = null;
      }
    } else {
      await sessions.clear();
    }
  }
}

class ApiAuthClient {
  ApiAuthClient({required this.request});
  final Future<Map<String, dynamic>> Function(
    String method,
    String path,
    Map<String, dynamic>? body,
    String? token,
  ) request;

  Future<Session> exchangeGoogle(GoogleAuthorization authorization) async {
    final result = await request('POST', '/auth/google', {
      'issuer': authorization.issuer,
      'audience': authorization.audience,
      'nonce': authorization.nonce,
      'claims': authorization.claims,
    }, null);
    final account = result['account'] as Map<String, dynamic>?;
    final token = result['token'] as String?;
    final accountId = account?['id'] as String?;
    if (token == null || accountId == null) {
      throw const AuthException('The server returned an invalid session.');
    }
    return Session(
      token: token,
      accountId: accountId,
      email: account?['email'] as String?,
    );
  }

  Future<void> signOut(String token) async {
    await request('POST', '/auth/sign-out', null, token);
  }
}

class AuthException implements Exception {
  const AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}
