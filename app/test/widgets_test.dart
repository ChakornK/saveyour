import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saveyour/domain/models.dart';
import 'package:saveyour/theme/app_theme.dart';
import 'package:saveyour/widgets/brutalist_button.dart';
import 'package:saveyour/widgets/post_card.dart';
import 'package:saveyour/widgets/source_icon.dart';

const post = SavedPost(
  id: 'test',
  title: 'Test post',
  description: 'Description',
  platform: SourcePlatform.instagram,
  mediaKind: MediaKind.text,
);

void main() {
  testWidgets('source icon exposes platform semantics', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: SourceIcon(platform: SourcePlatform.instagram)),
    );
    expect(find.byTooltip('Instagram'), findsOneWidget);
  });

  testWidgets('brutalist button renders accessible action', (tester) async {
    var pressed = false;
    await tester.pumpWidget(
      MaterialApp(
        home: BrutalistButton(label: 'Save', onPressed: () => pressed = true),
      ),
    );
    await tester.tap(find.text('Save'));
    expect(pressed, isTrue);
  });

  testWidgets('post card renders title and source', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Material(
          child: PostCard(post: post, onTap: () {}),
        ),
      ),
    );
    expect(find.text('Test post'), findsOneWidget);
    expect(find.byTooltip('Instagram'), findsOneWidget);
  });
}
