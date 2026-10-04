import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:saveyour/domain/models.dart';
import 'package:saveyour/services/api_client.dart';
import 'package:saveyour/services/auth.dart';

void main() {
  test('API client parses posts and query parameters', () async {
    late Uri requested;
    final client = MockClient((request) async {
      requested = request.url;
      return http.Response(
        jsonEncode({
          'items': [
            {
              'id': 'p1',
              'title': 'Title',
              'platform': 'reddit',
              'mediaKind': 'text',
            },
          ],
        }),
        200,
      );
    });
    final posts = await ApiClient(client: client).listPosts(query: 'hello');
    expect(requested.queryParameters['q'], 'hello');
    expect(posts.single.platform, SourcePlatform.reddit);
  });

  test('API client exposes server failures', () async {
    final client = MockClient((_) async => http.Response('fail', 500));
    expect(
      () => ApiClient(client: client).listPosts(),
      throwsA(isA<ApiException>()),
    );
  });

  test('auth service signs in and out', () async {
    final auth = GoogleAuthService();
    expect(await auth.signIn(), isTrue);
    expect(auth.email, 'you@example.com');
    await auth.signOut();
    expect(auth.isSignedIn, isFalse);
    expect(auth.email, isNull);
  });
}
