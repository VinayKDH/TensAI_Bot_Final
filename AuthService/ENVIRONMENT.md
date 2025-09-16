# Environment variables for AuthService

Required:
- PORT (default 4001)
- PUBLIC_BASE_URL (e.g., http://localhost:4001)
- AAD_TENANT_ID
- AAD_CLIENT_ID
- AAD_CLIENT_SECRET
- AAD_AUTHORITY (e.g., https://login.microsoftonline.com/${AAD_TENANT_ID}/v2.0)
- AAD_REDIRECT_URI (e.g., http://localhost:4001/auth/callback)
- JWT_ISSUER (e.g., https://tens-ai.com/auth)
- JWT_AUDIENCE (e.g., tensai-clients)
- JWT_ACCESS_TTL_SECONDS (e.g., 900)
- JWT_REFRESH_TTL_SECONDS (e.g., 2592000)
- JWT_PRIVATE_KEY_PEM (PEM)
- JWT_PUBLIC_KEY_PEM (PEM)
- COOKIE_DOMAIN (localhost in dev)
- COOKIE_SECURE (true in prod)
- COOKIE_SAME_SITE (None)
- CORS_ALLOWED_ORIGINS (comma-separated; include extension/add-in origins)

Notes:
- Use Azure Key Vault for production secrets.
- Set HTTPS and secure cookies in prod.
