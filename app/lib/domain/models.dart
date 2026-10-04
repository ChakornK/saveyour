enum LoadStatus { initial, loading, refreshing, success, empty, failure }

enum MediaKind { image, carousel, video, text }

enum SourcePlatform { instagram, reddit, tiktok, facebook, x }

enum AlbumVisibility { private, public }

enum AlbumSort { recent, source, tag }

class LoadState<T> {
  const LoadState(this.status, {this.data, this.message});
  final LoadStatus status;
  final T? data;
  final String? message;
  bool get hasData => data != null;
  bool get isLoading =>
      status == LoadStatus.loading || status == LoadStatus.refreshing;
}

class SavedPost {
  const SavedPost({
    required this.id,
    required this.title,
    required this.description,
    required this.platform,
    required this.mediaKind,
    this.thumbnailUrl,
    this.mediaUrls = const [],
    this.username,
    this.profileImageUrl,
    this.albums = const [],
    this.color = 0xFF00D696,
    this.tags = const [],
    this.analysisStatus,
    this.sourceUrl,
    this.capturedAt,
  });
  final String id;
  final String title;
  final String description;
  final SourcePlatform platform;
  final MediaKind mediaKind;
  final String? thumbnailUrl;
  final List<String> mediaUrls;
  final String? username;
  final String? profileImageUrl;
  final List<String> albums;
  final int color;
  final List<String> tags;
  final String? analysisStatus;
  final String? sourceUrl;
  final DateTime? capturedAt;
}

class Album {
  const Album({
    required this.id,
    required this.name,
    required this.coverPost,
    required this.postCount,
    required this.tags,
    required this.updatedAt,
    required this.visibility,
  });
  final String id;
  final String name;
  final SavedPost? coverPost;
  final int postCount;
  final Set<String> tags;
  final DateTime updatedAt;
  final AlbumVisibility visibility;
}

class AlbumDetail {
  const AlbumDetail({required this.album, required this.posts});
  final Album album;
  final List<SavedPost> posts;
}

class UserProfile {
  const UserProfile({
    required this.displayName,
    required this.username,
    required this.avatarUrl,
    required this.savedPostCount,
    required this.albumCount,
    required this.sourceCount,
    required this.tagCount,
  });
  final String displayName;
  final String username;
  final String? avatarUrl;
  final int savedPostCount;
  final int albumCount;
  final int sourceCount;
  final int tagCount;
}

abstract interface class AppRepository {
  Future<List<SavedPost>> listPosts({String? query});
  Future<void> saveLink(String url);
  Future<void> removePost(String id);
  Future<void> removeFromAlbum(String postId, String album);
}

abstract interface class AlbumRepository {
  Future<Album> createAlbum(String name);
  Future<void> addToAlbum(String postId, String albumId);
  Future<void> removeFromAlbum(String postId, String albumId);
  Future<Album> renameAlbum(String albumId, String name);
  Future<List<Album>> listAlbums({
    String query = '',
    Set<String> tags = const {},
  });
  Future<AlbumDetail> getAlbum(String albumId);
}

abstract interface class ProfileRepository {
  Future<UserProfile> getProfile();
  Future<void> logOut();
}

