import 'dart:convert';

import 'package:http/http.dart' as http;

import '../domain/models.dart';
import 'session_store.dart';

const apiBaseUrl = String.fromEnvironment('API_BASE_URL');

class ApiClient implements AppRepository, AlbumRepository, ProfileRepository {
  ApiClient({
    http.Client? client,
    this.baseUrl = apiBaseUrl,
    SessionStore? sessions,
  })  : _client = client ?? http.Client(),
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
  }) async {
    final headers = await _headers(
      extra: body == null ? null : {'content-type': 'application/json'},
    );
    final uri = Uri.parse('$baseUrl$path').replace(
      queryParameters: query == null || query.isEmpty ? null : query,
    );
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
      throw ApiException(
        response.statusCode,
        message ?? 'The request failed.',
      );
    }
    return decoded;
  }

  @override
  Future<List<SavedPost>> listPosts({String? query}) async {
    final body = await _request(
      'GET',
      query == null || query.trim().isEmpty ? '/captured-posts' : '/v1/search',
      query: query == null || query.trim().isEmpty
          ? {'limit': '50'}
          : {'q': query, 'limit': '50'},
    ) as Map<String, dynamic>;
    final items = body['items'] ?? body['hits'] ?? const [];
    return (items as List<dynamic>)
        .map((item) => _postFromJson(
              ((item as Map)['document'] as Map?)?.cast<String, dynamic>() ??
                  (item as Map).cast<String, dynamic>(),
            ))
        .toList();
  }

  @override
  Future<void> saveLink(String url) async {
    await _request('POST', '/capture', body: {'url': url});
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
  Future<List<Album>> listAlbums({String query = '', Set<String> tags = const {}}) =>
      throw const ApiException(null, 'Album endpoints are not available yet.');

  @override
  Future<AlbumDetail> getAlbum(String albumId) =>
      throw const ApiException(null, 'Album endpoints are not available yet.');

  @override
  Future<UserProfile> getProfile() =>
      throw const ApiException(null, 'Profile endpoints are not available yet.');

  @override
  Future<void> logOut() => _sessions.clear();

  SavedPost _postFromJson(Map<String, dynamic> json) => SavedPost(
        id: json['id'] as String? ?? json['postId'] as String? ?? '',
        title: json['title'] as String? ?? 'Saved post',
        description: json['description'] as String? ?? json['sourceText'] as String? ?? '',
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

class ApiException implements Exception {
  const ApiException(this.statusCode, this.message);
  final int? statusCode;
  final String message;
  @override
  String toString() => message;
}
