enum LoadStatus { initial, loading, refreshing, success, empty, failure }

class LoadState<T> {
  const LoadState(this.status, {this.data, this.message});

  final LoadStatus status;
  final T? data;
  final String? message;

  bool get hasData => data != null;
  bool get isLoading => status == LoadStatus.loading || status == LoadStatus.refreshing;
}

class SavedPost {
  const SavedPost({
    required this.id,
    required this.title,
    required this.description,
    required this.platform,
    required this.color,
    this.tags = const [],
  });

  final String id;
  final String title;
  final String description;
  final String platform;
  final int color;
  final List<String> tags;
}

abstract interface class AppRepository {
  Future<List<SavedPost>> listPosts({String? query});
  Future<void> saveLink(String url);
}

class MockAppRepository implements AppRepository {
  final List<SavedPost> _posts = [
    const SavedPost(id: '1', title: 'A tiny studio setup', description: 'Ideas for a calmer desk and better focus.', platform: 'Instagram', color: 0xFF7A83FF, tags: ['workspace', 'ideas']),
    const SavedPost(id: '2', title: 'The perfect yellow chair', description: 'A bold piece worth remembering.', platform: 'Reddit', color: 0xFFFACC00, tags: ['design']),
    const SavedPost(id: '3', title: 'Recipes for busy nights', description: 'Fast, unfussy meals to try this week.', platform: 'TikTok', color: 0xFFFF4D50, tags: ['food']),
    const SavedPost(id: '4', title: 'Read this later', description: 'A thoughtful thread about creative work.', platform: 'X', color: 0xFF00D696, tags: ['reading']),
  ];

  @override
  Future<List<SavedPost>> listPosts({String? query}) async {
    await Future<void>.delayed(const Duration(milliseconds: 120));
    if (query == null || query.trim().isEmpty) return List.unmodifiable(_posts);
    final needle = query.toLowerCase();
    return _posts.where((post) => '${post.title} ${post.description} ${post.tags.join(' ')}'.toLowerCase().contains(needle)).toList();
  }

  @override
  Future<void> saveLink(String url) async {
    if (!Uri.tryParse(url.trim()).toString().startsWith('http')) {
      throw const FormatException('Enter a valid http(s) link.');
    }
  }
}
