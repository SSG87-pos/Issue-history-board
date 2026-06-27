import { existsSync, readFileSync } from 'node:fs';

const envPath = process.argv.slice(2).find((argument) => !argument.startsWith('--')) ?? '.env';
const allowPlaceholders = process.argv.includes('--allow-placeholders');
const checks = [];

function pass(message) {
  checks.push({ ok: true, message });
}

function fail(message) {
  checks.push({ ok: false, message });
}

function parseEnv(text) {
  const values = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
    values.set(key, value);
  }
  return values;
}

function requireValue(values, key) {
  const value = values.get(key);
  if (value) {
    pass(`${key} is set`);
    return value;
  }
  fail(`${key} must be set`);
  return '';
}

function requireChangedSecret(key, value, minimumLength) {
  if (!value) return;

  const lower = value.toLowerCase();
  const looksLikePlaceholder =
    lower.includes('change-this') ||
    lower.includes('deployment-check') ||
    lower === 'password' ||
    lower === 'admin-password' ||
    lower === 'issueboard';

  if (allowPlaceholders && looksLikePlaceholder) {
    pass(`${key} placeholder is allowed for example validation`);
  } else if (!allowPlaceholders && looksLikePlaceholder) {
    fail(`${key} must be changed from the example value`);
  } else {
    pass(`${key} is not an obvious placeholder`);
  }

  if (value.length >= minimumLength) {
    pass(`${key} length is acceptable`);
  } else {
    fail(`${key} should be at least ${minimumLength} characters`);
  }
}

function validateInteger(key, value, minimum, maximum) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum) {
    pass(`${key} is a valid port/number`);
  } else {
    fail(`${key} must be an integer between ${minimum} and ${maximum}`);
  }
}

function validateCorsOrigins(value) {
  if (!value) return;

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    fail('CORS_ORIGINS must include at least one origin');
    return;
  }

  const invalidOrigins = origins.filter((origin) => {
    try {
      const parsed = new URL(origin);
      return parsed.protocol !== 'http:' && parsed.protocol !== 'https:';
    } catch {
      return true;
    }
  });

  if (invalidOrigins.length === 0) {
    pass('CORS_ORIGINS contains valid http/https origins');
  } else {
    fail(`CORS_ORIGINS has invalid origin(s): ${invalidOrigins.join(', ')}`);
  }
}

if (!existsSync(envPath)) {
  fail(`${envPath} is missing; copy .env.example to .env first`);
} else {
  pass(`${envPath} exists`);
  const values = parseEnv(readFileSync(envPath, 'utf8'));

  const postgresPassword = requireValue(values, 'POSTGRES_PASSWORD');
  const secretKey = requireValue(values, 'SECRET_KEY');
  const adminUsername = requireValue(values, 'ADMIN_USERNAME');
  const adminPassword = requireValue(values, 'ADMIN_PASSWORD');
  const webPort = requireValue(values, 'WEB_PORT');
  const corsOrigins = requireValue(values, 'CORS_ORIGINS');

  if (adminUsername.trim().length >= 3) {
    pass('ADMIN_USERNAME length is acceptable');
  } else {
    fail('ADMIN_USERNAME should be at least 3 characters');
  }

  requireChangedSecret('POSTGRES_PASSWORD', postgresPassword, 12);
  requireChangedSecret('SECRET_KEY', secretKey, 32);
  requireChangedSecret('ADMIN_PASSWORD', adminPassword, 12);
  validateInteger('WEB_PORT', webPort, 1, 65535);
  validateCorsOrigins(corsOrigins);
}

for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.message}`);
}

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  console.error(`Company environment check failed: ${failed.length} issue(s)`);
  process.exit(1);
}

console.log(`Company environment check passed: ${checks.length} checks`);
