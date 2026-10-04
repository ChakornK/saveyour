import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../domain/models.dart';
import 'session_store.dart';

class ApiClient implements AppRepository, AlbumRepository, ProfileRepository {
  ApiClient({
    http.Client? client,
    this.baseUrl = 'http://localhost:3000',
    SessionStore? sessions,
    this.timeout = const Duration(seconds: 15),
  })  : _client = client ?? http.Client(),
        sessions = sessions ?? SecureSessionStore();

  final http.Client _client;
  final String baseUrl;
  final SessionStore sessions;
  final Duration timeout;

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    String? token,
    Map<String, String>? extraHeaders,
  }) async {
    final session = token == null ? await sessions.read() : null;
    final authToken = token ?? session?.token;
    final headers = <String, String>{
      'accept': 'application/json',
      if (body != null) 'content-type': 'application/json',
      if (authToken != null) 'authorization': 'Bearer $authToken',
      ...?extraHeaders,
    };
    final uri = Uri.parse('$baseUrl$path').replace(
      queryParameters: query == null || query.isEmpty ? null : query,
    );
    late http.Response response;
    try {
      switch (method) {
        case 'GET':
          response = await _client.get(uri, headers: headers).timeout(timeout);
        case 'POST':
          response = await _client
              .post(uri, headers: headers, body: body == null ? null : jsonEncode(body))
              .timeout(timeout);
        case 'DELETE':
          response = await _client.delete(uri, headers: headers).timeout(timeout);
        default:
          throw StateError('Unsupported HTTP method $method');
      }
    } on TimeoutException {
      throw const ApiException(null, 'The request timed out. Check your connection and try again.');
    } on http.ClientException {
      throw const ApiException(null, 'The server could not be reached.');
    }
    Map<String, dynamic> decoded = <String, dynamic>{};
    if (response.body.isNotEmpty) {
      try {
        decoded = (jsonDecode(response.body) as Map).cast<String, dynamic>();
      } on FormatException {
        throw ApiException(response.statusCode, 'The server returned invalid data.');
      }
    }
    if (response.statusCode == 401 && authToken != null) {
      await sessions.clear();
    }
    if (response.statusCode >= 400) {
      throw ApiException(
        response.statusCode,
        decoded['message'] as String? ?? 'The request failed.',
        code: decoded['code'] as String?,
        requestId: decoded['requestId'] as String?,
        field: decoded['field'] as String?,
      );
    }
    return decoded;
  }

  Future<List<SavedPost>> listPostsPage({String? cursor, int limit = 20}) async {
    final body = await _request('GET', '/captured-posts', query: {
      if (cursor != null) 'cursor': cursor,
      'limit': '$limit',
    });
    return (body['items'] as List<dynamic>? ?? const [])
        .map((item) => _postFromJson((item as Map).cast<String, dynamic>()))
        .toList();
  }

  @override
  Future<List<SavedPost>> listPosts({String? query}) async {
    if (query == null || query.trim().isEmpty) return listPostsPage();
    final body = await _request('GET', '/v1/search/', query: {'q': query});
    return (body['results'] as List<dynamic>? ?? const [])
        .map((item) {
          final result = (item as Map).cast<String, dynamic>();
          return _postFromSearchJson(
            (result['document'] as Map).cast<String, dynamic>(),
          );
        })
        .toList();
  }

  @override
  Future<void> saveLink(String url) async {
    await _request('POST', '/capture', body: {'url': url}, extraHeaders: {
      'idempotency-key': _idempotencyKey(),
    });
  }

  @override
  Future<void> removePost(String id) async {
    await _request('DELETE', '/captured-posts/${Uri.encodeComponent(id)}');
  }

  Future<SavedPost> getPost(String id) async => _postFromJson(
        await _request('GET', '/captured-posts/${Uri.encodeComponent(id)}'),
      );

  Future<List<String>> suggestions(String query, {int limit = 10}) async {
    final body = await _request('GET', '/v1/search/suggestions', query: {
      'q': query,
      'limit': '$limit',
    });
    return (body['suggestions'] as List<dynamic>? ?? const []).cast<String>();
  }

  @override
  Future<void> removeFromAlbum(String postId, String album) async {
    throw const ApiException(null, 'Album endpoints are not available yet.');
  }

  @override
  Future<Album> createAlbum(String name) => throw UnimplementedError();
  @override
  Future<void> addToAlbum(String postId, String albumId) => throw UnimplementedError();
  @override
  Future<List<Album>> listAlbums({String query = '', Set<String> tags = const {}}) =>
      throw UnimplementedError();
  @override
  Future<AlbumDetail> getAlbum(String albumId) => throw UnimplementedError();
  @override
  Future<UserProfile> getProfile() => throw UnimplementedError();
  @override
  Future<void> logOut() => sessions.clear();

  SavedPost _postFromJson(Map<String, dynamic> json) => SavedPost(
        id: json['id'] as String,
        title: json['title'] as String? ?? 'Saved post',
        description: json['description'] as String? ?? '',
        platform: _platform(json['platform'] as String?),
        mediaKind: _mediaKind(json['mediaKind'] as String?),
        thumbnailUrl: json['thumbnailUrl'] as String?,
        username: json['username'] as String?,
        albums: (json['albums'] as List<dynamic>? ?? const []).cast<String>(),
        tags: (json['tags'] as List<dynamic>? ?? const []).cast<String>(),
        analysisStatus: json['analysisStatus'] as String?,
        sourceUrl: json['canonicalUrl'] as String?,
        capturedAt: DateTime.tryParse(json['capturedAt'] as String? ?? ''),
      );

  SavedPost _postFromSearchJson(Map<String, dynamic> json) => SavedPost(
        id: json['postId'] as String? ?? json['documentId'] as String,
        title: json['title'] as String? ?? 'Saved post',
        description: json['text'] as String? ?? '',
        platform: _platform(json['platform'] as String?),
        mediaKind: _mediaKind(((json['mediaKinds'] as List<dynamic>?)?.isNotEmpty ?? false)
            ? (json['mediaKinds'] as List<dynamic>).first as String
            : null),
        tags: (json['tags'] as List<dynamic>? ?? const []).cast<String>(),
        analysisStatus: json['analysisStatus'] as String?,
        sourceUrl: json['canonicalUrl'] as String?,
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

  String _idempotencyKey() => 'flutter-${DateTime.now().microsecondsSinceEpoch}';
}

class ApiException implements Exception {
  const ApiException(this.statusCode, this.message, {this.code, this.requestId, this.field});
  final int? statusCode;
  final String message;
  final String? code;
  final String? requestId;
  final String? field;
  bool get isUnauthorized => statusCode == 401;
  @override
  String toString() => message;
}
