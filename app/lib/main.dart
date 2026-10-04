import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'domain/models.dart';
import 'services/api_client.dart' as api;
import 'services/auth.dart' as auth;
import 'services/session_store.dart';
import 'services/share_intent.dart';
import 'theme/app_theme.dart';
import 'widgets/post_card.dart';
import 'widgets/post_detail_modal.dart';
import 'screens.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SaveYourTechApp());
}

class SaveYourTechApp extends StatelessWidget {
  const SaveYourTechApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'saveyour.tech',
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light(),
    home: const HomePage(),
  );
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late final auth.GoogleAuthService _auth;
  late final api.ApiClient _repository;
  final _searchController = TextEditingController();
  Timer? _searchDebounce;
  final _shareIntents = ShareIntentService();
  StreamSubscription<String>? _shareSubscription;
  StreamSubscription<GoogleSignInAuthenticationEvent>? _googleAuthSubscription;
  Future<void>? _webGoogleInitialization;
  LoadState<List<SavedPost>> _state = const LoadState(LoadStatus.initial);
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    final sessions = SecureSessionStore();
    _auth = auth.GoogleAuthService(sessions: sessions);
    _repository = api.ApiClient(sessions: sessions);
    if (kIsWeb) {
      _webGoogleInitialization = _initializeWebGoogleSignIn();
    }
    _restoreAuth();
    _shareIntents.start();
    _shareSubscription = _shareIntents.links.listen(_showSaveDialogForUrl);
  }

  @override
  void dispose() {
    _shareSubscription?.cancel();
    _googleAuthSubscription?.cancel();
    _shareIntents.dispose();
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _restoreAuth() async {
    await _auth.restoreSession();
    if (_auth.isSignedIn) await _load();
    if (mounted) setState(() {});
  }

  Future<void> _logOut() async {
    await _auth.signOut();
    if (mounted) setState(() {});
  }

  Future<void> _initializeWebGoogleSignIn() async {
    try {
      await GoogleSignIn.instance.initialize(
        clientId: const String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID'),
      );
      _googleAuthSubscription = GoogleSignIn.instance.authenticationEvents
          .listen((event) async {
            if (event is GoogleSignInAuthenticationEventSignIn) {
              final idToken = event.user.authentication.idToken;
              if (idToken == null || idToken.isEmpty) return;
              try {
                await _auth.signInWithIdToken(idToken);
                if (mounted) setState(() {});
              } catch (error) {
                _showAuthError(error);
              }
            }
          }, onError: _showAuthError);
    } catch (error) {
      _showAuthError(error);
    }
  }

  void _showAuthError(Object error) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(error.toString())));
  }

  Future<void> _signIn() async {
    try {
      if (kIsWeb) {
        await (_webGoogleInitialization ??= _initializeWebGoogleSignIn());
        await GoogleSignIn.instance.attemptLightweightAuthentication(
          reportAllExceptions: true,
        );
        return;
      }
      await _auth.signIn();
      if (mounted) setState(() {});
    } catch (error) {
      _showAuthError(error);
    }
  }

  Future<void> _load() async {
    setState(() => _state = LoadState(LoadStatus.loading, data: _state.data));
    try {
      final posts = await _repository.listPosts(query: _searchController.text);
      if (mounted) {
        setState(
          () => _state = LoadState(
            posts.isEmpty ? LoadStatus.empty : LoadStatus.success,
            data: posts,
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _state = LoadState(LoadStatus.failure, message: '$error'),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_auth.isSignedIn) {
      return _WelcomePage(onContinue: _signIn);
    }
    final width = MediaQuery.sizeOf(context).width;
    final wide = width >= 760;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text(
          'saveyour.tech',
          style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.ink),
        ),
        actions: const [],
      ),
      body: Row(
        children: [
          if (wide)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 16, 8, 16),
              child: _NavigationRail(
                selected: _tab,
                onSelect: (value) => setState(() => _tab = value),
              ),
            ),
          Expanded(
            child: _tab == 0
                ? _homeContent()
                : _tab == 1
                ? AlbumsPage(repository: _repository, onOpenPost: _openPost)
                : ProfilePage(
                    repository: _repository,
                    auth: _auth,
                    onLoggedOut: _logOut,
                  ),
          ),
        ],
      ),
      floatingActionButton: _tab == 0
          ? _BrutalFab(onPressed: _showSaveDialog)
          : null,
      bottomNavigationBar: wide
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: _BrutalBottomNav(
                selected: _tab,
                onSelect: (value) => setState(() => _tab = value),
              ),
            ),
    );
  }

  Widget _homeContent() {
    final width = MediaQuery.sizeOf(context).width;
    final columns = width >= 1100
        ? 4
        : width >= 760
        ? 3
        : 2;
    return RefreshIndicator(
      color: AppColors.ink,
      backgroundColor: AppColors.emerald,
      onRefresh: _load,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            sliver: SliverToBoxAdapter(
              child: TextField(
                controller: _searchController,
                onChanged: (_) {
                  _searchDebounce?.cancel();
                  _searchDebounce = Timer(
                    const Duration(milliseconds: 350),
                    _load,
                  );
                },
                onSubmitted: (_) => _load(),
                textInputAction: TextInputAction.search,
                decoration: const InputDecoration(
                  hintText: 'Search your saved internet',
                  prefixIcon: Icon(Icons.search),
                ),
              ),
            ),
          ),
          if (_state.isLoading && !_state.hasData)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_state.status == LoadStatus.empty)
            SliverFillRemaining(
              child: Center(
                child: BrutalSurface(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.bookmark_add_outlined, size: 42),
                      const SizedBox(height: 12),
                      Text(
                        _searchController.text.isEmpty
                            ? 'Your archive is ready.'
                            : 'No saves match that search.',
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _searchController.text.isEmpty
                            ? 'Save a link to start building your memory.'
                            : 'Try a broader keyword or clear the search.',
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            )
          else if (_state.status == LoadStatus.failure)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_state.message ?? 'Something went wrong.'),
                    const SizedBox(height: 12),
                    FilledButton(onPressed: _load, child: const Text('Retry')),
                  ],
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverGrid.builder(
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  mainAxisSpacing: 18,
                  crossAxisSpacing: 18,
                  childAspectRatio: .80,
                ),
                itemCount: _state.data?.length ?? 0,
                itemBuilder: (context, index) => PostCard(
                  post: _state.data![index],
                  onTap: () => _openPost(_state.data![index]),
                ),
              ),
            ),
          const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
        ],
      ),
    );
  }

  Future<void> _showSaveDialog() async {
    final controller = TextEditingController();
    final url = await showDialog<String>(
      context: context,
      builder: (context) => _SaveLinkDialog(controller: controller),
    );
    if (url != null) await _showSaveDialogForUrl(url);
  }

  Future<void> _showSaveDialogForUrl(String url) async {
    try {
      final parsed = Uri.tryParse(url.trim());
      if (parsed == null ||
          !parsed.hasScheme ||
          (parsed.scheme != 'http' && parsed.scheme != 'https') ||
          parsed.host.isEmpty) {
        throw const api.ApiException(null, 'Enter a valid http or https URL.');
      }
      await _repository.saveLink(url.trim());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Link queued for capture.')),
        );
        await _load();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _openPost(SavedPost post) => PostDetailModal.show(
    context,
    post: post,
    onDelete: () async {
      await _repository.removePost(post.id);
      if (mounted) {
        Navigator.pop(context);
        _load();
      }
    },
    onAddToAlbum: (albumId) => _repository.addToAlbum(post.id, albumId),
    listAlbums: () => _repository.listAlbums(),
    onRemoveFromAlbum: (album) async {
      await _repository.removeFromAlbum(post.id, album);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Removed from $album')));
      }
    },
  );
}

