/* API & Web: JWT / OAuth 2.0. */
Atlas.topics.push({
  id: 'jwt-oauth-2-0',
  category: 'api-web',
  title: 'JWT / OAuth 2.0',
  source: {
    description: 'Signed tokens and delegated access without sharing passwords.',
    steps: ['User approves app', 'Auth server issues token', 'App calls API', 'API verifies signature'],
  },
  estMinutes: 16,
  prereqs: ['authentication-authorization', 'http-https'],
  related: ['session-management', 'security-best-practices', 'api-gateway', 'secrets-management'],
  tags: ['jwt', 'oauth', 'oidc', 'access token', 'refresh token', 'pkce', 'bearer', 'jwks', 'scopes', 'authorization code'],
  visual: {
    type: 'sequence',
    config: {
      actors: [
        { id: 'user', label: 'User' },
        { id: 'app', label: 'Client app' },
        { id: 'auth', label: 'Auth server' },
        { id: 'api', label: 'Resource API' },
      ],
    },
  },
  steps: [
    {
      label: 'User approves app',
      caption: {
        beginner: 'An app asks to use your account on another service. You are sent to the real login page and click "Allow". The app never sees your password.',
        intermediate: 'Authorization Code flow with PKCE: the app redirects the user to the authorization server with client_id, scopes, redirect_uri, state and a code_challenge. The user logs in there and consents.',
        expert: 'Use the authorization code flow with PKCE for browsers, mobile and server apps. Validate state to stop CSRF, register exact redirect URIs, and request least-privilege scopes. The implicit flow and password grant are deprecated in current OAuth guidance.',
      },
      state: {
        messages: [
          { from: 'app', to: 'user', label: 'redirect to login (scope, PKCE challenge)', tone: 'primary', back: true },
          { from: 'user', to: 'auth', label: 'log in and approve', tone: 'accent' },
        ],
      },
    },
    {
      label: 'Auth server issues token',
      caption: {
        beginner: 'The login service gives the app a short-lived pass (token) instead of your password.',
        intermediate: 'The user is redirected back with a one-time code. The app exchanges the code plus the PKCE verifier at the token endpoint for an access token (short-lived), often a refresh token, and an ID token for OIDC.',
        expert: 'Access tokens are short-lived (minutes); refresh tokens are long-lived, stored securely and ideally rotated with reuse detection. The code is single-use and bound to the client and redirect URI. Back-channel exchange keeps tokens out of browser history.',
      },
      state: {
        messages: [
          { from: 'auth', to: 'app', label: 'redirect with ?code=...', tone: 'primary' },
          { from: 'app', to: 'auth', label: 'POST /token (code + code_verifier)', tone: 'accent' },
          { from: 'auth', to: 'app', label: 'access_token (JWT), refresh_token', tone: 'ok', back: true },
        ],
      },
      hood: 'JWT = base64url(header).base64url(payload).signature. The payload is readable by anyone who holds the token.',
    },
    {
      label: 'App calls API',
      caption: {
        beginner: 'The app shows its pass to the other service each time it asks for your data.',
        intermediate: 'The app sends Authorization: Bearer <access_token> on each API request. Anyone holding the token can use it, so it must travel only over HTTPS and be stored carefully.',
        expert: 'Bearer tokens are bearer instruments: theft equals impersonation. Reduce risk with short lifetimes, sender-constrained tokens (DPoP or mTLS), HttpOnly cookie storage or a backend-for-frontend instead of localStorage, and audience-restricted tokens.',
      },
      state: { messages: [{ from: 'app', to: 'api', label: 'GET /me  Authorization: Bearer eyJ...', tone: 'accent' }] },
    },
    {
      label: 'API verifies signature',
      caption: {
        beginner: 'The service checks the pass is genuine and not expired, then answers. It does not need to phone the login service for each request.',
        intermediate: 'The API verifies the signature with the issuer\'s public key (from the JWKS endpoint), then checks exp, iss, aud and scopes. If all pass it serves the request; otherwise 401 or 403.',
        expert: 'Pin allowed algorithms and key ids, cache JWKS with rotation support, enforce iss and aud, allow small clock skew, and never accept alg=none. Verification is stateless so revocation is limited: use short lifetimes, refresh token revocation or token introspection for sensitive calls.',
      },
      state: {
        messages: [
          { from: 'api', to: 'api', label: 'verify signature, exp, aud, scope', tone: 'primary' },
          { from: 'api', to: 'app', label: '200 {"name":"Asha"}', tone: 'ok', back: true },
        ],
      },
      hood: 'Asymmetric signatures (RS256, ES256) let APIs verify without being able to mint tokens; HS256 shares one secret.',
    },
  ],
  levels: {
    beginner: {
      analogy: 'A valet key and a wristband. A valet key lets someone park your car without opening the glovebox or boot: limited access without handing over your master key (OAuth gives an app limited access without your password). A festival wristband is checked by looking at it, with no phone call to the box office (a signed token that anyone can verify).',
      explanation: 'OAuth 2.0 lets you give an app limited access to your account on another service without giving it your password. You log in on the real service, approve what the app may do, and the service gives the app a token. A JWT is a common token format: it is a small signed piece of text that carries facts such as who you are and when the token expires, and servers can check it was not changed.',
      keyTerms: [
        { term: 'OAuth 2.0', meaning: 'A way to grant an app limited access without sharing your password.' },
        { term: 'Access token', meaning: 'A short-lived pass the app shows to the API.' },
        { term: 'Refresh token', meaning: 'A longer-lived secret used to get new access tokens.' },
        { term: 'JWT', meaning: 'A signed token with readable claims about the user and its expiry.' },
        { term: 'Scope', meaning: 'A named permission the app asked for, like "read:profile".' },
        { term: 'Signature', meaning: 'A proof that the token was issued by the trusted server and not altered.' },
      ],
    },
    intermediate: {
      explanation: 'OAuth 2.0 is an authorization framework; OpenID Connect (OIDC) adds authentication (an ID token and user info). JWT (RFC 7519) is a token format: header.payload.signature, base64url-encoded. APIs validate JWT access tokens locally with the issuer\'s public key, which makes verification fast and stateless, at the price of harder revocation.',
      howItWorks: [
        'The client redirects the user to the authorization endpoint with client_id, redirect_uri, scope, state and a PKCE code_challenge.',
        'The user authenticates and consents; the server redirects back with a short-lived authorization code.',
        'The client calls the token endpoint with the code and PKCE verifier and receives access (and refresh) tokens.',
        'The client calls the API with Authorization: Bearer <token>.',
        'The API verifies the signature (via JWKS), exp, iss, aud and scopes, then authorizes the request.',
        'When the access token expires, the client uses the refresh token to obtain a new one.',
      ],
      tradeoffs: {
        use: [
          'Use OAuth/OIDC for third-party access, single sign-on and mobile or SPA clients.',
          'Use JWT access tokens when many services must verify identity without calling a central store.',
          'Use scopes and audiences to limit what a token can do and where it works.',
        ],
        avoid: [
          'Avoid JWTs as long-lived session replacements when you need instant revocation; server sessions fit better.',
          'Avoid putting sensitive data in the payload; it is encoded, not encrypted.',
          'Avoid storing tokens in localStorage for browser apps when XSS is a concern; prefer HttpOnly cookies or a BFF.',
        ],
      },
      pitfalls: [
        'Accepting tokens without checking aud and iss, so a token for another service works.',
        'Trusting the alg header from the token (alg=none, RS256/HS256 confusion).',
        'Skipping the state parameter or exact redirect URI matching, enabling login CSRF and code theft.',
        'Using the implicit flow or password grant, which current guidance discourages.',
        'Treating an ID token as an access token for APIs.',
      ],
    },
    expert: {
      internals: [
        'JWS (signed JWT) structure: base64url(header) . base64url(claims) . signature. Registered claims include iss, sub, aud, exp, nbf, iat and jti. JWE adds encryption, which is rarely needed for access tokens.',
        'PKCE binds the authorization code to the client that started the flow using a code_verifier and its SHA-256 challenge, defeating code interception; OAuth 2.1 requires it for all code flows.',
        'JWKS endpoints publish public keys with key ids (kid); verifiers cache them and refetch when an unknown kid appears, which supports key rotation.',
        'Token introspection (RFC 7662) and revocation (RFC 7009) give opaque tokens central control at the cost of a network call.',
        'Sender-constrained tokens (DPoP, mTLS-bound) make stolen bearer tokens unusable from another client.',
      ],
      failureModes: [
        'Algorithm confusion and alg=none acceptance, allowing forged tokens.',
        'Stolen refresh tokens enabling long-term access; mitigate with rotation and reuse detection.',
        'Key rotation outages when verifiers cache the JWKS forever or the issuer drops old keys too early.',
        'Clock skew rejecting valid tokens, or tolerances so large that expiry is meaningless.',
        'Over-large JWTs (many claims or roles) exceeding header size limits at proxies.',
      ],
      scalingNotes: [
        'Local JWT verification scales horizontally with no shared state; the auth server only handles logins and refreshes.',
        'Keep access tokens small and short-lived (minutes). Move volatile permissions out of the token and check them at the resource.',
        'Use an API gateway to validate tokens once at the edge and pass trusted identity headers internally, protecting internal hops with mTLS.',
      ],
      realSystems: [
        'Keycloak, Auth0, Okta, AWS Cognito, Azure AD / Entra ID, Google Identity as authorization servers.',
        'PyJWT and Authlib in Python; FastAPI OAuth2PasswordBearer and dependency-based verification.',
        '"Sign in with Google/GitHub" are OAuth 2.0 / OIDC authorization code flows.',
      ],
      numbersToKnow: [
        'Access token lifetimes are commonly 5 to 60 minutes; refresh tokens days to weeks with rotation. // VERIFY depends on policy',
        'Typical RS256 signature verification takes well under a millisecond on modern CPUs. // VERIFY by benchmarking',
        'RFC 6749 defines OAuth 2.0, RFC 7519 JWT, RFC 7636 PKCE, RFC 9700 the current OAuth security best practices.',
      ],
    },
  },
  sim: 'jwt-verify',
  worked: null,
  code: [
    {
      lang: 'python',
      title: 'PyJWT: issue and verify a short-lived access token',
      code: [
        'import datetime as dt',
        'import jwt   # PyJWT',
        '',
        'SECRET = "load-from-secret-manager"          # HS256 for a simple single service',
        'AUD, ISS = "orders-api", "https://auth.example.com"',
        '',
        'def issue(user_id: int, scopes: list[str]) -> str:',
        '    now = dt.datetime.now(dt.timezone.utc)',
        '    claims = {"sub": str(user_id), "scope": " ".join(scopes),',
        '              "iss": ISS, "aud": AUD, "iat": now,',
        '              "exp": now + dt.timedelta(minutes=15)}',
        '    return jwt.encode(claims, SECRET, algorithm="HS256")',
        '',
        'def verify(token: str) -> dict:',
        '    return jwt.decode(token, SECRET, algorithms=["HS256"],',
        '                      audience=AUD, issuer=ISS,',
        '                      options={"require": ["exp", "sub"]}, leeway=5)',
      ].join('\n'),
      annotations: [
        { line: 4, text: 'Never hard-code secrets; load them from a secret manager. Use RS256 or ES256 when other services only need to verify.' },
        { line: 11, text: 'A short lifetime limits the damage from a stolen token.' },
        { line: 15, text: 'Always pass the allowed algorithms list; never trust the token\'s own alg header.' },
        { line: 16, text: 'Check audience and issuer so tokens meant for other services are rejected.' },
        { line: 17, text: 'Require exp, and allow only a few seconds of clock skew with leeway.' },
      ],
    },
    {
      lang: 'bash',
      title: 'Bash: inspect a JWT (decoding is not verifying)',
      code: [
        'TOKEN="eyJhbGciOi...header.payload.signature"',
        'echo "$TOKEN" | cut -d. -f2 | tr "_-" "/+" | base64 -d 2>/dev/null; echo',
        '# prints the claims. Anyone can read them; only the signature proves integrity',
      ].join('\n'),
      annotations: [
        { line: 2, text: 'Payload is base64url, not encrypted. Do not put secrets in it.' },
        { line: 3, text: 'Reading claims proves nothing: always verify the signature before trusting them.' },
      ],
    },
  ],
  interview: [
    {
      level: 'beginner',
      q: 'What problem does OAuth 2.0 solve?',
      answer: 'It lets a user give an app limited access to their account at another service without sharing their password. The user approves on the real service, which issues a token with limited scope, and the app uses that token.',
      followUps: ['What is a scope?', 'Where have you seen "Sign in with Google"?'],
    },
    {
      level: 'beginner',
      q: 'What is a JWT?',
      answer: 'A JSON Web Token is a compact, signed string with three parts: header, payload (claims such as user id and expiry) and signature. Servers verify the signature to be sure the token was issued by a trusted party and was not modified. The payload is readable, not secret.',
      followUps: ['Can someone read the payload?', 'What happens if the payload is edited?'],
    },
    {
      level: 'intermediate',
      q: 'Why use PKCE in the authorization code flow?',
      answer: 'PKCE binds the code to the client that started the flow: the client sends a hash of a random verifier up front and later proves it holds the verifier. An attacker who intercepts the authorization code cannot exchange it. It is required for public clients (mobile, SPA) and now recommended for all.',
      followUps: ['Why can mobile apps not keep a client secret?', 'What does the state parameter protect against?'],
    },
    {
      level: 'intermediate',
      q: 'JWT access tokens versus server sessions: how do you choose?',
      answer: 'Sessions give instant revocation and small cookies but need a shared store and a lookup per request. JWTs are verified locally and scale statelessly across services, but cannot be revoked before expiry without extra machinery. Use short-lived JWTs with refresh tokens for distributed APIs, and sessions for a single web app that needs easy logout.',
      followUps: ['How can you revoke a JWT early?', 'What do you store on the client for each?'],
    },
    {
      level: 'expert',
      q: 'A security review finds your API accepts any validly signed JWT from your identity provider. What is wrong and how do you fix it?',
      answer: 'Signature validity does not mean the token is meant for your API. Enforce iss and aud (and scopes) so tokens issued for other applications are rejected, require exp, pin algorithms and key ids, and fetch keys only from the issuer\'s JWKS. Add authorization checks beyond the token, and log rejection reasons.',
      followUps: ['What is a confused deputy attack?', 'How do you handle multi-tenant issuers?'],
    },
    {
      level: 'expert',
      q: 'How would you design token revocation and refresh for a mobile app with a JWT-based API?',
      answer: 'Use 5 to 15 minute access tokens and rotating refresh tokens stored in the platform secure store. On every refresh issue a new refresh token and invalidate the old; if an old one is reused, treat it as theft and revoke the whole family. Keep a server-side record of refresh token families for logout and admin revocation, and add a small denylist or token version check for high-risk operations. Consider DPoP to bind tokens to the device.',
      followUps: ['What happens with concurrent refreshes from two tabs?', 'How do you handle clock skew?'],
    },
  ],
  quiz: [
    {
      level: 'beginner',
      q: 'Which part of a JWT proves it was not tampered with?',
      options: ['The header', 'The payload', 'The signature', 'The expiry claim'],
      answerIndex: 2,
      why: 'The signature is computed over header and payload; changing either makes verification fail.',
    },
    {
      level: 'intermediate',
      q: 'A JWT payload contains the user\'s password hash. Why is this a bad idea?',
      options: ['JWTs cannot hold strings', 'The payload is only encoded, so anyone with the token can read it', 'It makes the token too fast', 'It breaks PKCE'],
      answerIndex: 1,
      why: 'Signed is not encrypted: base64url decoding reveals all claims.',
    },
    {
      level: 'intermediate',
      q: 'An API verifies the JWT signature but never checks the aud claim. What is the risk?',
      options: ['Tokens meant for other services are accepted', 'Tokens expire too soon', 'The signature becomes invalid', 'Nothing, aud is optional decoration'],
      answerIndex: 0,
      why: 'Without audience validation, a token issued for another API by the same issuer can be replayed against this one.',
    },
    {
      level: 'expert',
      q: 'What does refresh token rotation with reuse detection achieve?',
      options: ['Faster logins', 'Stolen refresh tokens are detected and the token family revoked when an old one is replayed', 'Smaller JWTs', 'No need for HTTPS'],
      answerIndex: 1,
      why: 'Each refresh invalidates the previous token, so a replay of an old token signals compromise.',
    },
  ],
});
