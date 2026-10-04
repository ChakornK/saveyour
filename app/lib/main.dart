import 'dart:async';

import 'package:flutter/material.dart';

import 'domain/models.dart';
import 'services/api_client.dart';
import 'services/share_intent.dart';
import 'theme/app_theme.dart';
import 'widgets/post_card.dart';
import 'widgets/post_detail_modal.dart';
import 'screens.dart';

void main() => runApp(const SaveYourTechApp());

class SaveYourTechApp extends StatelessWidget {
  const SaveYourTechApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'saveyour.tech',
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
  final _repository = ApiClient();
  final _searchController = TextEditingController();
  final _shareIntents = ShareIntentService();
  StreamSubscription<String>? _shareSubscription;
  LoadState<List<SavedPost>> _state = const LoadState(LoadStatus.initial);
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    _load();
    _shareIntents.start();
    _shareSubscription = _shareIntents.links.listen(_showSaveDialogForUrl);
  }

  @override
  void dispose() {
    _shareSubscription?.cancel();
    _shareIntents.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _state = LoadState(LoadStatus.loading, data: _state.data));
    try {
      final posts = await _repository.listPosts(query: _searchController.text);
      if (mounted)
        setState(
          () => _state = LoadState(
            posts.isEmpty ? LoadStatus.empty : LoadStatus.success,
            data: posts,
          ),
        );
    } catch (error) {
      if (mounted)
        setState(
          () => _state = LoadState(LoadStatus.failure, message: '$error'),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 760;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text(
          'saveyour.tech',
          style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.ink),
        ),
        actions: [
          if (_tab == 0)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: FilledButton.icon(
                onPressed: () =>
                    FocusScope.of(context).requestFocus(FocusNode()),
                icon: const Icon(Icons.search),
                label: const Text('Search'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.emerald,
                  foregroundColor: AppColors.ink,
                  side: const BorderSide(color: AppColors.ink, width: 2),
                ),
              ),
            ),
        ],
      ),
      body: Row(
        children: [
          if (wide)
            _NavigationRail(
              selected: _tab,
              onSelect: (value) => setState(() => _tab = value),
            ),
          Expanded(
            child: _tab == 0
                ? _homeContent()
                : _tab == 1
                ? AlbumsPage(repository: _repository, onOpenPost: _openPost)
                : ProfilePage(repository: _repository),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: NavigationBar(
          backgroundColor: AppColors.paper,
          selectedIndex: _tab,
          onDestinationSelected: (value) => setState(() => _tab = value),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.grid_view_outlined),
              selectedIcon: Icon(Icons.grid_view),
              label: 'Albums',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }

  Widget _homeContent() => RefreshIndicator(
    onRefresh: _load,
    child: CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          sliver: SliverToBoxAdapter(
            child: TextField(
              controller: _searchController,
              onChanged: (_) => _load(),
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
          const SliverFillRemaining(
            child: Center(
              child: Text('Nothing saved yet. Try a different search.'),
            ),
          )
        else if (_state.status == LoadStatus.failure)
          SliverFillRemaining(
            child: Center(
              child: Text(_state.message ?? 'Something went wrong.'),
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverGrid.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
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

  Future<void> _showSaveDialog() async {
    final controller = TextEditingController();
    final url = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Save a link'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'https://…'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (url != null) await _showSaveDialogForUrl(url);
  }

  Future<void> _showSaveDialogForUrl(String url) async {
    try {
      await _repository.saveLink(url);
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Link queued for capture.')),
        );
    } catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
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
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Removed from $album')));
    },
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
