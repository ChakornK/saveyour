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
  List<Album> albums = [];
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final result = await widget.repository.listAlbums(query: search.text);
    if (mounted) setState(() => albums = result);
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
        onChanged: (_) => _load(),
        decoration: const InputDecoration(
          prefixIcon: Icon(Icons.search),
          hintText: 'Search albums and tags',
        ),
      ),
      const SizedBox(height: 16),
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
  final search = TextEditingController();
  @override
  void initState() {
    super.initState();
    widget.repository.getAlbum(widget.albumId).then((v) {
      if (mounted) setState(() => detail = v);
    });
  }

  @override
  Widget build(BuildContext context) {
    final d = detail;
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
      bottomNavigationBar: _NestedNavigationBar(),
    );
  }
}

class _NestedNavigationBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) => NavigationBar(
    selectedIndex: 1,
    onDestinationSelected: (index) {
      Navigator.of(context).popUntil((route) => route.isFirst);
      if (index != 1) DefaultTabController.of(context).animateTo(index);
    },
    destinations: const [
      NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
      NavigationDestination(icon: Icon(Icons.grid_view), label: 'Albums'),
      NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
    ],
  );
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
              p.displayName == 'SaveYour user' ? p.username : p.displayName,
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
