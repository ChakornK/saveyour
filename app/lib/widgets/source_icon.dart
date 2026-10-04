import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

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
      SourcePlatform.instagram => (
        const Color(0xFFE1306C),
        FontAwesomeIcons.instagram,
        'Instagram',
      ),
      SourcePlatform.reddit => (
        const Color(0xFFFF4500),
        FontAwesomeIcons.redditAlien,
        'Reddit',
      ),
      SourcePlatform.tiktok => (
        Colors.black,
        FontAwesomeIcons.tiktok,
        'TikTok',
      ),
      SourcePlatform.facebook => (
        const Color(0xFF1877F2),
        FontAwesomeIcons.facebookF,
        'Facebook',
      ),
      SourcePlatform.x => (Colors.black, FontAwesomeIcons.xTwitter, 'X'),
    };
    final icon = Container(
      width: size + 12,
      height: size + 12,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: brand.$1,
        borderRadius: BorderRadius.circular(4),
      ),
      child: FaIcon(brand.$2, color: Colors.white, size: size * .65),
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
