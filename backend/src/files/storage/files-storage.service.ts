import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent as HttpsAgent } from 'https';
import { Readable } from 'stream';

@Injectable()
export class FilesStorageService implements OnModuleInit {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private readonly logger = new Logger(FilesStorageService.name);

  constructor() {
    const storageBackend = process.env.STORAGE_BACKEND ?? 's3';
    const endpoint =
      storageBackend === 'minio'
        ? process.env.MINIO_ENDPOINT ??
          process.env.S3_ENDPOINT ??
          'http://127.0.0.1:9000'
        : process.env.S3_ENDPOINT;
    const rejectUnauthorized =
      (process.env.S3_TLS_REJECT_UNAUTHORIZED ?? 'true') !== 'false';
    const accessKeyId =
      process.env.AWS_ACCESS_KEY_ID ??
      process.env.S3_ACCESS_KEY ??
      'minioadmin';
    const secretAccessKey =
      process.env.AWS_SECRET_ACCESS_KEY ??
      process.env.S3_SECRET_KEY ??
      'minioadmin';

    this.bucket = process.env.S3_BUCKET ?? 'coescd-files';
    this.endpoint = endpoint;
    this.client = new S3Client({
      region: process.env.AWS_REGION ?? process.env.S3_REGION ?? 'us-east-1',
      endpoint,
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Allow self-signed TLS certs (e.g. Herd local dev) when explicitly opted-in
      ...(!rejectUnauthorized && {
        requestHandler: new NodeHttpHandler({
          httpsAgent: new HttpsAgent({ rejectUnauthorized: false }),
        }),
      }),
    });
  }

  /** Auto-create the S3 bucket on startup if it doesn't exist yet. */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`S3 bucket "${this.bucket}" is ready`);
    } catch (err: unknown) {
      const status = (err as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;
      if (status === 404 || status === 403) {
        // 404 = bucket missing, 403 may also indicate no bucket in MinIO
        this.logger.warn(
          `S3 bucket "${this.bucket}" not found — creating it now`,
        );
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`S3 bucket "${this.bucket}" created successfully`);
      } else {
        this.logger.error(
          `S3 connectivity check failed (endpoint: ${this.endpoint ?? 'default'}):`,
          err,
        );
      }
    }
  }

  getBucket(): string {
    return this.bucket;
  }

  async uploadObject(params: {
    key: string;
    body: Buffer;
    mimeType: string;
  }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.mimeType,
      }),
    );
  }

  async getPresignedUploadUrl(params: {
    key: string;
    mimeType: string;
    expiresInSeconds: number;
  }): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        ContentType: params.mimeType,
      }),
      { expiresIn: params.expiresInSeconds },
    );
  }

  async getPresignedDownloadUrl(params: {
    key: string;
    originalName: string;
    mimeType: string;
    expiresInSeconds: number;
  }): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        ResponseContentType: params.mimeType,
        ResponseContentDisposition: `attachment; filename="${params.originalName}"`,
      }),
      { expiresIn: params.expiresInSeconds },
    );
  }

  async getObjectMetadata(
    key: string,
  ): Promise<{ contentLength: number | null; contentType: string | null }> {
    const result = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    return {
      contentLength:
        typeof result.ContentLength === 'number' ? result.ContentLength : null,
      contentType: result.ContentType ?? null,
    };
  }

  async getObjectStream(key: string): Promise<Readable> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    const body = result.Body;
    if (!body || !(body instanceof Readable)) {
      throw new Error('File stream is unavailable');
    }
    return body;
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
