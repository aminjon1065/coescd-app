export interface FilesRuntimeConfig {
  uploadMaxBytes: number;
  allowedMimeTypes: string[];
  presignedEnabled: boolean;
  presignedUploadTtlSeconds: number;
  presignedDownloadTtlSeconds: number;
}

const DEFAULT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
];
const DEFAULT_PRESIGNED_UPLOAD_TTL_SECONDS = 600;
const DEFAULT_PRESIGNED_DOWNLOAD_TTL_SECONDS = 300;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseCsv(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }
  const parsed = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
  return parsed.length > 0 ? parsed : fallback;
}

export function getFilesRuntimeConfig(): FilesRuntimeConfig {
  return {
    uploadMaxBytes: parsePositiveInt(
      process.env.FILES_UPLOAD_MAX_BYTES,
      DEFAULT_UPLOAD_MAX_BYTES,
    ),
    allowedMimeTypes: parseCsv(
      process.env.FILES_ALLOWED_MIME_TYPES,
      DEFAULT_ALLOWED_MIME_TYPES,
    ),
    presignedEnabled: (process.env.FILES_PRESIGNED_ENABLED ?? 'false') === 'true',
    presignedUploadTtlSeconds: parsePositiveInt(
      process.env.FILES_PRESIGNED_UPLOAD_TTL_SECONDS,
      DEFAULT_PRESIGNED_UPLOAD_TTL_SECONDS,
    ),
    presignedDownloadTtlSeconds: parsePositiveInt(
      process.env.FILES_PRESIGNED_DOWNLOAD_TTL_SECONDS,
      DEFAULT_PRESIGNED_DOWNLOAD_TTL_SECONDS,
    ),
  };
}
