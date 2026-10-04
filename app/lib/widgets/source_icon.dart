import 'package:flutter/material.dart';

import '../domain/models.dart';

class SourceIcon extends StatelessWidget {
  const SourceIcon({
    super.key,
    required this.platform,
    this.size = 20,
    this.showLabel = false,
  });
  final SourcePlatform platform;
  final double size;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    final brand = switch (platform) {
      SourcePlatform.instagram => (const Color(0xFFE1306C), '◎', 'Instagram'),
      SourcePlatform.reddit => (const Color(0xFFFF4500), '●', 'Reddit'),
      SourcePlatform.tiktok => (Colors.black, '♪', 'TikTok'),
      SourcePlatform.facebook => (const Color(0xFF1877F2), 'f', 'Facebook'),
      SourcePlatform.x => (Colors.black, '𝕏', 'X'),
    };
    final icon = Container(
      width: size + 12,
      height: size + 12,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: brand.$1,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        brand.$2,
        style: TextStyle(
          color: Colors.white,
          fontSize: size * .65,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
    return Semantics(
      label: '${brand.$3} source',
      image: true,
      child: Tooltip(
        message: brand.$3,
        child: showLabel
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [icon, const SizedBox(width: 6), Text(brand.$3)],
              )
            : icon,
      ),
    );
  }
}
