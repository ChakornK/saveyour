class GoogleAuthService {
  bool _signedIn = false;
  String? _email;

  bool get isSignedIn => _signedIn;
  String? get email => _email;

  Future<bool> signIn() async {
    // OAuth verifier and browser handoff are supplied by the API integration.
    _signedIn = true;
    _email = 'you@example.com';
    return _signedIn;
  }

  Future<void> signOut() async {
    _signedIn = false;
    _email = null;
  }
}
