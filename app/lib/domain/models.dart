enum LoadStatus { initial, loading, refreshing, success, empty, failure }

enum MediaKind { image, carousel, video, text }

enum SourcePlatform { instagram, reddit, tiktok, facebook, x }

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
}

abstract interface class AppRepository {
  Future<List<SavedPost>> listPosts({String? query});
  Future<void> saveLink(String url);
  Future<void> removePost(String id);
  Future<void> removeFromAlbum(String postId, String album);
}

class MockAppRepository implements AppRepository {
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
    const SavedPost(
      id: '10',
      title: 'Tiny homes, big ideas',
      description: 'A carousel of clever storage solutions for small rooms.',
      platform: SourcePlatform.instagram,
      mediaKind: MediaKind.carousel,
      thumbnailUrl:
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900',
      username: '@smallspace.club',
      albums: ['Workspace', 'References'],
      color: 0xFF0099FF,
      tags: ['home', 'design'],
    ),
  ];

  @override
  Future<List<SavedPost>> listPosts({String? query}) async {
    await Future<void>.delayed(const Duration(milliseconds: 120));
    if (query == null || query.trim().isEmpty) return List.unmodifiable(_posts);
    final needle = query.toLowerCase();
    return _posts
        .where(
          (post) => '${post.title} ${post.description} ${post.tags.join(' ')}'
              .toLowerCase()
              .contains(needle),
        )
        .toList();
  }

  @override
  Future<void> saveLink(String url) async {
    final parsed = Uri.tryParse(url.trim());
    if (parsed == null || !['http', 'https'].contains(parsed.scheme))
      throw const FormatException('Enter a valid public link.');
  }

  @override
  Future<void> removePost(String id) async =>
      _posts.removeWhere((post) => post.id == id);

  @override
  Future<void> removeFromAlbum(String postId, String album) async {}
}
