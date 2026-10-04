import 'package:flutter/material.dart';

const _background = Color(0xFFD0F8E8);
const _emerald = Color(0xFF00D696);
const _ink = Colors.black;
const _paper = Colors.white;

void main() {
  runApp(const SaveYourTechApp());
}

class SaveYourTechApp extends StatelessWidget {
  const SaveYourTechApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'saveyour.tech',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: _emerald,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: _background,
        fontFamily: 'Arial',
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: _background,
        elevation: 0,
        title: const Text(
          'saveyour.tech',
          style: TextStyle(fontWeight: FontWeight.w900, color: _ink),
        ),
        centerTitle: true,
        leading: IconButton(
          onPressed: () {},
          tooltip: 'Pending analysis',
          icon: const Icon(Icons.hourglass_bottom, color: _ink),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FilledButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.add_link),
              label: const Text('Save link'),
              style: FilledButton.styleFrom(
                backgroundColor: _emerald,
                foregroundColor: _ink,
                side: const BorderSide(color: _ink, width: 2),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
              ),
            ),
          ),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            sliver: SliverToBoxAdapter(
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Search your saved internet',
                  prefixIcon: const Icon(Icons.search),
                  filled: true,
                  fillColor: _paper,
                  border: const OutlineInputBorder(
                    borderSide: BorderSide(color: _ink, width: 2),
                  ),
                  enabledBorder: const OutlineInputBorder(
                    borderSide: BorderSide(color: _ink, width: 2),
                  ),
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverGrid.builder(
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 320,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: .82,
              ),
              itemCount: 6,
              itemBuilder: (context, index) =>
                  _PostCard(index: index, title: "hi gang", desc: "What's up!"),
            ),
          ),
          const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        backgroundColor: _paper,
        selectedIndex: 0,
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
    );
  }
}

class _PostCard extends StatelessWidget {
  const _PostCard({
    required this.index,
    required this.title,
    required this.desc,
  });

  final int index;
  final String title;
  final String desc;

  @override
  Widget build(BuildContext context) {
    final colors = [
      const Color(0xFF7A83FF),
      const Color(0xFFFACC00),
      const Color(0xFFFF4D50),
      _emerald,
    ];
    return Card(
      color: _paper,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(5),
        side: const BorderSide(color: _ink, width: 2),
      ),
      child: InkWell(
        onTap: () {},
        onLongPress: () {},
        borderRadius: BorderRadius.circular(5),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: colors[index % colors.length],
                    border: Border.all(color: _ink, width: 2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Center(
                    child: Icon(Icons.auto_awesome, size: 48, color: _ink),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  color: _ink,
                ),
              ),
              const SizedBox(height: 6),
              Text(desc, style: TextStyle(fontSize: 12, color: _ink)),
            ],
          ),
        ),
      ),
    );
  }
}
