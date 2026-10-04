import 'package:flutter/material.dart';

import '../domain/models.dart';
import '../theme/app_theme.dart';
import 'source_icon.dart';

class PostCard extends StatelessWidget {
  const PostCard({super.key, required this.post, required this.onTap});
  final SavedPost post;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: '${post.title}, ${post.platform.name}, ${post.mediaKind.name}, ${post.analysisStatus ?? 'status unavailable'}',
    child: BrutalSurface(
      padding: const EdgeInsets.all(12),
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _media()),
            const SizedBox(height: 12),
            Row(
              children: [
                SourceIcon(platform: post.platform, size: 15),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    post.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              post.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                _StatusChip(label: post.analysisStatus ?? 'Saved'),
                if (post.albums.isNotEmpty)
                  _StatusChip(label: '${post.albums.length} album${post.albums.length == 1 ? '' : 's'}'),
              ],
            ),
          ],
        ),
      ),
    ),
  );

  Widget _media() {
    if (post.mediaKind == MediaKind.text) {
      return Padding(
        padding: const EdgeInsets.all(6),
        child: Align(
          alignment: Alignment.topLeft,
          child: Text(
            post.description,
            maxLines: 9,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          ),
        ),
      );
    }
    if (post.thumbnailUrl == null) {
      return Container(
        color: Color(post.color),
        child: const Center(child: Icon(Icons.image_outlined, size: 46)),
      );
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        Image.network(
          post.thumbnailUrl!,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => Container(
            color: Color(post.color),
            child: const Icon(Icons.image_not_supported_outlined, size: 46),
          ),
        ),
        if (post.mediaKind == MediaKind.video)
          const Positioned(
            right: 8,
            bottom: 8,
            child: CircleAvatar(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
              child: Icon(Icons.play_arrow),
            ),
          ),
        if (post.mediaKind == MediaKind.carousel)
          const Positioned(
            right: 8,
            bottom: 8,
            child: CircleAvatar(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
              child: Icon(Icons.collections_outlined),
            ),
          ),
      ],
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => Container(
    constraints: const BoxConstraints(minHeight: 24),
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: AppColors.background,
      border: Border.all(color: AppColors.ink),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(
      label.toUpperCase(),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900),
    ),
  );
}
