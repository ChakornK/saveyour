import 'package:flutter_test/flutter_test.dart';

import 'package:saveyour/main.dart';

void main() {
  testWidgets('renders the saveyour.tech home surface', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const SaveYourTechApp());
    await tester.pumpAndSettle();

    expect(find.text('saveyour.tech'), findsOneWidget);
    expect(find.text('Search your saved internet'), findsOneWidget);
    expect(find.text('Home'), findsWidgets);
    expect(find.text('Albums'), findsWidgets);
    expect(find.text('Profile'), findsWidgets);
  });
}
