/**
 * @file src/storage/IStorageAdapter.ts
 * @description Phase 13 Storage Adapter Interface & Contracts for Supabase and AWS S3 Adapter Pattern.
 */

export type StorageBucket =
  | 'resume-uploads'
  | 'generated-resumes'
  | 'generated-cover-letters'
  | 'logs'
  | 'screenshots';

export interface StorageFileVersion {
  versionId: string;
  createdAt: string;
  size: number;
  mimeType: string;
  contentHash?: string;
  isCurrent: boolean;
}

export interface StorageFileMetadata {
  id: string;
  bucket: StorageBucket;
  path: string;
  filename: string;
  version: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  signedUrl?: string;
  publicUrl?: string;
  versions: StorageFileVersion[];
  customMetadata?: Record<string, any>;
}

export interface IStorageAdapter {
  readonly adapterName: string;

  /**
   * Checks if adapter credentials and network connectivity are operational
   */
  isAvailable(): Promise<boolean>;

  /**
   * Uploads file to targeted bucket with optional versioning and metadata
   */
  uploadFile(
    bucket: StorageBucket,
    path: string,
    content: Buffer | string,
    mimeType: string,
    metadata?: Record<string, any>
  ): Promise<StorageFileMetadata>;

  /**
   * Downloads raw file buffer from bucket
   */
  downloadFile(bucket: StorageBucket, path: string): Promise<Buffer>;

  /**
   * Generates time-limited signed URL for secure file access
   */
  getSignedUrl(bucket: StorageBucket, path: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Returns public URL for public assets if enabled
   */
  getPublicUrl(bucket: StorageBucket, path: string): Promise<string>;

  /**
   * Deletes file (soft-delete with version retention or permanent purge)
   */
  deleteFile(bucket: StorageBucket, path: string, softDelete?: boolean): Promise<boolean>;

  /**
   * Restores soft-deleted file or rolls back to specific historical version
   */
  restoreFile(bucket: StorageBucket, path: string, versionId?: string): Promise<StorageFileMetadata | null>;

  /**
   * Lists files in bucket with optional path prefix
   */
  listFiles(bucket: StorageBucket, prefix?: string): Promise<StorageFileMetadata[]>;

  /**
   * Retrieves version history for a specific file path
   */
  getFileVersions(bucket: StorageBucket, path: string): Promise<StorageFileVersion[]>;
}
