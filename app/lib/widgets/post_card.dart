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
    label: '${post.title}, ${post.platform.name}, ${post.mediaKind.name}',
    child: BrutalSurface(
      padding: const EdgeInsets.all(12),
      child: InkWell(
        onTap: onTap,
        onLongPress: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _media()),
            const SizedBox(height: 10),
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
          ],
        ),
      ),
    ),
  );

  Widget _media() {
    if (post.mediaKind == MediaKind.text)
      return BrutalSurface(
        color: AppColors.background,
        padding: const EdgeInsets.all(14),
        child: Text(
          post.description,
          maxLines: 7,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      );
    if (post.thumbnailUrl == null)
      return Container(
        color: Color(post.color),
        child: const Center(child: Icon(Icons.image_outlined, size: 46)),
      );
    return Stack(
      fit: StackFit.expand,
      children: [
        Image.network(
          post.thumbnailUrl!,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
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
