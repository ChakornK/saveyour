import 'package:flutter/material.dart';

import '../domain/models.dart';

class SourceIcon extends StatelessWidget {
  const SourceIcon({super.key, required this.platform, this.size = 20});
  final SourcePlatform platform;
  final double size;

  @override
  Widget build(BuildContext context) => Tooltip(
    message: platform.name,
    child: Container(
      width: size + 12,
      height: size + 12,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        _label,
        style: TextStyle(
          color: Colors.white,
          fontSize: size * .55,
          fontWeight: FontWeight.w900,
        ),
      ),
    ),
  );

  String get _label => switch (platform) {
    SourcePlatform.instagram => '◎',
    SourcePlatform.reddit => 'r/',
    SourcePlatform.tiktok => '♪',
    SourcePlatform.facebook => 'f',
    SourcePlatform.x => '𝕏',
  };
}
