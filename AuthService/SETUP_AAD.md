# Azure AD (Entra ID) setup for TensAI AuthService

## 1) Create App Registration
- Portal: Azure Active Directory → App registrations → New registration
- Name: TensAI Auth
- Supported account types: Single tenant (recommended for MSIL)
- Redirect URI (web): `http://localhost:4001/auth/callback` (add prod later)

Record:
- Application (client) ID → AAD_CLIENT_ID
- Directory (tenant) ID → AAD_TENANT_ID

## 2) Configure Certificates & Secrets
- Create a Client secret → copy value → AAD_CLIENT_SECRET

## 3) Expose API (optional, if calling Graph/your APIs)
- Set Application ID URI if needed (e.g., `api://<client-id>`)
- Define scopes if you want resource-based permissions

## 4) Authentication
- Add redirect URIs:
  - Dev: `http://localhost:4001/auth/callback`
  - Prod: `https://dev2.tens-ai.com/auth/callback`
- Enable Authorization code flow
- Allow public client flows if using native clients

## 5) Permissions
- If you need Microsoft Graph/other APIs, add delegated permissions and grant admin consent

## 6) Environment variables
See `ENVIRONMENT.md` for all required variables.

## 7) Production
- Add your production domain callback to AAD
- Behind reverse-proxy (HTTPS), set cookie flags accordingly
