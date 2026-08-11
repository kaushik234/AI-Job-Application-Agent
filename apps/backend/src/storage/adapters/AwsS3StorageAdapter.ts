/**
 * @file src/storage/adapters/AwsS3StorageAdapter.ts
 * @description AWS S3 Storage Adapter implementing Phase 13 IStorageAdapter fallback.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageAdapter, StorageBucket, StorageFileMetadata, StorageFileVersion } from '../IStorageAdapter';
import { logger } from '@sentinel/shared';

export class AwsS3StorageAdapter implements IStorageAdapter {
  public readonly adapterName = 'AwsS3Storage';
  private s3Client: S3Client | null = null;
  private bucketNameMap: Record<StorageBucket, string>;
  private metadataCache = new Map<string, StorageFileMetadata>();

  constructor() {
    const region = process.env.AWS_REGION || 'ap-southeast-2';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    const baseBucket = process.env.AWS_S3_BUCKET || 'ai-job-agent-storage';

    this.bucketNameMap = {
      'resume-uploads': `${baseBucket}-resumes`,
      'generated-resumes': `${baseBucket}-gen-resumes`,
      'generated-cover-letters': `${baseBucket}-gen-letters`,
      'logs': `${baseBucket}-logs`,
      'screenshots': `${baseBucket}-screenshots`,
    };

    if (accessKeyId && secretAccessKey) {
      try {
        this.s3Client = new S3Client({
          region,
          credentials: { accessKeyId, secretAccessKey },
        });
        logger.info('STORAGE', 'Initialized AWS S3 Client');
      } catch {
        this.s3Client = null;
      }
    }
  }

  public async isAvailable(): Promise<boolean> {
    if (!this.s3Client) return false;
    try {
      const bucket = this.bucketNameMap['logs'];
      const command = new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 });
      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  private getKey(bucket: StorageBucket, path: string): string {
    return `${bucket}::${path}`;
  }

  public async uploadFile(
    bucket: StorageBucket,
    path: string,
    content: Buffer | string,
    mimeType: string,
    metadata: Record<string, any> = {}
  ): Promise<StorageFileMetadata> {
    if (!this.s3Client) throw new Error('AWS S3 client unavailable');

    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    const filename = path.split('/').pop() || path;
    const targetS3Bucket = this.bucketNameMap[bucket];

    const command = new PutObjectCommand({
      Bucket: targetS3Bucket,
      Key: path,
      Body: buffer,
      ContentType: mimeType,
      Metadata: {
        filename,
        ...metadata,
      },
    });

    const output = await this.s3Client.send(command);
    const now = new Date().toISOString();
    const versionId = output.VersionId || `vS3.${Date.now()}`;

    const newVersion: StorageFileVersion = {
      versionId,
      createdAt: now,
      size: buffer.length,
      mimeType,
      isCurrent: true,
    };

    const key = this.getKey(bucket, path);
    const existing = this.metadataCache.get(key);
    const previousVersions = existing ? existing.versions.map((v) => ({ ...v, isCurrent: false })) : [];

    const getCommand = new GetObjectCommand({ Bucket: targetS3Bucket, Key: path });
    const signedUrl = await getS3SignedUrl(this.s3Client, getCommand, { expiresIn: 3600 });

    const fileMeta: StorageFileMetadata = {
      id: output.ETag || `s3_${Date.now()}`,
      bucket,
      path,
      filename,
      version: versionId,
      mimeType,
      size: buffer.length,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      isDeleted: false,
      signedUrl,
      publicUrl: `https://${targetS3Bucket}.s3.amazonaws.com/${path}`,
      versions: [newVersion, ...previousVersions],
      customMetadata: metadata,
    };

    this.metadataCache.set(key, fileMeta);
    logger.success('STORAGE', `[AWS S3 Adapter] Uploaded ${filename} to ${targetS3Bucket}`);
    return fileMeta;
  }

  public async downloadFile(bucket: StorageBucket, path: string): Promise<Buffer> {
    if (!this.s3Client) throw new Error('AWS S3 client unavailable');
    const targetS3Bucket = this.bucketNameMap[bucket];

    const command = new GetObjectCommand({ Bucket: targetS3Bucket, Key: path });
    const response = await this.s3Client.send(command);

    if (!response.Body) throw new Error(`AWS S3 empty body for ${path}`);

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  public async getSignedUrl(bucket: StorageBucket, path: string, expiresInSeconds = 3600): Promise<string> {
    if (!this.s3Client) throw new Error('AWS S3 client unavailable');
    const targetS3Bucket = this.bucketNameMap[bucket];

    const command = new GetObjectCommand({ Bucket: targetS3Bucket, Key: path });
    return getS3SignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  public async getPublicUrl(bucket: StorageBucket, path: string): Promise<string> {
    const targetS3Bucket = this.bucketNameMap[bucket];
    return `https://${targetS3Bucket}.s3.amazonaws.com/${path}`;
  }

  public async deleteFile(bucket: StorageBucket, path: string, softDelete = true): Promise<boolean> {
    if (!this.s3Client) throw new Error('AWS S3 client unavailable');
    const key = this.getKey(bucket, path);
    const cached = this.metadataCache.get(key);

    if (softDelete && cached) {
      cached.isDeleted = true;
      cached.updatedAt = new Date().toISOString();
      return true;
    }

    const targetS3Bucket = this.bucketNameMap[bucket];
    const command = new DeleteObjectCommand({ Bucket: targetS3Bucket, Key: path });
    await this.s3Client.send(command);

    this.metadataCache.delete(key);
    return true;
  }

  public async restoreFile(bucket: StorageBucket, path: string, versionId?: string): Promise<StorageFileMetadata | null> {
    const key = this.getKey(bucket, path);
    const cached = this.metadataCache.get(key);
    if (!cached) return null;

    cached.isDeleted = false;
    cached.updatedAt = new Date().toISOString();

    if (versionId) {
      const targetVersion = cached.versions.find((v) => v.versionId === versionId);
      if (targetVersion) {
        cached.version = targetVersion.versionId;
        cached.versions.forEach((v) => (v.isCurrent = v.versionId === versionId));
      }
    }

    return cached;
  }

  public async listFiles(bucket: StorageBucket, prefix = ''): Promise<StorageFileMetadata[]> {
    if (!this.s3Client) throw new Error('AWS S3 client unavailable');
    const targetS3Bucket = this.bucketNameMap[bucket];

    const command = new ListObjectsV2Command({ Bucket: targetS3Bucket, Prefix: prefix });
    const response = await this.s3Client.send(command);

    const contents = response.Contents || [];
    return contents.map((item) => {
      const itemPath = item.Key || '';
      const key = this.getKey(bucket, itemPath);
      const cached = this.metadataCache.get(key);

      return (
        cached || {
          id: item.ETag || `s3_${itemPath}`,
          bucket,
          path: itemPath,
          filename: itemPath.split('/').pop() || itemPath,
          version: item.ETag || 'v1',
          mimeType: 'application/octet-stream',
          size: item.Size || 0,
          createdAt: item.LastModified?.toISOString() || new Date().toISOString(),
          updatedAt: item.LastModified?.toISOString() || new Date().toISOString(),
          isDeleted: false,
          versions: [],
        }
      );
    });
  }

  public async getFileVersions(bucket: StorageBucket, path: string): Promise<StorageFileVersion[]> {
    const key = this.getKey(bucket, path);
    const cached = this.metadataCache.get(key);
    return cached ? cached.versions : [];
  }
}
