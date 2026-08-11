/**
 * @file src/storage/adapters/SupabaseStorageAdapter.ts
 * @description Supabase Storage Adapter implementing Phase 13 IStorageAdapter.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IStorageAdapter, StorageBucket, StorageFileMetadata, StorageFileVersion } from '../IStorageAdapter';
import { logger } from '@sentinel/shared';

export class SupabaseStorageAdapter implements IStorageAdapter {
  public readonly adapterName = 'SupabaseStorage';
  private supabase: SupabaseClient | null = null;
  private metadataCache = new Map<string, StorageFileMetadata>();

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      try {
        this.supabase = createClient(url, key);
        logger.info('STORAGE', 'Initialized Supabase Storage Client');
      } catch (err) {
        this.supabase = null;
      }
    }
  }

  public async isAvailable(): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const { data, error } = await this.supabase.storage.listBuckets();
      return !error && Array.isArray(data);
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
    if (!this.supabase) throw new Error('Supabase client unavailable');

    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    const filename = path.split('/').pop() || path;

    const { data, error } = await this.supabase.storage.from(bucket).upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) {
      throw new Error(`Supabase upload failed for ${bucket}/${path}: ${error.message}`);
    }

    const signedUrlRes = await this.supabase.storage.from(bucket).createSignedUrl(path, 3600);
    const publicUrlData = this.supabase.storage.from(bucket).getPublicUrl(path);

    const now = new Date().toISOString();
    const versionId = `vSupabase.${data.path}.${Date.now()}`;

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

    const fileMeta: StorageFileMetadata = {
      id: data.id || `sup_${Date.now()}`,
      bucket,
      path: data.path || path,
      filename,
      version: versionId,
      mimeType,
      size: buffer.length,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      isDeleted: false,
      signedUrl: signedUrlRes.data?.signedUrl,
      publicUrl: publicUrlData.data?.publicUrl,
      versions: [newVersion, ...previousVersions],
      customMetadata: metadata,
    };

    this.metadataCache.set(key, fileMeta);
    logger.success('STORAGE', `[Supabase] Uploaded ${filename} to ${bucket}`);
    return fileMeta;
  }

  public async downloadFile(bucket: StorageBucket, path: string): Promise<Buffer> {
    if (!this.supabase) throw new Error('Supabase client unavailable');

    const { data, error } = await this.supabase.storage.from(bucket).download(path);
    if (error || !data) {
      throw new Error(`Supabase download error for ${bucket}/${path}: ${error?.message || 'File missing'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  public async getSignedUrl(bucket: StorageBucket, path: string, expiresInSeconds = 3600): Promise<string> {
    if (!this.supabase) throw new Error('Supabase client unavailable');

    const { data, error } = await this.supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error || !data) {
      throw new Error(`Supabase signed URL error for ${bucket}/${path}: ${error?.message}`);
    }
    return data.signedUrl;
  }

  public async getPublicUrl(bucket: StorageBucket, path: string): Promise<string> {
    if (!this.supabase) throw new Error('Supabase client unavailable');
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  public async deleteFile(bucket: StorageBucket, path: string, softDelete = true): Promise<boolean> {
    if (!this.supabase) throw new Error('Supabase client unavailable');

    const key = this.getKey(bucket, path);
    const cached = this.metadataCache.get(key);

    if (softDelete && cached) {
      cached.isDeleted = true;
      cached.updatedAt = new Date().toISOString();
      return true;
    }

    const { error } = await this.supabase.storage.from(bucket).remove([path]);
    if (error) {
      logger.warn('STORAGE', `Supabase delete error: ${error.message}`);
      return false;
    }

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
      const match = cached.versions.find((v) => v.versionId === versionId);
      if (match) {
        cached.version = match.versionId;
        cached.versions.forEach((v) => (v.isCurrent = v.versionId === versionId));
      }
    }

    return cached;
  }

  public async listFiles(bucket: StorageBucket, prefix = ''): Promise<StorageFileMetadata[]> {
    if (!this.supabase) throw new Error('Supabase client unavailable');

    const { data, error } = await this.supabase.storage.from(bucket).list(prefix);
    if (error || !data) return [];

    return data.map((item) => {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      const key = this.getKey(bucket, path);
      const cached = this.metadataCache.get(key);

      return (
        cached || {
          id: item.id || `sup_${item.name}`,
          bucket,
          path,
          filename: item.name,
          version: item.id || 'v1',
          mimeType: item.metadata?.mimetype || 'application/octet-stream',
          size: item.metadata?.size || 0,
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.updated_at || new Date().toISOString(),
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
