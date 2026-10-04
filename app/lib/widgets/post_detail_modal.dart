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
  });
  final SavedPost post;
  final VoidCallback onDelete;
  final ValueChanged<String> onRemoveFromAlbum;

  static Future<void> show(
    BuildContext context, {
    required SavedPost post,
    required VoidCallback onDelete,
    required ValueChanged<String> onRemoveFromAlbum,
  }) {
    final wide = MediaQuery.sizeOf(context).width >= 760;
    final content = PostDetailModal(
      post: post,
      onDelete: onDelete,
      onRemoveFromAlbum: onRemoveFromAlbum,
    );
    if (wide) {
      return showDialog<void>(
        context: context,
        builder: (_) => Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.all(32),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640, maxHeight: 760),
            child: content,
          ),
        ),
      );
    }
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => content,
    );
  }

  @override
  Widget build(BuildContext context) => DraggableScrollableSheet(
    initialChildSize: .78,
    maxChildSize: .94,
    minChildSize: .5,
    builder: (context, controller) => Material(
      color: AppColors.paper,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(5),
        side: BorderSide(color: AppColors.ink, width: 2),
      ),
      child: ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        children: [
          Center(child: Container(width: 44, height: 5, color: AppColors.ink)),
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
                errorBuilder: (_, __, ___) => _textPreview(),
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
          if (post.mediaKind == MediaKind.video ||
              post.mediaKind == MediaKind.carousel)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Play media',
                    onPressed: () {},
                    icon: const Icon(Icons.play_arrow),
                  ),
                  IconButton(
                    tooltip: 'Previous media',
                    onPressed: () {},
                    icon: const Icon(Icons.chevron_left),
                  ),
                  IconButton(
                    tooltip: 'Next media',
                    onPressed: () {},
                    icon: const Icon(Icons.chevron_right),
                  ),
                ],
              ),
            ),
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
