import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class FilesStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? 'coescd-files';
    this.client = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint: process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000',
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
      },
    });
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
