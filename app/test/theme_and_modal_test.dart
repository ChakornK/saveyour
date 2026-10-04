import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saveyour/domain/models.dart';
import 'package:saveyour/theme/app_theme.dart';
import 'package:saveyour/widgets/post_detail_modal.dart';

const testPost = SavedPost(
  id: 'p1',
  title: 'Modal post',
  description: 'Modal description',
  platform: SourcePlatform.reddit,
  mediaKind: MediaKind.text,
  albums: ['Ideas'],
);

void main() {
  test('light theme defines neobrutalist control sizes', () {
    final theme = AppTheme.light();
    expect(
      theme.filledButtonTheme.style?.minimumSize?.resolve({}),
      const Size(44, 44),
    );
    expect(
      theme.outlinedButtonTheme.style?.minimumSize?.resolve({}),
      const Size(44, 44),
    );
    expect(AppColors.background, const Color(0xFFD0F8E8));
  });

  testWidgets('post detail modal renders album actions and closes', (
    tester,
  ) async {
    var removed = '';
    var added = '';
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => ElevatedButton(
            onPressed: () => PostDetailModal.show(
              context,
              post: testPost,
              onDelete: () {},
              onRemoveFromAlbum: (album) => removed = album,
              onAddToAlbum: (album) async => added = album,
              listAlbums: () async => [
                Album(
                  id: 'reading',
                  name: 'Reading',
                  coverPost: null,
                  postCount: 0,
                  tags: const {},
                  updatedAt: DateTime(2025),
                  visibility: AlbumVisibility.private,
                ),
              ],
            ),
            child: const Text('Open'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    expect(find.text('Modal post'), findsOneWidget);
    expect(find.text('Add Reading'), findsOneWidget);
    await tester.tap(find.text('Add Reading'));
    await tester.pumpAndSettle();
    expect(added, 'reading');
    expect(find.text('Modal post'), findsNothing);

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Remove from Ideas'));
    expect(removed, 'Ideas');
  });
}