class MockAppRepository
    implements AppRepository, AlbumRepository, ProfileRepository {
  final List<SavedPost> _posts = [
    const SavedPost(
      id: '1',
      title: 'A tiny studio setup',
      description: 'Ideas for a calmer desk and better focus.',
      platform: SourcePlatform.instagram,
      mediaKind: MediaKind.image,
      thumbnailUrl:
          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900',
      username: '@studio.notes',
      albums: ['Workspace', 'Ideas'],
      color: 0xFF7A83FF,
      tags: ['workspace', 'ideas'],
    ),
    const SavedPost(
      id: '2',
      title: 'The perfect yellow chair',
      description: 'A bold piece worth remembering.',
      platform: SourcePlatform.reddit,
      mediaKind: MediaKind.carousel,
      thumbnailUrl:
          'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=900',
      username: 'u/designfriend',
      albums: ['Ideas'],
      color: 0xFFFACC00,
      tags: ['design'],
    ),
    const SavedPost(
      id: '3',
      title: 'Recipes for busy nights',
      description: 'Fast, unfussy meals to try this week.',
      platform: SourcePlatform.tiktok,
      mediaKind: MediaKind.video,
      thumbnailUrl:
          'https://images.unsplash.com/photo-1547592180-85f173990554?w=900',
      username: '@weeknight.cook',
      albums: ['Recipes'],
      color: 0xFFFF4D50,
      tags: ['food'],
    ),
    const SavedPost(
      id: '4',
      title: 'Read this later',
      description: 'A thoughtful thread about creative work.',
      platform: SourcePlatform.x,
      mediaKind: MediaKind.text,
      username: '@creativehabit',
      albums: ['Reading'],
      color: 0xFF00D696,
      tags: ['reading'],
    ),
    const SavedPost(
      id: '5',
      title: 'Coastal light study',
      description: 'Blue hour, salt air, and a palette worth keeping.',
      platform: SourcePlatform.instagram,
      mediaKind: MediaKind.image,
      thumbnailUrl:
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900',
      username: '@field.notes',
      albums: ['References', 'Travel'],
      color: 0xFF0099FF,
      tags: ['photography', 'travel'],
    ),
    const SavedPost(
      id: '6',
      title: 'One-pan lemon pasta',
      description:
          'A 20-minute dinner for the nights when everything is happening.',
      platform: SourcePlatform.facebook,
      mediaKind: MediaKind.image,
      thumbnailUrl:
          'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=900',
      username: 'SaveYour Kitchen',
      albums: ['Recipes'],
      color: 0xFFFACC00,
      tags: ['food', 'quick'],
    ),
    const SavedPost(
      id: '7',
      title: 'The architecture of attention',
      description: 'A long-form essay about designing calmer digital spaces.',
      platform: SourcePlatform.reddit,
      mediaKind: MediaKind.text,
      username: 'u/slowinterface',
      albums: ['Reading', 'Ideas'],
      color: 0xFF7A83FF,
      tags: ['reading', 'design'],
    ),
    const SavedPost(
      id: '8',
      title: 'Street food after midnight',
      description: 'Save this route for the next late-night walk.',
      platform: SourcePlatform.tiktok,
      mediaKind: MediaKind.video,
      thumbnailUrl:
          'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=900',
      username: '@nightmarket.walks',
      albums: ['Travel', 'Food'],
      color: 0xFFFF4D50,
      tags: ['travel', 'food'],
    ),
    const SavedPost(
      id: '9',
      title: 'A better weekly review',
      description:
          'Four questions that make planning feel less like punishment.',
      platform: SourcePlatform.x,
      mediaKind: MediaKind.text,
      username: '@clearerweeks',
      albums: ['Ideas'],
      color: 0xFF00D696,
      tags: ['planning', 'habits'],
    ),
  ];

  @override
  Future<List<SavedPost>> listPosts({String? query}) async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    if (query == null || query.trim().isEmpty) return List.unmodifiable(_posts);
    final needle = query.toLowerCase();
    return _posts
        .where(
          (p) =>
              '${p.title} ${p.description} ${p.tags.join(' ')} ${p.platform.name}'
                  .toLowerCase()
                  .contains(needle),
        )
        .toList();
  }

  @override
  Future<List<Album>> listAlbums({
    String query = '',
    Set<String> tags = const {},
  }) async {
    final albums = <String, List<SavedPost>>{};
    for (final post in _posts)
      for (final album in post.albums) {
        albums.putIfAbsent(album, () => []).add(post);
      }
    final needle = query.toLowerCase();
    return albums.entries
        .map(
          (entry) => Album(
            id: entry.key.toLowerCase(),
            name: entry.key,
            coverPost: entry.value.first,
            postCount: entry.value.length,
            tags: entry.value.expand((p) => p.tags).toSet(),
            updatedAt: DateTime.now(),
            visibility: AlbumVisibility.private,
          ),
        )
        .where(
          (a) =>
              (needle.isEmpty ||
                  '${a.name} ${a.tags.join(' ')}'.toLowerCase().contains(
                    needle,
                  )) &&
              (tags.isEmpty || tags.any(a.tags.contains)),
        )
        .toList();
  }

  @override
  Future<AlbumDetail> getAlbum(String albumId) async {
    final albums = await listAlbums();
    final album = albums.firstWhere((a) => a.id == albumId);
    return AlbumDetail(
      album: album,
      posts: _posts.where((p) => p.albums.contains(album.name)).toList(),
    );
  }

  @override
  Future<UserProfile> getProfile() async => UserProfile(
    displayName: 'Alex Morgan',
    username: '@alexremembers',
    avatarUrl:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
    savedPostCount: _posts.length,
    albumCount: (await listAlbums()).length,
    sourceCount: _posts.map((p) => p.platform).toSet().length,
    tagCount: _posts.expand((p) => p.tags).toSet().length,
  );
  @override
  Future<void> logOut() async {}
  @override
  Future<void> saveLink(String url) async {
    if (Uri.tryParse(url.trim())?.scheme case final scheme?
        when !['http', 'https'].contains(scheme)) {
      throw const FormatException('Enter a valid public link.');
    }
  }

  @override
  Future<void> removePost(String id) async =>
      _posts.removeWhere((p) => p.id == id);
  @override
  Future<Album> createAlbum(String name) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) throw const FormatException('Album name is required.');
    if (_posts.any((p) => p.albums.contains(trimmed))) {
      throw const FormatException('That album already exists.');
    }
    return Album(
      id: trimmed.toLowerCase(),
      name: trimmed,
      coverPost: null,
      postCount: 0,
      tags: const {},
      updatedAt: DateTime.now(),
      visibility: AlbumVisibility.private,
    );
  }

  @override
  Future<Album> renameAlbum(String albumId, String name) async {
    final album = (await listAlbums()).firstWhere((item) => item.id == albumId);
    final oldName = album.name;
    final trimmed = name.trim();
    if (trimmed.isEmpty) throw const FormatException('Album name is required.');
    for (var index = 0; index < _posts.length; index++) {
      final post = _posts[index];
      if (!post.albums.contains(oldName)) continue;
      _posts[index] = SavedPost(
        id: post.id,
        title: post.title,
        description: post.description,
        platform: post.platform,
        mediaKind: post.mediaKind,
        thumbnailUrl: post.thumbnailUrl,
        mediaUrls: post.mediaUrls,
        username: post.username,
        profileImageUrl: post.profileImageUrl,
        albums: post.albums
            .map((item) => item == oldName ? trimmed : item)
            .toList(),
        color: post.color,
        tags: post.tags,
      );
    }
    return (await listAlbums()).firstWhere(
      (item) => item.id == trimmed.toLowerCase(),
    );
  }

  @override
  Future<void> addToAlbum(String postId, String albumId) async {
    final index = _posts.indexWhere((p) => p.id == postId);
    if (index < 0) throw StateError('Post not found.');
    final album = albumId[0].toUpperCase() + albumId.substring(1);
    final post = _posts[index];
    if (post.albums.contains(album)) return;
    _posts[index] = SavedPost(
      id: post.id,
      title: post.title,
      description: post.description,
      platform: post.platform,
      mediaKind: post.mediaKind,
      thumbnailUrl: post.thumbnailUrl,
      mediaUrls: post.mediaUrls,
      username: post.username,
      profileImageUrl: post.profileImageUrl,
      albums: [...post.albums, album],
      color: post.color,
      tags: post.tags,
    );
  }

  @override
  Future<void> removeFromAlbum(String postId, String album) async {
    final index = _posts.indexWhere((p) => p.id == postId);
    if (index < 0) return;
    final post = _posts[index];
    _posts[index] = SavedPost(
      id: post.id,
      title: post.title,
      description: post.description,
      platform: post.platform,
      mediaKind: post.mediaKind,
      thumbnailUrl: post.thumbnailUrl,
      mediaUrls: post.mediaUrls,
      username: post.username,
      profileImageUrl: post.profileImageUrl,
      albums: post.albums.where((a) => a != album).toList(),
      color: post.color,
      tags: post.tags,
    );
  }
}
