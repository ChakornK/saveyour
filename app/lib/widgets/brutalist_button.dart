import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

enum BrutalistButtonVariant { primary, secondary, destructive }

class BrutalistButton extends StatefulWidget {
  const BrutalistButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.variant = BrutalistButtonVariant.secondary,
    this.tooltip,
  });

  final String label;
  final VoidCallback? onPressed;
  final Widget? icon;
  final BrutalistButtonVariant variant;
  final String? tooltip;

  @override
  State<BrutalistButton> createState() => _BrutalistButtonState();
}

class _BrutalistButtonState extends State<BrutalistButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final color = switch (widget.variant) {
      BrutalistButtonVariant.primary => AppColors.emerald,
      BrutalistButtonVariant.secondary => AppColors.paper,
      BrutalistButtonVariant.destructive => const Color(0xFFFFF0F0),
    };
    final child = AnimatedContainer(
      duration: const Duration(milliseconds: 110),
      transform: Matrix4.translationValues(_pressed ? 2 : 0, _pressed ? 2 : 0, 0),
      constraints: const BoxConstraints(minHeight: 44),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: color,
        border: Border.all(color: AppColors.ink, width: 2),
        borderRadius: BorderRadius.circular(5),
        boxShadow: [
          BoxShadow(
            color: AppColors.ink,
            offset: Offset(_pressed ? 2 : 4, _pressed ? 2 : 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (widget.icon != null) ...[widget.icon!, const SizedBox(width: 8)],
          Text(
            widget.label,
            style: TextStyle(
              color: widget.variant == BrutalistButtonVariant.destructive
                  ? Colors.red.shade800
                  : AppColors.ink,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
    final button = Semantics(
      button: true,
      enabled: widget.onPressed != null,
      label: widget.tooltip ?? widget.label,
      child: GestureDetector(
        onTap: widget.onPressed,
        onTapDown: widget.onPressed == null ? null : (_) => setState(() => _pressed = true),
        onTapUp: widget.onPressed == null ? null : (_) => setState(() => _pressed = false),
        onTapCancel: widget.onPressed == null ? null : () => setState(() => _pressed = false),
        child: child,
      ),
    );
    return widget.tooltip == null ? button : Tooltip(message: widget.tooltip!, child: button);
  }
}
