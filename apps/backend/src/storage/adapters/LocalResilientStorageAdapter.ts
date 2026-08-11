/**
 * @file src/storage/adapters/LocalResilientStorageAdapter.ts
 * @description Local in-memory and filesystem fallback storage adapter for Phase 13.
 */

import { IStorageAdapter, StorageBucket, StorageFileMetadata, StorageFileVersion } from '../IStorageAdapter';
import { logger } from '@sentinel/shared';

interface StoredItem {
  metadata: StorageFileMetadata;
  content: Buffer;
}

export class LocalResilientStorageAdapter implements IStorageAdapter {
  public readonly adapterName = 'LocalResilientStorage';
  private storageMap = new Map<string, StoredItem>();

  public async isAvailable(): Promise<boolean> {
    return true;
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
    const key = this.getKey(bucket, path);
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    const filename = path.split('/').pop() || path;
    const now = new Date().toISOString();

    const existing = this.storageMap.get(key);
    const versionNumber = existing ? existing.metadata.versions.length + 1 : 1;
    const versionId = `v${versionNumber}.${Date.now()}`;

    const newVersion: StorageFileVersion = {
      versionId,
      createdAt: now,
      size: buffer.length,
      mimeType,
      isCurrent: true,
    };

    const previousVersions = existing
      ? existing.metadata.versions.map((v) => ({ ...v, isCurrent: false }))
      : [];

    const updatedMetadata: StorageFileMetadata = {
      id: existing ? existing.metadata.id : `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      bucket,
      path,
      filename,
      version: versionId,
      mimeType,
      size: buffer.length,
      createdAt: existing ? existing.metadata.createdAt : now,
      updatedAt: now,
      isDeleted: false,
      signedUrl: `https://local-storage.internal/${bucket}/${path}?token=${versionId}&expires=3600`,
      publicUrl: `https://local-storage.internal/${bucket}/${path}`,
      versions: [newVersion, ...previousVersions],
      customMetadata: metadata,
    };

    this.storageMap.set(key, { metadata: updatedMetadata, content: buffer });
    logger.info('STORAGE', `[LocalResilient] Uploaded ${filename} to ${bucket} (version ${versionId})`);

    return updatedMetadata;
  }

  public async downloadFile(bucket: StorageBucket, path: string): Promise<Buffer> {
    const key = this.getKey(bucket, path);
    const item = this.storageMap.get(key);
    if (!item || item.metadata.isDeleted) {
      throw new Error(`File not found or soft-deleted: ${bucket}/${path}`);
    }
    return item.content;
  }

  public async getSignedUrl(bucket: StorageBucket, path: string, expiresInSeconds = 3600): Promise<string> {
    const key = this.getKey(bucket, path);
    const item = this.storageMap.get(key);
    if (!item || item.metadata.isDeleted) {
      throw new Error(`File not found or soft-deleted: ${bucket}/${path}`);
    }
    const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return `https://storage.local.internal/${bucket}/${encodeURIComponent(path)}?signature=sig_${item.metadata.version}&expires=${expiry}`;
  }

  public async getPublicUrl(bucket: StorageBucket, path: string): Promise<string> {
    return `https://storage.local.internal/public/${bucket}/${encodeURIComponent(path)}`;
  }

  public async deleteFile(bucket: StorageBucket, path: string, softDelete = true): Promise<boolean> {
    const key = this.getKey(bucket, path);
    const item = this.storageMap.get(key);
    if (!item) return false;

    if (softDelete) {
      item.metadata.isDeleted = true;
      item.metadata.updatedAt = new Date().toISOString();
      logger.info('STORAGE', `[LocalResilient] Soft-deleted ${bucket}/${path}`);
    } else {
      this.storageMap.delete(key);
      logger.info('STORAGE', `[LocalResilient] Permanently deleted ${bucket}/${path}`);
    }
    return true;
  }

  public async restoreFile(bucket: StorageBucket, path: string, versionId?: string): Promise<StorageFileMetadata | null> {
    const key = this.getKey(bucket, path);
    const item = this.storageMap.get(key);
    if (!item) return null;

    item.metadata.isDeleted = false;
    item.metadata.updatedAt = new Date().toISOString();

    if (versionId) {
      const targetVersion = item.metadata.versions.find((v) => v.versionId === versionId);
      if (targetVersion) {
        item.metadata.version = targetVersion.versionId;
        item.metadata.size = targetVersion.size;
        item.metadata.mimeType = targetVersion.mimeType;
        item.metadata.versions.forEach((v) => {
          v.isCurrent = v.versionId === versionId;
        });
      }
    }

    logger.success('STORAGE', `[LocalResilient] Restored ${bucket}/${path} (version: ${item.metadata.version})`);
    return item.metadata;
  }

  public async listFiles(bucket: StorageBucket, prefix = ''): Promise<StorageFileMetadata[]> {
    const result: StorageFileMetadata[] = [];
    for (const [key, item] of this.storageMap.entries()) {
      if (key.startsWith(`${bucket}::`)) {
        if (!prefix || item.metadata.path.startsWith(prefix)) {
          if (!item.metadata.isDeleted) {
            result.push(item.metadata);
          }
        }
      }
    }
    return result;
  }

  public async getFileVersions(bucket: StorageBucket, path: string): Promise<StorageFileVersion[]> {
    const key = this.getKey(bucket, path);
    const item = this.storageMap.get(key);
    return item ? item.metadata.versions : [];
  }
}
