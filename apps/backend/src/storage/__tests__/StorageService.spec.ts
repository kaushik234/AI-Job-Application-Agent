/**
 * @file src/storage/__tests__/StorageService.spec.ts
 * @description Phase 13 Storage Engine & Adapter Pattern Unit & Integration Test Suite.
 */

import { StorageService } from '../StorageService';
import { LocalResilientStorageAdapter } from '../adapters/LocalResilientStorageAdapter';
import { StorageBucket } from '../IStorageAdapter';

describe('Phase 13 Supabase & AWS S3 Adapter Storage Engine Suite', () => {
  let storageService: StorageService;

  beforeEach(() => {
    // Instantiate with clean local resilient adapter for predictable test execution
    const mockPrimaryUnavailable = {
      adapterName: 'MockSupabase',
      isAvailable: jest.fn().mockResolvedValue(false),
    } as any;

    const mockSecondaryUnavailable = {
      adapterName: 'MockS3',
      isAvailable: jest.fn().mockResolvedValue(false),
    } as any;

    const localFallback = new LocalResilientStorageAdapter();

    storageService = new StorageService(mockPrimaryUnavailable, mockSecondaryUnavailable, localFallback);
  });

  describe('1. Adapter Pattern & Resilient Fallback Resolution', () => {
    it('should fall back to LocalResilientStorageAdapter when cloud endpoints are unavailable', async () => {
      const health = await storageService.getHealthStatus();
      expect(health.activeAdapter).toBe('LocalResilientStorage');
      expect(health.primaryAvailable).toBe(false);
      expect(health.secondaryAvailable).toBe(false);
      expect(health.fallbackAvailable).toBe(true);
    });
  });

  describe('2. Multi-Bucket Upload Support', () => {
    it('should support uploads across all 5 target storage buckets', async () => {
      const userResume = await storageService.uploadUserResume('alex_vance_cv.pdf', Buffer.from('PDF Content'));
      expect(userResume.bucket).toBe('resume-uploads');
      expect(userResume.mimeType).toBe('application/pdf');

      const genResume = await storageService.uploadGeneratedResume('Stripe_Tailored_Resume.pdf', Buffer.from('Gen Resume'));
      expect(genResume.bucket).toBe('generated-resumes');

      const genCover = await storageService.uploadGeneratedCoverLetter('Atlassian_Cover_Letter.docx', Buffer.from('Docx Letter'));
      expect(genCover.bucket).toBe('generated-cover-letters');

      const log = await storageService.uploadLog('pipeline_2026_08_07.log', 'Log text output');
      expect(log.bucket).toBe('logs');

      const screenshot = await storageService.uploadScreenshot('atlassian_submitted.png', Buffer.from('PNG bytes'));
      expect(screenshot.bucket).toBe('screenshots');
    });
  });

  describe('3. Secure Signed URLs & Downloads', () => {
    it('should generate secure signed URLs for stored files', async () => {
      const uploaded = await storageService.uploadUserResume('test_signed.pdf', Buffer.from('Sample Content'));
      const signedUrl = await storageService.getSignedUrl('resume-uploads', uploaded.path, 1800);

      expect(signedUrl).toBeDefined();
      expect(signedUrl).toContain('signature=');
      expect(signedUrl).toContain('expires=');
    });

    it('should download uploaded file content cleanly', async () => {
      const uploaded = await storageService.uploadLog('app.log', 'Server start OK');
      const downloadedBuffer = await storageService.downloadFile('logs', uploaded.path);

      expect(downloadedBuffer.toString('utf-8')).toBe('Server start OK');
    });
  });

  describe('4. File Versioning', () => {
    it('should track file version history when updated', async () => {
      const path = 'cover_letters/v1.0/Atlassian_Letter.docx';
      const bucket: StorageBucket = 'generated-cover-letters';

      // Version 1
      await storageService.uploadFile(bucket, path, Buffer.from('Version 1 Text'), 'text/plain');
      // Version 2
      await storageService.uploadFile(bucket, path, Buffer.from('Version 2 Revised Text'), 'text/plain');

      const versions = await storageService.getFileVersions(bucket, path);
      expect(versions.length).toBe(2);
      expect(versions[0].isCurrent).toBe(true);
      expect(versions[1].isCurrent).toBe(false);
    });
  });

  describe('5. Soft Deletion & File Restoration', () => {
    it('should soft delete and restore files', async () => {
      const uploaded = await storageService.uploadScreenshot('audit.png', Buffer.from('Image data'));
      const bucket: StorageBucket = 'screenshots';

      // Delete file
      const deleted = await storageService.deleteFile(bucket, uploaded.path, true);
      expect(deleted).toBe(true);

      // Verify file is soft-deleted from list
      const activeFiles = await storageService.listFiles(bucket);
      const match = activeFiles.find((f) => f.path === uploaded.path);
      expect(match).toBeUndefined();

      // Restore file
      const restored = await storageService.restoreFile(bucket, uploaded.path);
      expect(restored).not.toBeNull();
      expect(restored?.isDeleted).toBe(false);

      // Verify file is visible again
      const activeFilesAfterRestore = await storageService.listFiles(bucket);
      const matchAfterRestore = activeFilesAfterRestore.find((f) => f.path === uploaded.path);
      expect(matchAfterRestore).toBeDefined();
    });
  });
});
