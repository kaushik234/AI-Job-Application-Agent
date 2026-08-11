/**
 * @file src/storage/StorageService.ts
 * @description Phase 13 Storage Service providing Supabase Storage integration with AWS S3 Adapter fallback.
 * @architect Adapter Pattern for Resilient Cloud & Multi-Bucket Storage.
 */

import { IStorageAdapter, StorageBucket, StorageFileMetadata, StorageFileVersion } from './IStorageAdapter';
import { SupabaseStorageAdapter } from './adapters/SupabaseStorageAdapter';
import { AwsS3StorageAdapter } from './adapters/AwsS3StorageAdapter';
import { LocalResilientStorageAdapter } from './adapters/LocalResilientStorageAdapter';
import { logger } from '@sentinel/shared';

export class StorageService {
  private primaryAdapter: IStorageAdapter;
  private secondaryAdapter: IStorageAdapter;
  private fallbackAdapter: IStorageAdapter;
  private activeAdapter: IStorageAdapter;

  constructor(
    primary: IStorageAdapter = new SupabaseStorageAdapter(),
    secondary: IStorageAdapter = new AwsS3StorageAdapter(),
    fallback: IStorageAdapter = new LocalResilientStorageAdapter()
  ) {
    this.primaryAdapter = primary;
    this.secondaryAdapter = secondary;
    this.fallbackAdapter = fallback;
    this.activeAdapter = fallback;
  }

  /**
   * Resolves active operational adapter (Supabase -> AWS S3 -> LocalResilient)
   */
  public async getActiveAdapter(): Promise<IStorageAdapter> {
    if (await this.primaryAdapter.isAvailable()) {
      if (this.activeAdapter !== this.primaryAdapter) {
        logger.info('STORAGE', `Active storage engine set to Primary: ${this.primaryAdapter.adapterName}`);
        this.activeAdapter = this.primaryAdapter;
      }
      return this.primaryAdapter;
    }

    if (await this.secondaryAdapter.isAvailable()) {
      if (this.activeAdapter !== this.secondaryAdapter) {
        logger.warn('STORAGE', `Primary Supabase Storage unreachable. Falling back to Secondary: ${this.secondaryAdapter.adapterName}`);
        this.activeAdapter = this.secondaryAdapter;
      }
      return this.secondaryAdapter;
    }

    if (this.activeAdapter !== this.fallbackAdapter) {
      logger.info('STORAGE', `Operating in Resilient Fallback Storage mode: ${this.fallbackAdapter.adapterName}`);
      this.activeAdapter = this.fallbackAdapter;
    }
    return this.fallbackAdapter;
  }

  /**
   * Universal upload handler across buckets with adapter fallback
   */
  public async uploadFile(
    bucket: StorageBucket,
    path: string,
    content: Buffer | string,
    mimeType: string,
    metadata: Record<string, any> = {}
  ): Promise<StorageFileMetadata> {
    const adapter = await this.getActiveAdapter();
    try {
      return await adapter.uploadFile(bucket, path, content, mimeType, metadata);
    } catch (err: any) {
      logger.warn('STORAGE', `Upload failed on ${adapter.adapterName}. Retrying on LocalResilient fallback...`, { error: err.message });
      return await this.fallbackAdapter.uploadFile(bucket, path, content, mimeType, metadata);
    }
  }

  /**
   * 1. RESUME UPLOADS BUCKET
   */
  public async uploadUserResume(filename: string, content: Buffer | string, mimeType = 'application/pdf'): Promise<StorageFileMetadata> {
    const cleanPath = `user_resumes/${Date.now()}_${filename.replace(/\s+/g, '_')}`;
    return this.uploadFile('resume-uploads', cleanPath, content, mimeType, { type: 'USER_UPLOAD' });
  }

  /**
   * 2. GENERATED RESUMES BUCKET
   */
  public async uploadGeneratedResume(filename: string, content: Buffer | string, version = 'v1.0'): Promise<StorageFileMetadata> {
    const cleanPath = `generated/${version}/${filename.replace(/\s+/g, '_')}`;
    const mimeType = filename.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';
    return this.uploadFile('generated-resumes', cleanPath, content, mimeType, { type: 'AI_GENERATED_RESUME', version });
  }

