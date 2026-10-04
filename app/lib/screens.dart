import 'dart:async';

import 'package:flutter/material.dart';

import 'domain/models.dart';
import 'services/auth.dart';
import 'theme/app_theme.dart';
import 'widgets/brutalist_button.dart';
import 'widgets/post_card.dart';
import 'widgets/post_detail_modal.dart';

class AlbumsPage extends StatefulWidget {
  const AlbumsPage({
    super.key,
    required this.repository,
    required this.onOpenPost,
  });
  final AlbumRepository repository;
  final ValueChanged<SavedPost> onOpenPost;
  @override
  State<AlbumsPage> createState() => _AlbumsPageState();
}

class _AlbumsPageState extends State<AlbumsPage> {
  final search = TextEditingController();
  Timer? _searchDebounce;
  List<Album> albums = [];
  bool loading = true;
  String? error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (mounted)
      setState(() {
        loading = true;
        error = null;
      });
    try {
      final result = await widget.repository.listAlbums(query: search.text);
      if (mounted) setState(() => albums = result);
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _createAlbum(BuildContext context) async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: BrutalSurface(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'CREATE ALBUM',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                autofocus: true,
                decoration: const InputDecoration(labelText: 'Album name'),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('CANCEL'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: () => Navigator.pop(context, controller.text),
                    child: const Text('CREATE'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    controller.dispose();
    if (name == null || name.trim().isEmpty) return;
    try {
      await widget.repository.createAlbum(name.trim());
      await _load();
    } catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      Text(
        'ALBUMS',
        style: Theme.of(context).textTheme.headlineMedium
            ?.copyWith(fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: search,
        onChanged: (_) {
          _searchDebounce?.cancel();
          _searchDebounce = Timer(const Duration(milliseconds: 350), _load);
        },
        decoration: const InputDecoration(
          prefixIcon: Icon(Icons.search),
          hintText: 'Search albums and tags',
        ),
      ),
      const SizedBox(height: 16),
      Align(
        alignment: Alignment.centerLeft,
        child: BrutalistButton(
          label: 'Create album',
          icon: const Icon(Icons.create_new_folder_outlined),
          variant: BrutalistButtonVariant.primary,
          onPressed: () => _createAlbum(context),
        ),
      ),
      const SizedBox(height: 20),
      if (loading && albums.isEmpty)
        const Padding(
          padding: EdgeInsets.all(32),
          child: Center(child: CircularProgressIndicator()),
        )
      else if (error != null && albums.isEmpty)
        BrutalSurface(
          child: Column(
            children: [
              const Icon(Icons.cloud_off_outlined, size: 40),
              const SizedBox(height: 8),
              Text(error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        )
      else if (!loading && albums.isEmpty)
        const BrutalSurface(
          child: Text('No albums yet. Create one from a saved post.'),
        )
      else
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 280,
            mainAxisExtent: 220,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: albums.length,
          itemBuilder: (_, i) => _AlbumTile(
            album: albums[i],
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  fullscreenDialog: false,
                  builder: (_) => AlbumDetailPage(
                    albumId: albums[i].id,
                    repository: widget.repository,
                    onOpenPost: widget.onOpenPost,
                  ),
                ),
              );
            },
          ),
        ),
    ],
  );
}

class _AlbumTile extends StatelessWidget {
  const _AlbumTile({required this.album, required this.onTap});
  final Album album;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: BrutalSurface(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: album.coverPost?.thumbnailUrl == null
                ? Container(
                    color: Color(album.coverPost?.color ?? 0xFF00D696),
                    child: const Center(
                      child: Icon(Icons.collections_bookmark, size: 48),
                    ),
                  )
                : Image.network(
                    album.coverPost!.thumbnailUrl!,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    album.name,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
                Text('${album.postCount}'),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class AlbumDetailPage extends StatefulWidget {
  const AlbumDetailPage({
    super.key,
    required this.albumId,
    required this.repository,
    required this.onOpenPost,
  });
  final String albumId;
  final AlbumRepository repository;
  final ValueChanged<SavedPost> onOpenPost;
  @override
  State<AlbumDetailPage> createState() => _AlbumDetailPageState();
}

class _AlbumDetailPageState extends State<AlbumDetailPage> {
  AlbumDetail? detail;
  String? error;
  bool loading = true;
  final search = TextEditingController();
  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    if (mounted)
      setState(() {
        loading = true;
        error = null;
      });
    try {
      final value = await widget.repository.getAlbum(widget.albumId);
      if (mounted) setState(() => detail = value);
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _renameAlbum() async {
    final d = detail;
    if (d == null) return;
    final controller = TextEditingController(text: d.album.name);
    final name = await showDialog<String>(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: BrutalSurface(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'RENAME ALBUM',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                autofocus: true,
                decoration: const InputDecoration(labelText: 'Album name'),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('CANCEL'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: () => Navigator.pop(context, controller.text),
                    child: const Text('SAVE'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    controller.dispose();
    if (name == null || name.trim().isEmpty) return;
    try {
      final renamed = await widget.repository.renameAlbum(
        widget.albumId,
        name.trim(),
      );
      if (mounted && detail != null)
        setState(
          () => detail = AlbumDetail(album: renamed, posts: detail!.posts),
        );
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = detail;
    if (d == null && error != null) {
      return Center(
        child: BrutalSurface(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(error!),
              const SizedBox(height: 12),
              FilledButton(onPressed: _loadDetail, child: const Text('RETRY')),
            ],
          ),
        ),
      );
    }
    if (d == null) return const Center(child: CircularProgressIndicator());
    final posts = d.posts
        .where(
          (p) => '${p.title} ${p.description} ${p.tags.join(' ')}'
              .toLowerCase()
              .contains(search.text.toLowerCase()),
        )
        .toList();
    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: Scaffold(
              appBar: AppBar(
                title: Text(
                  d.album.name,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                actions: [
                  IconButton(
                    tooltip: 'Rename album',
                    onPressed: _renameAlbum,
                    icon: const Icon(Icons.edit_outlined),
                  ),
                ],
              ),
              body: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: TextField(
                      controller: search,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.search),
                        hintText: 'Search this album',
                      ),
                    ),
                  ),
                  Expanded(
                    child: GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate:
                          const SliverGridDelegateWithMaxCrossAxisExtent(
                            maxCrossAxisExtent: 300,
                            mainAxisSpacing: 16,
                            crossAxisSpacing: 16,
                            childAspectRatio: .78,
                          ),
                      itemCount: posts.length,
                      itemBuilder: (_, i) => PostCard(
                        post: posts[i],
                        onTap: () => PostDetailModal.show(
                          context,
                          post: posts[i],
                          onDelete: () => Navigator.pop(context),
                          onRemoveFromAlbum: (_) {},
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ProfilePage extends StatefulWidget {
  const ProfilePage({
    super.key,
    required this.repository,
    this.auth,
    this.onLoggedOut,
  });
  final ProfileRepository repository;
  final GoogleAuthService? auth;
  final VoidCallback? onLoggedOut;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool _signingIn = false;
  late Future<UserProfile> _profileFuture;

  @override
  void initState() {
    super.initState();
    _profileFuture = _loadProfile();
  }

  Future<UserProfile> _loadProfile() =>
      widget.repository.getProfile().timeout(const Duration(seconds: 15));

  Future<void> _logOut() async {
    if (widget.auth != null) {
      await widget.auth!.signOut();
    } else {
      await widget.repository.logOut();
    }
    if (widget.onLoggedOut != null) {
      widget.onLoggedOut!();
    } else if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<UserProfile>(
    future: _profileFuture,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Unable to load profile: ${snapshot.error}'),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () =>
                    setState(() => _profileFuture = _loadProfile()),
                child: const Text('Retry'),
              ),
            ],
          ),
        );
      }
      if (!snapshot.hasData) {
        return const Center(child: CircularProgressIndicator());
      }
      final p = snapshot.data!;
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Center(
            child: Container(
              width: 132,
              height: 132,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.ink, width: 3),
                boxShadow: const [
                  BoxShadow(color: AppColors.ink, offset: Offset(6, 6)),
                ],
                image: p.avatarUrl == null || p.avatarUrl!.isEmpty
                    ? null
                    : DecorationImage(
                        image: NetworkImage(p.avatarUrl!),
                        fit: BoxFit.cover,
                      ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: Text(
              p.displayName,
              style: Theme.of(context).textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
          ),
          Center(child: Text(p.username)),
          const SizedBox(height: 28),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _stat('SAVED', p.savedPostCount),
              _stat('ALBUMS', p.albumCount),
              _stat('SOURCES', p.sourceCount),
              _stat('TAGS', p.tagCount),
            ],
          ),
          const SizedBox(height: 32),
          BrutalSurface(
            child: widget.auth?.isSignedIn == true || widget.auth == null
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Signed in as ${widget.auth?.email ?? 'Google account'}',
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      BrutalistButton(
                        label: 'Log out',
                        icon: const Icon(Icons.logout),
                        variant: BrutalistButtonVariant.destructive,
                        onPressed: _logOut,
                      ),
                    ],
                  )
                : BrutalistButton(
                    label: _signingIn ? 'Signing in…' : 'Continue with Google',
                    icon: _signingIn
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.login),
                    onPressed: _signingIn
                        ? null
                        : () async {
                            setState(() => _signingIn = true);
                            try {
                              await widget.auth?.signIn().timeout(
                                const Duration(seconds: 30),
                                onTimeout: () => throw const AuthException(
                                  'Google sign-in timed out. Check the backend connection and try again.',
                                ),
                              );
                              if (mounted) setState(() {});
                            } catch (error) {
                              if (!mounted) return;
                              ScaffoldMessenger.of(
                                context,
                              ).showSnackBar(SnackBar(content: Text('$error')));
                            } finally {
                              if (mounted) setState(() => _signingIn = false);
                            }
                          },
                  ),
          ),
        ],
      );
    },
  );
}

Widget _stat(String label, int value) => BrutalSurface(
  padding: const EdgeInsets.all(14),
  child: Column(
    children: [
      Text(
        '$value',
        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
      ),
      Text(
        label,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
      ),
    ],
  ),
);
