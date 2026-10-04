import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:saveyour/domain/models.dart';
import 'package:saveyour/main.dart';
import 'package:saveyour/services/api_client.dart';
import 'package:saveyour/services/share_intent.dart';
import 'package:saveyour/widgets/brutalist_button.dart';
import 'package:saveyour/widgets/post_detail_modal.dart';
import 'package:saveyour/widgets/source_icon.dart';

void main() {
  test('LoadState getters cover data and loading states', () {
    expect(const LoadState<int>(LoadStatus.success, data: 1).hasData, isTrue);
    expect(const LoadState<int>(LoadStatus.initial).hasData, isFalse);
    expect(const LoadState<int>(LoadStatus.loading).isLoading, isTrue);
    expect(const LoadState<int>(LoadStatus.refreshing).isLoading, isTrue);
    expect(const LoadState<int>(LoadStatus.success).isLoading, isFalse);
  });

  test('mock repository validates links and removes posts', () async {
    final repository = MockAppRepository();
    await expectLater(repository.saveLink('https://example.com'), completes);
    await expectLater(
      repository.saveLink('ftp://example.com'),
      throwsFormatException,
    );
    expect((await repository.listPosts()).length, 9);
    await repository.removePost('1');
    expect((await repository.listPosts()).length, 8);
  });

  test('API client sends successful mutations and encodes albums', () async {
    final requests = <http.Request>[];
    final client = MockClient((request) async {
      requests.add(request);
      return http.Response('{}', 204);
    });
    final api = ApiClient(client: client, baseUrl: 'https://api.test');
    await api.saveLink('https://example.com/a');
    await api.removePost('post/1');
    await api.removeFromAlbum('p1', 'My Album & Stuff');
    expect(requests[0].method, 'POST');
    expect(jsonDecode(requests[0].body), {'url': 'https://example.com/a'});
    expect(requests[1].url.path, '/captured-posts/post%2F1');
    expect(requests[2].url.path, contains('My%20Album%20%26%20Stuff'));
  });

  test('API client reports mutation failures and JSON fallbacks', () async {
    final client = MockClient((request) async {
      if (request.method == 'POST') return http.Response('', 500);
      if (request.method == 'DELETE') return http.Response('', 500);
      return http.Response(
        jsonEncode({
          'items': [
            {'id': 'p', 'platform': 'unknown', 'mediaKind': 'unknown'},
          ],
        }),
        200,
      );
    });
    final api = ApiClient(client: client);
    await expectLater(
      api.saveLink('https://x.test'),
      throwsA(isA<ApiException>()),
    );
    await expectLater(api.removePost('p'), throwsA(isA<ApiException>()));
    await expectLater(
      api.removeFromAlbum('p', 'a'),
      throwsA(isA<ApiException>()),
    );
    final post = (await api.listPosts()).single;
    expect(post.platform, SourcePlatform.x);
    expect(post.mediaKind, MediaKind.text);
    expect(const ApiException(400, 'bad').toString(), 'bad');
  });

  testWidgets('all source platform icons expose labels', (tester) async {
    for (final platform in SourcePlatform.values) {
      await tester.pumpWidget(
        MaterialApp(home: SourceIcon(platform: platform)),
      );
      expect(find.byTooltip(_platformLabel(platform)), findsOneWidget);
    }
  });

  testWidgets('button variants, disabled state, and press animation', (
    tester,
  ) async {
    for (final variant in BrutalistButtonVariant.values) {
      await tester.pumpWidget(
        MaterialApp(
          home: BrutalistButton(
            label: variant.name,
            variant: variant,
            onPressed: () {},
          ),
        ),
      );
      expect(find.text(variant.name), findsOneWidget);
      await tester.tap(find.text(variant.name));
      await tester.pump();
    }
    await tester.pumpWidget(
      const MaterialApp(
        home: BrutalistButton(label: 'Disabled', onPressed: null),
      ),
    );
    expect(
      tester
          .getSemantics(find.text('Disabled'))
          .hasFlag(SemanticsFlag.isEnabled),
      isFalse,
    );
  });

  testWidgets('modal close and delete callbacks execute', (tester) async {
    var deleted = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => ElevatedButton(
            onPressed: () => PostDetailModal.show(
              context,
              post: const SavedPost(
                id: 'p',
                title: 'P',
                description: 'D',
                platform: SourcePlatform.x,
                mediaKind: MediaKind.text,
              ),
              onDelete: () {
                deleted = true;
              },
              onRemoveFromAlbum: (_) {},
            ),
            child: const Text('Open'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Remove saved post'));
    expect(deleted, isTrue);
    await tester.tap(find.byTooltip('Close post details'));
    await tester.pumpAndSettle();
    expect(find.byType(PostDetailModal), findsNothing);
  });

  test('share intent emits native and initial links', () async {
    Future<void> Function(String text)? handler;
    var unregistered = false;
    final service = ShareIntentService(
      readInitial: () async => 'https://initial.test',
      registerHandler: (value) => handler = value,
      unregisterHandler: () => unregistered = true,
    );
    final links = <String>[];
    final subscription = service.links.listen(links.add);
    await service.start();
    await Future<void>.delayed(Duration.zero);
    expect(links, ['https://initial.test']);
    await handler!('https://shared.test');
    await Future<void>.delayed(Duration.zero);
    expect(links, ['https://initial.test', 'https://shared.test']);
    await subscription.cancel();
    service.dispose();
    expect(unregistered, isTrue);
  });

  testWidgets('wide home renders navigation rail', (tester) async {
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1;
    await tester.pumpWidget(const SaveYourTechApp());
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(NavigationRail), findsOneWidget);
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
  });
}

String _platformLabel(SourcePlatform platform) => switch (platform) {
  SourcePlatform.instagram => 'Instagram',
  SourcePlatform.reddit => 'Reddit',
  SourcePlatform.tiktok => 'TikTok',
  SourcePlatform.facebook => 'Facebook',
  SourcePlatform.x => 'X',
};
