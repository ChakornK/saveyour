import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;

class AuthSession {
  const AuthSession({required this.accountId, required this.email, required this.token});

  final String accountId;
  final String email;
  final String token;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final account = json['account'] as Map<String, dynamic>;
    return AuthSession(
      accountId: account['id'] as String,
      email: account['email'] as String,
      token: json['token'] as String,
    );
  }
}

class GoogleAuthService {
  GoogleAuthService({
    this.baseUrl = 'http://10.0.2.2:3000',
    this.serverClientId = '414871424622-5fn2bcqqsut5jfr5j6kk3tdtf206j0me.apps.googleusercontent.com',
    http.Client? client,
    FlutterSecureStorage? storage,
    GoogleSignIn? googleSignIn,
  })  : _client = client ?? http.Client(),
        _storage = storage ?? const FlutterSecureStorage(),
        _googleSignIn = googleSignIn ?? GoogleSignIn.instance;

  static const _sessionKey = 'backend_session_token';
  static const _accountIdKey = 'backend_account_id';
  static const _emailKey = 'backend_account_email';

  final String baseUrl;
  final String serverClientId;
  final http.Client _client;
  final FlutterSecureStorage _storage;
  final GoogleSignIn _googleSignIn;
  AuthSession? _session;

  AuthSession? get session => _session;
  bool get isSignedIn => _session != null;
  String? get email => _session?.email;

  Future<bool> restoreSession() async {
    final token = await _storage.read(key: _sessionKey);
    final accountId = await _storage.read(key: _accountIdKey);
    final email = await _storage.read(key: _emailKey);
    if (token == null || accountId == null || email == null) return false;
    _session = AuthSession(accountId: accountId, email: email, token: token);
    return true;
  }

  Future<AuthSession> signIn() async {
    await _googleSignIn.initialize(serverClientId: serverClientId);
    final googleAccount = await _googleSignIn.authenticate();
    final googleAuth = googleAccount.authentication;
    final idToken = googleAuth.idToken;
    if (idToken == null || idToken.isEmpty) {
      throw const AuthException('Google did not return an ID token.');
    }

    final response = await _client.post(
      Uri.parse('$baseUrl/auth/google'),
      headers: {'content-type': 'application/json'},
      body: jsonEncode({'idToken': idToken}),
    );
    if (response.statusCode >= 400) {
      throw AuthException(_message(response.body, 'Google sign-in failed.'));
    }

    final session = AuthSession.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
    await _storage.write(key: _sessionKey, value: session.token);
    await _storage.write(key: _accountIdKey, value: session.accountId);
    await _storage.write(key: _emailKey, value: session.email);
    _session = session;
    return session;
  }

  Future<void> signOut() async {
    final token = _session?.token;
    if (token != null) {
      await _client.post(
        Uri.parse('$baseUrl/auth/sign-out'),
        headers: {'authorization': 'Bearer $token'},
      );
    }
    await _googleSignIn.signOut();
    await _storage.delete(key: _sessionKey);
    await _storage.delete(key: _accountIdKey);
    await _storage.delete(key: _emailKey);
    _session = null;
  }

  String _message(String body, String fallback) {
    try {
      return (jsonDecode(body) as Map<String, dynamic>)['message'] as String? ?? fallback;
    } catch (_) {
      return fallback;
    }
  }
}

class AuthException implements Exception {
  const AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}
