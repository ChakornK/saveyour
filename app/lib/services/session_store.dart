import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class Session {
  const Session({required this.token, required this.accountId, this.email});

  final String token;
  final String accountId;
  final String? email;
}

abstract interface class SessionStore {
  Future<Session?> read();
  Future<void> write(Session session);
  Future<void> clear();
}

class SecureSessionStore implements SessionStore {
  SecureSessionStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'saveyour.session';
  final FlutterSecureStorage _storage;

  @override
  Future<Session?> read() async {
    final encoded = await _storage.read(key: _key);
    if (encoded == null) return null;
    try {
      final value = jsonDecode(encoded) as Map<String, dynamic>;
      final token = value['token'] as String?;
      final accountId = value['accountId'] as String?;
      if (token == null || accountId == null) return null;
      return Session(
        token: token,
        accountId: accountId,
        email: value['email'] as String?,
      );
    } on FormatException {
      await clear();
      return null;
    } on TypeError {
      await clear();
      return null;
    }
  }

  @override
  Future<void> write(Session session) => _storage.write(
        key: _key,
        value: jsonEncode({
          'token': session.token,
          'accountId': session.accountId,
          if (session.email != null) 'email': session.email,
        }),
      );

  @override
  Future<void> clear() => _storage.delete(key: _key);
}

class MemorySessionStore implements SessionStore {
  Session? _session;

  @override
  Future<Session?> read() async => _session;

  @override
  Future<void> write(Session session) async => _session = session;

  @override
  Future<void> clear() async => _session = null;
}
