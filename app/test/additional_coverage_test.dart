import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saveyour/domain/models.dart';
import 'package:saveyour/screens.dart';
import 'package:saveyour/theme/app_theme.dart';
import 'package:saveyour/widgets/post_card.dart';

SavedPost post(MediaKind kind, {String? image}) => SavedPost(
  id: kind.name,
  title: kind.name,
  description: 'description',
  platform: SourcePlatform.x,
  mediaKind: kind,
  thumbnailUrl: image,
);

void main() {
  testWidgets('post card renders text media branch', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Material(
          child: SizedBox(
            width: 300,
            height: 300,
            child: PostCard(post: post(MediaKind.text), onTap: () {}),
          ),
        ),
      ),
    );
    expect(find.text('description'), findsWidgets);
  });

  testWidgets('post card renders fallback image branch', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Material(
          child: SizedBox(
            width: 300,
            height: 300,
            child: PostCard(post: post(MediaKind.image), onTap: () {}),
          ),
        ),
      ),
    );
    expect(find.byIcon(Icons.image_outlined), findsOneWidget);
  });

  testWidgets('post card renders video and carousel indicators', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Material(
          child: SizedBox(
            width: 300,
            height: 300,
            child: Column(
              children: [
                Expanded(
                  child: PostCard(
                    post: post(MediaKind.video, image: 'bad'),
                    onTap: () {},
                  ),
                ),
                Expanded(
                  child: PostCard(
                    post: post(MediaKind.carousel, image: 'bad'),
                    onTap: () {},
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.byIcon(Icons.play_arrow), findsOneWidget);
    expect(find.byIcon(Icons.collections_outlined), findsOneWidget);
  });

  testWidgets('album detail exposes persistent navigation', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AlbumDetailPage(
          albumId: 'ideas',
          repository: MockAppRepository(),
          onOpenPost: (_) {},
        ),
      ),
    );
    await tester.pump();
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Albums'), findsOneWidget);
  });

  testWidgets('profile logout invokes repository', (tester) async {
    var loggedOut = false;
    final repository = _ProfileStub(() => loggedOut = true);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: ProfilePage(repository: repository)),
      ),
    );
    await tester.pump();
    await tester.tap(find.text('Log out'));
    expect(loggedOut, isTrue);
  });

  testWidgets('brutal surface exposes styling', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: BrutalSurface(child: Text('surface'))),
    );
    final container = tester.widget<Container>(
      find
          .ancestor(of: find.text('surface'), matching: find.byType(Container))
          .first,
    );
    final decoration = container.decoration! as BoxDecoration;
    expect(decoration.border, isNotNull);
    expect(decoration.boxShadow, isNotEmpty);
  });
}

class _ProfileStub implements ProfileRepository {
  _ProfileStub(this.onLogout);
  final VoidCallback onLogout;
  @override
  Future<UserProfile> getProfile() async => const UserProfile(
    displayName: 'Test',
    username: '@test',
    avatarUrl: null,
    savedPostCount: 1,
    albumCount: 1,
    sourceCount: 1,
    tagCount: 1,
  );
  @override
  Future<void> logOut() async => onLogout();
}
