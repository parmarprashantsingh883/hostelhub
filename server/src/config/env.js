/**
 * Environment validation & derived config.
 * Fails fast in production on insecure/missing settings; only warns in dev.
 */
const isProd = process.env.NODE_ENV === 'production';
const INSECURE = ['', 'change-me-access-secret', 'change-me-refresh-secret', 'secret', 'changeme'];

export function validateEnv() {
  const fatal = [];
  const warn = [];

  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const v = process.env[key];
    if (!v || INSECURE.includes(v)) {
      (isProd ? fatal : warn).push(`${key} is missing or using an insecure default`);
    }
  }

  if (isProd) {
    if (process.env.USE_MEMORY_DB === 'true') {
      fatal.push('USE_MEMORY_DB=true in production — data resets on every restart');
    }
    if (!process.env.MONGO_URI) fatal.push('MONGO_URI is required in production');
    if (!process.env.CLIENT_URL) fatal.push('CLIENT_URL is required in production (CORS origin + password-reset links)');
  }

  warn.forEach((m) => console.warn('⚠️  env:', m));
  if (fatal.length) {
    console.error('❌ Invalid environment configuration:');
    fatal.forEach((m) => console.error('   •', m));
    throw new Error('Environment validation failed — see messages above.');
  }
}

/** Allowed CORS origins (comma-separated CLIENT_URL → array). */
export function corsOrigins() {
  return (process.env.CLIENT_URL || 'http://localhost:8080,http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const isProduction = isProd;
export const isTest = process.env.NODE_ENV === 'test';
