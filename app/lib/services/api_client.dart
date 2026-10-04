import 'dart:convert';
import 'dart:developer' as developer;

import 'package:http/http.dart' as http;

import '../domain/models.dart';
import 'session_store.dart';

const apiBaseUrl = String.fromEnvironment('API_BASE_URL');

String _joinUrl(String baseUrl, String path) {
  final base = baseUrl.endsWith('/')
      ? baseUrl.substring(0, baseUrl.length - 1)
      : baseUrl;
  return '$base$path';
}

class ApiClient implements AppRepository, AlbumRepository, ProfileRepository {
  ApiClient({
    http.Client? client,
    this.baseUrl = apiBaseUrl,
    SessionStore? sessions,
  }) : _client = client ?? http.Client(),
       _sessions = sessions ?? MemorySessionStore();

  final http.Client _client;
  final String baseUrl;
  final SessionStore _sessions;

  Future<Map<String, String>> _headers({Map<String, String>? extra}) async {
    final session = await _sessions.read();
    return {
      'accept': 'application/json',
      if (session != null) 'authorization': 'Bearer ${session.token}',
      ...?extra,
    };
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    Map<String, String>? extraHeaders,
  }) async {
    final headers = await _headers(
      extra: {
        if (body != null) 'content-type': 'application/json',
        ...?extraHeaders,
      },
    );
    final uri = Uri.parse(
      _joinUrl(baseUrl, path),
    ).replace(queryParameters: query == null || query.isEmpty ? null : query);
    late http.Response response;
    switch (method) {
      case 'GET':
        response = await _client.get(uri, headers: headers);
      case 'POST':
        response = await _client.post(
          uri,
          headers: headers,
          body: body == null ? null : jsonEncode(body),
        );
      case 'DELETE':
        response = await _client.delete(uri, headers: headers);
      default:
        throw StateError('Unsupported HTTP method $method');
    }
    dynamic decoded;
    if (response.body.isNotEmpty) {
      try {
        decoded = jsonDecode(response.body);
      } on FormatException {
        if (response.statusCode >= 400) {
          throw ApiException(response.statusCode, 'The request failed.');
        }
        throw const ApiException(null, 'The server returned invalid data.');
      }
    }
    if (response.statusCode >= 400) {
      final message = decoded is Map<String, dynamic>
          ? decoded['message'] as String?
          : null;
      final code = decoded is Map<String, dynamic>
          ? decoded['code'] as String?
          : null;
      throw ApiException(
        response.statusCode,
        message ?? 'The request failed.',
        code: code,
      );
    }
    return decoded;
  }

  @override
  Future<List<SavedPost>> listPosts({String? query}) async {
    final path = query == null || query.trim().isEmpty
        ? '/captured-posts'
        : '/v1/search';
    final body = await _request(
      'GET',
      path,
      query: query == null || query.trim().isEmpty
          ? {'limit': '50'}
          : {'q': query, 'limit': '50'},
    );
    final items = body is List
        ? body
        : body is Map<String, dynamic>
        ? (body['items'] ?? body['hits'] ?? const [])
        : const [];
    return (items as List<dynamic>)
        .map(
          (item) => _postFromJson(
            item is Map && item['document'] is Map
                ? (item['document'] as Map).cast<String, dynamic>()
                : (item as Map).cast<String, dynamic>(),
          ),
        )
        .toList();
  }

  @override
  Future<CaptureReceipt> capture(String url, {String? idempotencyKey}) async {
    final body = await _request(
      'POST',
      '/capture',
      body: {'url': url},
      extraHeaders: {
        if (idempotencyKey != null) 'idempotency-key': idempotencyKey,
      },
    );
    if (body is! Map<String, dynamic>) {
      throw const ApiException(null, 'The server returned an invalid capture.');
    }
    return CaptureReceipt.fromJson(body);
  }

  Future<void> saveLink(String url) async {
    await _request('POST', '/capture', body: {'url': url});
  }

  Future<SavedPost> getPost(String id) async {
    final body = await _request(
      'GET',
      '/captured-posts/${Uri.encodeComponent(id)}',
    );
    if (body is! Map<String, dynamic>) {
      throw const ApiException(null, 'The server returned an invalid post.');
    }
    return _postFromJson(body);
  }

  @override
  Future<void> removePost(String id) async {
    await _request('DELETE', '/captured-posts/${Uri.encodeComponent(id)}');
  }

  @override
  Future<void> removeFromAlbum(String postId, String album) async {
    await _request(
      'DELETE',
      '/albums/${Uri.encodeComponent(album)}/posts/${Uri.encodeComponent(postId)}',
    );
  }

  @override
  Future<Album> createAlbum(String name) =>
      throw const ApiException(null, 'Album endpoints are not available yet.');

  @override
  Future<void> addToAlbum(String postId, String albumId) =>
      throw const ApiException(null, 'Album endpoints are not available yet.');

  @override
  Future<List<Album>> listAlbums({
    String query = '',
    Set<String> tags = const {},
  }) =>
      throw const ApiException(null, 'Album endpoints are not available yet.');

  @override
  Future<AlbumDetail> getAlbum(String albumId) =>
      throw const ApiException(null, 'Album endpoints are not available yet.');

  @override
  Future<UserProfile> getProfile() async {
    final body = await _request('GET', '/profile');
    print('PROFILE API RESPONSE: ${jsonEncode(body)}');
    developer.log(
      'PROFILE API RESPONSE: ${jsonEncode(body)}',
      name: 'saveyour.api',
    );
    if (body is! Map<String, dynamic>) {
      throw const ApiException(null, 'The server returned an invalid profile.');
    }
    return UserProfile(
      displayName: body['displayName'] as String? ?? 'SaveYour user',
      username: body['username'] as String? ?? '',
      avatarUrl: body['avatarUrl'] as String?,
      savedPostCount: (body['savedPostCount'] as num?)?.toInt() ?? 0,
      albumCount: (body['albumCount'] as num?)?.toInt() ?? 0,
      sourceCount: (body['sourceCount'] as num?)?.toInt() ?? 0,
      tagCount: (body['tagCount'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  Future<void> logOut() => _sessions.clear();

  SavedPost _postFromJson(Map<String, dynamic> json) => SavedPost(
    id: json['id'] as String? ?? json['postId'] as String? ?? '',
    title: json['title'] as String? ?? 'Saved post',
    description:
        json['description'] as String? ?? json['sourceText'] as String? ?? '',
    platform: _platform(json['platform'] as String?),
    mediaKind: _mediaKind(json['mediaKind'] as String?),
    thumbnailUrl: json['thumbnailUrl'] as String?,
    username: json['username'] as String?,
    albums: (json['albums'] as List<dynamic>? ?? const []).cast<String>(),
    tags: (json['tags'] as List<dynamic>? ?? const []).cast<String>(),
    analysisStatus: json['analysisStatus'] as String?,
    sourceUrl: json['canonicalUrl'] as String? ?? json['sourceUrl'] as String?,
    capturedAt: DateTime.tryParse(json['capturedAt'] as String? ?? ''),
  );

  SourcePlatform _platform(String? value) => SourcePlatform.values.firstWhere(
    (item) => item.name == value,
    orElse: () => SourcePlatform.x,
  );

  MediaKind _mediaKind(String? value) => MediaKind.values.firstWhere(
    (item) => item.name == value,
    orElse: () => MediaKind.text,
  );
}

class CaptureReceipt {
  const CaptureReceipt({required this.postId, this.analysisStatus});

  final String postId;
  final String? analysisStatus;

  factory CaptureReceipt.fromJson(Map<String, dynamic> json) {
    final postId = json['postId'];
    if (postId is! String || postId.isEmpty) {
      throw const ApiException(null, 'The server returned an invalid capture.');
    }
    return CaptureReceipt(
      postId: postId,
      analysisStatus: json['analysisStatus'] as String?,
    );
  }
}

class ApiException implements Exception {
  const ApiException(this.statusCode, this.message, {this.code});
  final int? statusCode;
  final String message;
  final String? code;
  @override
  String toString() => message;
}
