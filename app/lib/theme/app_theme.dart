import 'package:flutter/material.dart';

abstract final class AppColors {
  static const background = Color(0xFFD0F8E8);
  static const emerald = Color(0xFF00D696);
  static const ink = Colors.black;
  static const paper = Colors.white;
  static const yellow = Color(0xFFFACC00);
}

abstract final class AppTheme {
  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.emerald,
      brightness: Brightness.light,
    );
    return ThemeData(
      colorScheme: scheme,
      scaffoldBackgroundColor: AppColors.background,
      fontFamily: 'Arial',
      useMaterial3: true,
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: AppColors.paper,
        border: OutlineInputBorder(
          borderSide: BorderSide(color: AppColors.ink, width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderSide: BorderSide(color: AppColors.ink, width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: BorderSide(color: AppColors.ink, width: 3),
        ),
      ),
    );
  }
}

class BrutalSurface extends StatelessWidget {
  const BrutalSurface({
    super.key,
    required this.child,
    this.color = AppColors.paper,
    this.padding = const EdgeInsets.all(16),
  });
  final Widget child;
  final Color color;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) => Container(
    padding: padding,
    decoration: BoxDecoration(
      color: color,
      border: Border.all(color: AppColors.ink, width: 2),
      borderRadius: BorderRadius.circular(5),
      boxShadow: const [BoxShadow(color: AppColors.ink, offset: Offset(4, 4))],
    ),
    child: child,
  );
}
