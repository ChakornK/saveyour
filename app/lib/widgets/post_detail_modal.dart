import 'package:flutter/material.dart';

import '../domain/models.dart';
import '../theme/app_theme.dart';
import 'source_icon.dart';

class PostDetailModal extends StatelessWidget {
  const PostDetailModal({
    super.key,
    required this.post,
    required this.onDelete,
    required this.onRemoveFromAlbum,
    this.onAddToAlbum,
    this.listAlbums,
  });
  final SavedPost post;
  final VoidCallback onDelete;
  final ValueChanged<String> onRemoveFromAlbum;
  final Future<void> Function(String albumId)? onAddToAlbum;
  final Future<List<Album>> Function()? listAlbums;

  static Future<void> show(
    BuildContext context, {
    required SavedPost post,
    required VoidCallback onDelete,
    required ValueChanged<String> onRemoveFromAlbum,
    Future<void> Function(String albumId)? onAddToAlbum,
    Future<List<Album>> Function()? listAlbums,
  }) {
    final child = PostDetailModal(
      post: post,
      onDelete: onDelete,
      onRemoveFromAlbum: onRemoveFromAlbum,
      onAddToAlbum: onAddToAlbum,
      listAlbums: listAlbums,
    );
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black54,
      builder: (_) => Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640, maxHeight: 760),
            child: DecoratedBox(
              decoration: const BoxDecoration(
                boxShadow: [
                  BoxShadow(color: AppColors.ink, offset: Offset(6, 6)),
                ],
              ),
              child: child,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Material(
    color: AppColors.paper,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(5),
      side: const BorderSide(color: AppColors.ink, width: 2),
    ),
    child: SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Align(
            alignment: Alignment.topRight,
            child: IconButton(
              tooltip: 'Close post details',
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close),
            ),
          ),
          Row(
            children: [
              const CircleAvatar(child: Icon(Icons.person)),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  post.username ?? 'Saved account',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
              SourceIcon(platform: post.platform),
            ],
          ),
          const SizedBox(height: 16),
          if (post.thumbnailUrl != null)
            AspectRatio(
              aspectRatio: 1.35,
              child: Image.network(
                post.thumbnailUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => _textPreview(),
              ),
            ),
          if (post.mediaKind == MediaKind.text) _textPreview(),
          const SizedBox(height: 18),
          Text(
            post.title,
            style: Theme.of(context).textTheme.headlineSmall
                ?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text(post.description),
          const SizedBox(height: 20),
          const Text(
            'IN ALBUMS',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
          ),
          ...post.albums.map(
            (album) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.folder_outlined),
              title: Text(album),
              trailing: IconButton(
                tooltip: 'Remove from $album',
                onPressed: () => onRemoveFromAlbum(album),
                icon: const Icon(Icons.remove_circle_outline),
              ),
            ),
          ),
          const SizedBox(height: 8),
          if (onAddToAlbum != null && listAlbums != null)
            FutureBuilder<List<Album>>(
              future: listAlbums!(),
              builder: (context, snapshot) => Wrap(
                spacing: 8,
                runSpacing: 8,
                children: (snapshot.data ?? const <Album>[])
                    .map(
                      (album) => FilterChip(
                        label: Text('Add ${album.name}'),
                        onSelected: (_) async {
                          await onAddToAlbum!(album.id);
                          if (context.mounted) Navigator.pop(context);
                        },
                      ),
                    )
                    .toList(),
              ),
            ),
          OutlinedButton.icon(
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline),
            label: const Text('Remove saved post'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red.shade700,
              side: BorderSide(color: Colors.red.shade700),
            ),
          ),
        ],
      ),
    ),
  );

  Widget _textPreview() => BrutalSurface(
    color: AppColors.background,
    child: Text(
      post.description,
      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
    ),
  );
}
