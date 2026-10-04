import 'package:flutter/material.dart';

abstract final class AppColors {
  static const background = Color(0xFFD0F8E8);
  static const emerald = Color(0xFF00D696);
  static const ink = Colors.black;
  static const paper = Colors.white;
  static const yellow = Color(0xFFFACC00);
  static const blue = Color(0xFF7A83FF);
  static const red = Color(0xFFFF4D50);
  static const sky = Color(0xFF0099FF);
}

abstract final class AppTheme {
  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.emerald,
      brightness: Brightness.light,
    );
    final textTheme = Typography.blackMountainView
        .apply(
          bodyColor: AppColors.ink,
          displayColor: AppColors.ink,
          fontFamily: 'Sora',
        )
        .copyWith(
          displayLarge: const TextStyle(fontFamily: 'Sora'),
          displayMedium: const TextStyle(fontFamily: 'Sora'),
          displaySmall: const TextStyle(fontFamily: 'Sora'),
          headlineLarge: const TextStyle(fontFamily: 'Sora'),
          headlineMedium: const TextStyle(fontFamily: 'Sora'),
          headlineSmall: const TextStyle(fontFamily: 'Sora'),
          titleLarge: const TextStyle(fontFamily: 'Sora'),
          titleMedium: const TextStyle(fontFamily: 'Sora'),
          titleSmall: const TextStyle(fontFamily: 'Sora'),
          bodyLarge: const TextStyle(fontFamily: 'Sora'),
          bodyMedium: const TextStyle(fontFamily: 'Sora'),
          bodySmall: const TextStyle(fontFamily: 'Sora'),
          labelLarge: const TextStyle(fontFamily: 'Sora'),
          labelMedium: const TextStyle(fontFamily: 'Sora'),
          labelSmall: const TextStyle(fontFamily: 'Sora'),
        );
    return ThemeData(
      primarySwatch: Colors.green,
      colorScheme: scheme.copyWith(
        primary: AppColors.emerald,
        onPrimary: AppColors.ink,
        surface: AppColors.paper,
        onSurface: AppColors.ink,
        error: AppColors.red,
      ),
      scaffoldBackgroundColor: AppColors.background,
      fontFamily: 'Sora',
      textTheme: textTheme,
      primaryTextTheme: textTheme,
      useMaterial3: true,
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: AppColors.paper,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(5)),
          borderSide: BorderSide(color: AppColors.ink, width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(5)),
          borderSide: BorderSide(color: AppColors.ink, width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(5)),
          borderSide: BorderSide(color: AppColors.ink, width: 3),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(44, 44),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
          side: const BorderSide(color: AppColors.ink, width: 2),
          backgroundColor: AppColors.emerald,
          foregroundColor: AppColors.ink,
          elevation: 0,
          shadowColor: AppColors.ink,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(44, 44),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
          side: const BorderSide(color: AppColors.ink, width: 2),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(44, 44),
          foregroundColor: AppColors.ink,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.paper,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
        elevation: 0,
        titleTextStyle: const TextStyle(
          color: AppColors.ink,
          fontFamily: 'Sora',
          fontSize: 22,
          fontWeight: FontWeight.w900,
        ),
        contentTextStyle: const TextStyle(
          color: AppColors.ink,
          fontFamily: 'Sora',
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.paper,
        indicatorColor: AppColors.emerald,
        height: 72,
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontFamily: 'Sora', fontWeight: FontWeight.w800),
        ),
      ),
      navigationRailTheme: const NavigationRailThemeData(
        backgroundColor: AppColors.paper,
        indicatorColor: AppColors.emerald,
        useIndicator: true,
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: AppColors.emerald,
        foregroundColor: AppColors.ink,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
        extendedPadding: const EdgeInsets.symmetric(horizontal: 18),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.ink,
        contentTextStyle: const TextStyle(
          color: AppColors.paper,
          fontFamily: 'Sora',
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
        behavior: SnackBarBehavior.floating,
        elevation: 0,
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
