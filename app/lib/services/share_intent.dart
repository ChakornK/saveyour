import 'dart:async';

import 'package:flutter/services.dart';

typedef InitialSharedTextReader = Future<String?> Function();
typedef SharedTextHandlerRegistrar = void Function(
  Future<void> Function(String text) handler,
);

class ShareIntentService {
  ShareIntentService({
    InitialSharedTextReader? readInitial,
    SharedTextHandlerRegistrar? registerHandler,
    VoidCallback? unregisterHandler,
  }) : _readInitial = readInitial ?? _readInitialFromChannel,
       _registerHandler = registerHandler ?? _registerChannelHandler,
       _unregisterHandler = unregisterHandler ?? _unregisterChannelHandler;

  static const _channel = MethodChannel('tech.saveyour.SaveYour/share_intent');
  final InitialSharedTextReader _readInitial;
  final SharedTextHandlerRegistrar _registerHandler;
  final VoidCallback _unregisterHandler;
  final _links = StreamController<String>.broadcast();

  Stream<String> get links => _links.stream;

  Future<void> start() async {
    try {
      final initial = await _readInitial();
      if (initial != null && initial.isNotEmpty) _links.add(initial);
      _registerHandler(_emit);
    } on MissingPluginException {
      // Web and unsupported hosts simply have no native share stream.
    } on PlatformException {
      // Native hosts may expose the channel without implementing this method.
    }
  }

  Future<void> _emit(String text) async {
    if (text.isNotEmpty && !_links.isClosed) _links.add(text);
  }

  static Future<String?> _readInitialFromChannel() =>
      _channel.invokeMethod<String>('initialSharedText');

  static void _registerChannelHandler(
    Future<void> Function(String text) handler,
  ) {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'sharedText' && call.arguments is String) {
        await handler(call.arguments as String);
      }
    });
  }

  static void _unregisterChannelHandler() {
    _channel.setMethodCallHandler(null);
  }

  void dispose() {
    _unregisterHandler();
    _links.close();
  }
}
