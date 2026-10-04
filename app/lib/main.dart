import 'package:flutter/material.dart';
import 'domain/models.dart';
import 'theme/app_theme.dart';

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
  final _repository = MockAppRepository();
  final _searchController = TextEditingController();
  LoadState<List<SavedPost>> _state = const LoadState(LoadStatus.initial);
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _state = LoadState(LoadStatus.loading, data: _state.data));
    try {
      final posts = await _repository.listPosts(query: _searchController.text);
      if (mounted) setState(() => _state = LoadState(posts.isEmpty ? LoadStatus.empty : LoadStatus.success, data: posts));
    } catch (error) {
      if (mounted) setState(() => _state = LoadState(LoadStatus.failure, message: '$error'));
    }
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 760;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text('saveyour.tech', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.ink)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FilledButton.icon(
              onPressed: _showSaveDialog,
              icon: const Icon(Icons.add_link),
              label: const Text('Save link'),
              style: FilledButton.styleFrom(backgroundColor: AppColors.emerald, foregroundColor: AppColors.ink, side: const BorderSide(color: AppColors.ink, width: 2)),
            ),
          ),
        ],
      ),
      body: Row(
        children: [
          if (wide) _NavigationRail(selected: _tab, onSelect: (value) => setState(() => _tab = value)),
          Expanded(child: _tab == 0 ? _homeContent() : _placeholderContent()),
        ],
      ),
      bottomNavigationBar: wide ? null : NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (value) => setState(() => _tab = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view), label: 'Albums'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
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
                  decoration: const InputDecoration(hintText: 'Search your saved internet', prefixIcon: Icon(Icons.search)),
                ),
              ),
            ),
            if (_state.isLoading && !_state.hasData)
              const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
            else if (_state.status == LoadStatus.empty)
              const SliverFillRemaining(child: Center(child: Text('Nothing saved yet. Try a different search.')))
            else if (_state.status == LoadStatus.failure)
              SliverFillRemaining(child: Center(child: Text(_state.message ?? 'Something went wrong.')))
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverGrid.builder(
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 320, mainAxisSpacing: 16, crossAxisSpacing: 16, childAspectRatio: .82),
                  itemCount: _state.data?.length ?? 0,
                  itemBuilder: (context, index) => _PostCard(post: _state.data![index]),
                ),
              ),
            const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
          ],
        ),
      );

  Widget _placeholderContent() => Center(child: BrutalSurface(child: Text(_tab == 1 ? 'Albums are coming next.' : 'Your profile will live here.')));

  Future<void> _showSaveDialog() async {
    final controller = TextEditingController();
    final url = await showDialog<String>(context: context, builder: (context) => AlertDialog(title: const Text('Save a link'), content: TextField(controller: controller, autofocus: true, decoration: const InputDecoration(hintText: 'https://…')), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text('Save'))]));
    if (url == null || url.trim().isEmpty || !mounted) return;
    try {
      await _repository.saveLink(url);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Link queued for capture.')));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }
}

class _NavigationRail extends StatelessWidget {
  const _NavigationRail({required this.selected, required this.onSelect});
  final int selected;
  final ValueChanged<int> onSelect;
  @override
  Widget build(BuildContext context) => NavigationRail(selectedIndex: selected, onDestinationSelected: onSelect, labelType: NavigationRailLabelType.all, destinations: const [NavigationRailDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: Text('Home')), NavigationRailDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view), label: Text('Albums')), NavigationRailDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: Text('Profile'))]);
}

class _PostCard extends StatelessWidget {
  const _PostCard({required this.post});
  final SavedPost post;
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: '${post.title}, ${post.platform}',
        child: BrutalSurface(
          padding: const EdgeInsets.all(12),
          child: InkWell(
            onTap: () {},
            onLongPress: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Post selected'))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: Container(decoration: BoxDecoration(color: Color(post.color), border: Border.all(color: AppColors.ink, width: 2), borderRadius: BorderRadius.circular(4)), child: const Center(child: Icon(Icons.auto_awesome, size: 48)))), const SizedBox(height: 10), Text(post.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)), const SizedBox(height: 6), Text(post.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)), const SizedBox(height: 8), Text(post.platform.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold))]),
          ),
        ),
      );
}
