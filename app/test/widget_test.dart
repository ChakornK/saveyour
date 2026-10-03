import 'package:flutter_test/flutter_test.dart';

import 'package:saveyour_tech/main.dart';

void main() {
  testWidgets('renders the saveyour.tech home surface', (WidgetTester tester) async {
    await tester.pumpWidget(const SaveYourTechApp());

    expect(find.text('saveyour.tech'), findsOneWidget);
    expect(find.text('Search your saved internet'), findsOneWidget);
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Albums'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
  });
}
