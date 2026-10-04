import 'dart:convert';

import 'package:http/http.dart' as http;

import '../domain/models.dart';

class ApiClient implements AppRepository {
  ApiClient({http.Client? client, this.baseUrl = 'http://localhost:3000'})
    : _client = client ?? http.Client();

  final http.Client _client;
  final String baseUrl;

  @override
  Future<List<SavedPost>> listPosts({String? query}) async {
    final uri = Uri.parse('$baseUrl/posts')
        .replace(queryParameters: query == null ? null : {'q': query});
    final response = await _client.get(uri);
    if (response.statusCode >= 400)
      throw ApiException(response.statusCode, 'Unable to load saved posts.');
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return (body['items'] as List<dynamic>? ?? const [])
        .map((item) => _postFromJson(item as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<void> saveLink(String url) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/capture'),
      headers: {'content-type': 'application/json'},
      body: jsonEncode({'url': url}),
    );
    if (response.statusCode >= 400)
      throw ApiException(response.statusCode, 'Unable to save that link.');
  }

  @override
  Future<void> removePost(String id) async {
    final response = await _client.delete(Uri.parse('$baseUrl/posts/$id'));
    if (response.statusCode >= 400)
      throw ApiException(response.statusCode, 'Unable to remove this post.');
  }

  @override
  Future<void> removeFromAlbum(String postId, String album) async {
    final response = await _client.delete(
      Uri.parse('$baseUrl/albums/${Uri.encodeComponent(album)}/posts/$postId'),
    );
    if (response.statusCode >= 400)
      throw ApiException(response.statusCode, 'Unable to update this album.');
  }

  SavedPost _postFromJson(Map<String, dynamic> json) => SavedPost(
    id: json['id'] as String,
    title: json['title'] as String? ?? 'Saved post',
    description: json['description'] as String? ?? '',
    platform: SourcePlatform.values.firstWhere(
      (value) => value.name == json['platform'],
      orElse: () => SourcePlatform.x,
    ),
    mediaKind: MediaKind.values.firstWhere(
      (value) => value.name == json['mediaKind'],
      orElse: () => MediaKind.text,
    ),
    thumbnailUrl: json['thumbnailUrl'] as String?,
    username: json['username'] as String?,
    albums: (json['albums'] as List<dynamic>? ?? const []).cast<String>(),
  );
}

class ApiException implements Exception {
  const ApiException(this.statusCode, this.message);
  final int statusCode;
  final String message;
  @override
  String toString() => message;
}