  /**
   * 3. GENERATED COVER LETTERS BUCKET
   */
  public async uploadGeneratedCoverLetter(filename: string, content: Buffer | string, version = 'v1.0'): Promise<StorageFileMetadata> {
    const cleanPath = `cover_letters/${version}/${filename.replace(/\s+/g, '_')}`;
    const mimeType = filename.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';
    return this.uploadFile('generated-cover-letters', cleanPath, content, mimeType, { type: 'AI_GENERATED_COVER_LETTER', version });
  }

  /**
   * 4. LOGS BUCKET
   */
  public async uploadLog(filename: string, content: Buffer | string): Promise<StorageFileMetadata> {
    const cleanPath = `execution_logs/${new Date().toISOString().split('T')[0]}/${filename}`;
    return this.uploadFile('logs', cleanPath, content, 'text/plain', { type: 'EXECUTION_LOG' });
  }

  /**
   * 5. SCREENSHOTS BUCKET
   */
  public async uploadScreenshot(filename: string, content: Buffer): Promise<StorageFileMetadata> {
    const cleanPath = `browser_audits/${filename}`;
    return this.uploadFile('screenshots', cleanPath, content, 'image/png', { type: 'BROWSER_AUTOMATION_SCREENSHOT' });
  }

  /**
   * Download raw file
   */
  public async downloadFile(bucket: StorageBucket, path: string): Promise<Buffer> {
    const adapter = await this.getActiveAdapter();
    try {
      return await adapter.downloadFile(bucket, path);
    } catch {
      return await this.fallbackAdapter.downloadFile(bucket, path);
    }
  }

  /**
   * Generate Signed URL for time-limited secure access
   */
  public async getSignedUrl(bucket: StorageBucket, path: string, expiresInSeconds = 3600): Promise<string> {
    const adapter = await this.getActiveAdapter();
    try {
      return await adapter.getSignedUrl(bucket, path, expiresInSeconds);
    } catch {
      return await this.fallbackAdapter.getSignedUrl(bucket, path, expiresInSeconds);
    }
  }

  /**
   * Delete file (soft-delete or permanent purge)
   */
  public async deleteFile(bucket: StorageBucket, path: string, softDelete = true): Promise<boolean> {
    const adapter = await this.getActiveAdapter();
    return adapter.deleteFile(bucket, path, softDelete);
  }

  /**
   * Restore soft-deleted file or rollback to historical version
   */
  public async restoreFile(bucket: StorageBucket, path: string, versionId?: string): Promise<StorageFileMetadata | null> {
    const adapter = await this.getActiveAdapter();
    return adapter.restoreFile(bucket, path, versionId);
  }

  /**
   * List files in a bucket
   */
  public async listFiles(bucket: StorageBucket, prefix = ''): Promise<StorageFileMetadata[]> {
    const adapter = await this.getActiveAdapter();
    return adapter.listFiles(bucket, prefix);
  }

  /**
   * Get version history of a file
   */
  public async getFileVersions(bucket: StorageBucket, path: string): Promise<StorageFileVersion[]> {
    const adapter = await this.getActiveAdapter();
    return adapter.getFileVersions(bucket, path);
  }

  /**
   * Storage Engine Health Status
   */
  public async getHealthStatus(): Promise<{ activeAdapter: string; primaryAvailable: boolean; secondaryAvailable: boolean; fallbackAvailable: boolean }> {
    const primaryAvailable = await this.primaryAdapter.isAvailable();
    const secondaryAvailable = await this.secondaryAdapter.isAvailable();
    const fallbackAvailable = await this.fallbackAdapter.isAvailable();

    const active = await this.getActiveAdapter();

    return {
      activeAdapter: active.adapterName,
      primaryAvailable,
      secondaryAvailable,
      fallbackAvailable,
    };
  }
}

/** Singleton Instance */
export const storageService = new StorageService();