class _BrutalFab extends StatefulWidget {
  const _BrutalFab({required this.onPressed});
  final VoidCallback onPressed;

  @override
  State<_BrutalFab> createState() => _BrutalFabState();
}

class _BrutalFabState extends State<_BrutalFab> {
  bool pressed = false;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: 'Save link',
    child: GestureDetector(
      onTap: widget.onPressed,
      onTapDown: (_) => setState(() => pressed = true),
      onTapUp: (_) => setState(() => pressed = false),
      onTapCancel: () => setState(() => pressed = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 110),
        transform: Matrix4.translationValues(
          pressed ? 2 : 0,
          pressed ? 2 : 0,
          0,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        decoration: BoxDecoration(
          color: AppColors.emerald,
          border: Border.all(color: AppColors.ink, width: 2),
          borderRadius: BorderRadius.circular(5),
          boxShadow: [
            BoxShadow(
              color: AppColors.ink,
              offset: Offset(pressed ? 2 : 4, pressed ? 2 : 4),
            ),
          ],
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.add_link),
            SizedBox(width: 8),
            Text('SAVE LINK', style: TextStyle(fontWeight: FontWeight.w900)),
          ],
        ),
      ),
    ),
  );
}

class _SaveLinkDialog extends StatelessWidget {
  const _SaveLinkDialog({required this.controller});
  final TextEditingController controller;

