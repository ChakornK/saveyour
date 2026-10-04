import 'package:flutter_test/flutter_test.dart';
import 'package:saveyour/domain/models.dart';

void main() {
  test('mock repository filters posts by title, tags, and platform', () async {
    final repository = MockAppRepository();
    expect((await repository.listPosts(query: 'studio')).single.id, '1');
    expect((await repository.listPosts(query: 'instagram')).length, 2);
  });

  test('album assignments are idempotent and removable', () async {
    final repository = MockAppRepository();
    await repository.addToAlbum('1', 'reading');
    await repository.addToAlbum('1', 'reading');
    var album = await repository.getAlbum('reading');
    expect(album.posts.where((post) => post.id == '1'), hasLength(1));
    await repository.removeFromAlbum('1', 'Reading');
    album = await repository.getAlbum('reading');
    expect(album.posts.any((post) => post.id == '1'), isFalse);
  });

  test('album creation validates names', () async {
    final repository = MockAppRepository();
    expect(() => repository.createAlbum(''), throwsFormatException);
    expect(() => repository.createAlbum('Ideas'), throwsFormatException);
  });

  test('profile reports repository statistics', () async {
    final profile = await MockAppRepository().getProfile();
    expect(profile.savedPostCount, 9);
    expect(profile.sourceCount, greaterThan(0));
  });
}
