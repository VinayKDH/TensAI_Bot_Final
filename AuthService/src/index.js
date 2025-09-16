import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createRemoteJWKSet, jwtVerify, SignJWT, generateKeyPair, exportJWK } from 'jose';

// Load env
dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => o === '*' || origin.startsWith(o))) return cb(null, true);
    return cb(null, false);
  },
  credentials: true
}));

// Config
const PORT = process.env.PORT || 4001;
const ISSUER = process.env.JWT_ISSUER || 'https://tens-ai.local/auth';
const AUDIENCE = process.env.JWT_AUDIENCE || 'tensai-clients';
const ACCESS_TTL_SECONDS = parseInt(process.env.JWT_ACCESS_TTL_SECONDS || '900', 10);
const REFRESH_TTL_SECONDS = parseInt(process.env.JWT_REFRESH_TTL_SECONDS || '2592000', 10);
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || 'localhost';
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || 'false') === 'true';
const COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || 'None';

// Key material (dev: ephemeral if not provided)
let privateKey; let publicJwk;
async function initKeys() {
  const pem = process.env.JWT_PRIVATE_KEY_PEM;
  if (pem) {
    privateKey = await crypto.subtle.importKey(
      'pkcs8',
      Buffer.from(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, ''), 'base64'),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      true,
      ['sign']
    );
    const pubPem = process.env.JWT_PUBLIC_KEY_PEM;
    if (pubPem) {
      const publicKey = await crypto.subtle.importKey(
        'spki',
        Buffer.from(pubPem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, ''), 'base64'),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        true,
        ['verify']
      );
      publicJwk = await exportJWK(publicKey);
      publicJwk.kid = 'primary';
      publicJwk.alg = 'RS256';
      publicJwk.use = 'sig';
    }
  } else {
    const { privateKey: pk, publicKey } = await generateKeyPair('RS256');
    privateKey = pk;
    publicJwk = await exportJWK(publicKey);
    publicJwk.kid = 'ephemeral';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';
    console.warn('[AuthService] Using ephemeral signing key. Configure JWT_PRIVATE_KEY_PEM for persistence.');
  }
}

function setRefreshCookie(res, token) {
  res.cookie('tensai_refresh', token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    domain: COOKIE_DOMAIN,
    path: '/',
    maxAge: REFRESH_TTL_SECONDS * 1000
  });
}

async function mintJwt(subject, scopes = [], ttlSeconds = ACCESS_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ scopes })
    .setProtectedHeader({ alg: 'RS256', kid: publicJwk.kid })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(subject)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(privateKey);
}

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// JWKS
app.get('/.well-known/jwks.json', (req, res) => {
  res.json({ keys: [publicJwk] });
});

// Begin OAuth (PKCE placeholder)
app.get('/auth/login', async (req, res) => {
  const redirect = process.env.AAD_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/callback`;
  const placeholder = {
    message: 'Auth start (placeholder). Configure Azure AD to enable full PKCE.',
    redirect,
    provider: process.env.AAD_AUTHORITY || 'https://login.microsoftonline.com/.../v2.0/authorize'
  };
  res.json(placeholder);
});

// OAuth callback (placeholder exchange)
app.get('/auth/callback', async (req, res) => {
  const subject = 'user@example.com';
  const scopes = ['webgpt:query', 'translate:text'];
  const access = await mintJwt(subject, scopes, ACCESS_TTL_SECONDS);
  const refresh = await mintJwt(subject, ['refresh'], REFRESH_TTL_SECONDS);
  setRefreshCookie(res, refresh);
  res.json({ access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL_SECONDS });
});

// Refresh
app.post('/auth/refresh', async (req, res) => {
  try {
    const token = req.cookies['tensai_refresh'];
    if (!token) return res.status(401).json({ error: 'no_refresh' });
    const { payload } = await jwtVerify(token, createRemoteJWKSet(new URL(`${req.protocol}://${req.get('host')}/.well-known/jwks.json`)), {
      issuer: ISSUER,
      audience: AUDIENCE
    }).catch(() => ({ payload: null }));
    if (!payload) return res.status(401).json({ error: 'invalid_refresh' });
    const subject = payload.sub;
    const newAccess = await mintJwt(subject, ['webgpt:query', 'translate:text'], ACCESS_TTL_SECONDS);
    return res.json({ access_token: newAccess, token_type: 'Bearer', expires_in: ACCESS_TTL_SECONDS });
  } catch (e) {
    return res.status(500).json({ error: 'refresh_failed' });
  }
});

// Logout
app.post('/auth/logout', (req, res) => {
  res.clearCookie('tensai_refresh', { domain: COOKIE_DOMAIN, path: '/' });
  res.status(204).end();
});

// Me
app.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'no_token' });
    const { payload } = await jwtVerify(token, createRemoteJWKSet(new URL(`${req.protocol}://${req.get('host')}/.well-known/jwks.json`)), {
      issuer: ISSUER,
      audience: AUDIENCE
    });
    res.json({ sub: payload.sub, scopes: payload.scopes || [] });
  } catch (e) {
    res.status(401).json({ error: 'invalid_token' });
  }
});

// Teams: mint backend JWT for a given Teams user (dev-only placeholder)
app.post('/teams/mint', async (req, res) => {
  try {
    const { teamsUserId } = req.body || {};
    if (!teamsUserId) return res.status(400).json({ error: 'teamsUserId_required' });
    // In production, verify Teams token signature and extract oid/upn
    const access = await mintJwt(teamsUserId, ['webgpt:query', 'translate:text', 'omni:query'], ACCESS_TTL_SECONDS);
    return res.json({ access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL_SECONDS });
  } catch (e) {
    return res.status(500).json({ error: 'mint_failed' });
  }
});

// Start
(async () => {
  await initKeys();
  app.listen(PORT, () => {
    console.log(`[AuthService] listening on ${PORT}`);
  });
})();