  @override
  Widget build(BuildContext context) => Dialog(
    insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
    child: BrutalSurface(
      padding: const EdgeInsets.all(20),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'SAVE A LINK',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                  ),
                ),
                IconButton(
                  tooltip: 'Close save dialog',
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text('Capture a post now. You can organize it later.'),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              autofocus: true,
              keyboardType: TextInputType.url,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => Navigator.pop(context, controller.text),
              decoration: const InputDecoration(
                labelText: 'Post URL',
                hintText: 'https://…',
                prefixIcon: Icon(Icons.link),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('CANCEL'),
                ),
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: () => Navigator.pop(context, controller.text),
                  icon: const Icon(Icons.add_link),
                  label: const Text('SAVE LINK'),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}

class _WelcomePage extends StatelessWidget {
  const _WelcomePage({required this.onContinue});
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: BrutalSurface(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'saveyour.tech',
                    style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Save the internet you want to remember.',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 28),
                  FilledButton.icon(
                    onPressed: onContinue,
                    icon: const Icon(Icons.login),
                    label: const Text('Continue with Google'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class _BrutalBottomNav extends StatelessWidget {
  const _BrutalBottomNav({required this.selected, required this.onSelect});
  final int selected;
  final ValueChanged<int> onSelect;

  static const _items = [
    (Icons.home_outlined, Icons.home, 'Home'),
    (Icons.grid_view_outlined, Icons.grid_view, 'Albums'),
    (Icons.person_outline, Icons.person, 'Profile'),
  ];

  @override
  Widget build(BuildContext context) => Container(
    height: 68,
    decoration: BoxDecoration(
      color: AppColors.paper,
      border: Border.all(color: AppColors.ink, width: 2),
      borderRadius: BorderRadius.circular(5),
      boxShadow: const [BoxShadow(color: AppColors.ink, offset: Offset(4, 4))],
    ),
    child: Row(
      children: [
        for (var index = 0; index < _items.length; index++)
          Expanded(
            child: _BrutalNavItem(
              icon: _items[index].$1,
              selectedIcon: _items[index].$2,
              label: _items[index].$3,
              selected: selected == index,
              onTap: () => onSelect(index),
            ),
          ),
      ],
    ),
  );
}

class _BrutalNavItem extends StatelessWidget {
  const _BrutalNavItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    label: label,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(3),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 140),
          decoration: BoxDecoration(
            color: selected ? AppColors.emerald : Colors.transparent,
            border: selected
                ? Border.all(color: AppColors.ink, width: 2)
                : null,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(selected ? selectedIcon : icon, size: 22),
              const SizedBox(height: 2),
              Text(
                label.toUpperCase(),
                style: const TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _NavigationRail extends StatelessWidget {
  const _NavigationRail({required this.selected, required this.onSelect});
  final int selected;
  final ValueChanged<int> onSelect;
  @override
  Widget build(BuildContext context) => NavigationRail(
    selectedIndex: selected,
    onDestinationSelected: onSelect,
    labelType: NavigationRailLabelType.all,
    destinations: const [
      NavigationRailDestination(
        icon: Icon(Icons.home_outlined),
        selectedIcon: Icon(Icons.home),
        label: Text('Home'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.grid_view_outlined),
        selectedIcon: Icon(Icons.grid_view),
        label: Text('Albums'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.person_outline),
        selectedIcon: Icon(Icons.person),
        label: Text('Profile'),
      ),
    ],
  );
}
