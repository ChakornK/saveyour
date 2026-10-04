import 'dart:async';

import 'package:flutter/services.dart';

class ShareIntentService {
  static const _channel = MethodChannel('tech.saveyour.SaveYour/share_intent');
  final _links = StreamController<String>.broadcast();

  Stream<String> get links => _links.stream;

  Future<void> start() async {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'sharedText' && call.arguments is String)
        _links.add(call.arguments as String);
    });
    try {
      final initial = await _channel.invokeMethod<String>('initialSharedText');
      if (initial != null && initial.isNotEmpty) _links.add(initial);
    } on MissingPluginException {
      // Web and unsupported hosts simply have no native share stream.
    }
  }

  void dispose() => _links.close();
}
