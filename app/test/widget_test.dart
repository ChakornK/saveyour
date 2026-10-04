import 'package:flutter_test/flutter_test.dart';

import 'package:saveyour/main.dart';

void main() {
  testWidgets('renders the unauthenticated welcome surface', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const SaveYourTechApp());
    await tester.pumpAndSettle();

    expect(find.text('saveyour.tech'), findsOneWidget);
    expect(find.text('Continue with Google'), findsOneWidget);
  });
}
