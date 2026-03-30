import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ── Database ────────────────────────────────────────────────────────────────
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().integer().positive().default(5432),
  DB_USERNAME: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('postgres'),
  DB_NAME: Joi.string().default('coescd'),
  DB_MIGRATIONS_RUN: Joi.string().valid('true', 'false').default('false'),

  // ── JWT / Auth ──────────────────────────────────────────────────────────────
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_TOKEN_AUDIENCE: Joi.string().default('coescd-client'),
  JWT_TOKEN_ISSUER: Joi.string().default('coescd-api'),
  JWT_TOKEN_ACCESS_TOKEN_TTL: Joi.number().integer().positive().default(3600),
  JWT_REFRESH_TOKEN_TTL: Joi.number().integer().positive().default(86400),

  // ── Cookies ─────────────────────────────────────────────────────────────────
  COOKIE_SECURE: Joi.string().valid('true', 'false').default('false'),
  COOKIE_SAMESITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  COOKIE_DOMAIN: Joi.string().optional(),

  // ── CORS ────────────────────────────────────────────────────────────────────
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  // ── File Storage ────────────────────────────────────────────────────────────
  STORAGE_BACKEND: Joi.string().valid('s3', 'minio').default('s3'),
  S3_BUCKET: Joi.when('STORAGE_BACKEND', {
    is: 's3',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  AWS_REGION: Joi.string().optional(),
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  MINIO_ENDPOINT: Joi.when('STORAGE_BACKEND', {
    is: 'minio',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().optional(),
  }),

  // ── Redis (optional) ────────────────────────────────────────────────────────
  REDIS_DISABLED: Joi.string().valid('true', 'false').default('false'),
  REDIS_HOST: Joi.when('REDIS_DISABLED', {
    is: 'false',
    then: Joi.string().default('localhost'),
    otherwise: Joi.string().optional(),
  }),
  REDIS_PORT: Joi.number().integer().positive().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // ── TURN / WebRTC ───────────────────────────────────────────────────────────
  TURN_SECRET: Joi.string().optional().allow(''),
  TURN_HOST: Joi.string().optional().allow(''),

  // ── Server ──────────────────────────────────────────────────────────────────
  PORT: Joi.number().integer().positive().default(8008),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
})
  .unknown(true) // allow any extra env vars
  .options({ abortEarly: false }); // report all missing vars at once
