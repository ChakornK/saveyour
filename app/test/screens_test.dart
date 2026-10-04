import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saveyour/domain/models.dart';
import 'package:saveyour/screens.dart';

void main() {
  testWidgets('albums page loads albums and filters them', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AlbumsPage(repository: MockAppRepository(), onOpenPost: (_) {}),
        ),
      ),
    );
    expect(find.byType(TextField), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Recipes');
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(TextField), findsOneWidget);
  });

  testWidgets('album detail loads and filters posts', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AlbumDetailPage(
            albumId: 'ideas',
            repository: MockAppRepository(),
            onOpenPost: (_) {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Ideas'), findsWidgets);
    expect(find.text('A tiny studio setup'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'yellow');
    await tester.pump();
    expect(find.text('A tiny studio setup'), findsNothing);
  });

  testWidgets('profile page displays profile statistics', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: ProfilePage(repository: MockAppRepository())),
      ),
    );
    expect(find.byType(Scaffold), findsOneWidget);
    expect(find.byType(FutureBuilder<UserProfile>), findsOneWidget);
    expect(find.byType(Scaffold), findsOneWidget);
  });

  testWidgets('album detail post opens a modal', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AlbumDetailPage(
            albumId: 'ideas',
            repository: MockAppRepository(),
            onOpenPost: (_) {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('A tiny studio setup'));
    await tester.pumpAndSettle();
    expect(find.text('A tiny studio setup'), findsWidgets);
    expect(find.text('IN ALBUMS'), findsOneWidget);
  });
}
