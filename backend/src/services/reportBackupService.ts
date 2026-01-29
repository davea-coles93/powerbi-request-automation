/**
 * Report Backup Service
 * Creates automatic backups before modifying Power BI reports
 * Enables rollback and change history tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

interface BackupMetadata {
  timestamp: string;
  reportPath: string;
  reason: string;
  userName?: string;
  changedFiles: string[];
}

export class ReportBackupService {
  private backupRoot: string;

  constructor(backupRoot: string = './backups/reports') {
    this.backupRoot = backupRoot;
  }

  /**
   * Create a backup of a report before making changes
   * @param reportPath - Path to the .Report folder
   * @param reason - Reason for the backup (e.g., "Creating new page", "Updating visual")
   * @param userName - Optional user making the change
   * @returns Backup ID for potential rollback
   */
  async createBackup(
    reportPath: string,
    reason: string,
    userName?: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const reportName = path.basename(path.dirname(reportPath));
    const backupId = `${reportName}_${timestamp}`;
    const backupPath = path.join(this.backupRoot, backupId);

    // Create backup directory
    await mkdir(backupPath, { recursive: true });

    // Copy entire report structure
    await this.copyDirectory(reportPath, backupPath);

    // Save metadata
    const metadata: BackupMetadata = {
      timestamp: new Date().toISOString(),
      reportPath,
      reason,
      userName,
      changedFiles: [],
    };

    await fs.promises.writeFile(
      path.join(backupPath, 'backup-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log(`✅ Backup created: ${backupId}`);
    return backupId;
  }

  /**
   * Restore a report from a backup
   * @param backupId - The backup ID to restore from
   * @param targetPath - Optional target path (defaults to original location)
   */
  async restoreBackup(backupId: string, targetPath?: string): Promise<void> {
    const backupPath = path.join(this.backupRoot, backupId);

    // Read metadata
    const metadataPath = path.join(backupPath, 'backup-metadata.json');
    const metadata: BackupMetadata = JSON.parse(
      await fs.promises.readFile(metadataPath, 'utf-8')
    );

    const restorePath = targetPath || metadata.reportPath;

    // Backup current state before restore (just in case)
    await this.createBackup(restorePath, `Before restoring backup ${backupId}`);

    // Remove current report
    await this.removeDirectory(restorePath);

    // Copy backup to target
    await this.copyDirectory(backupPath, restorePath);

    // Remove metadata file from restored location
    const restoredMetadataPath = path.join(restorePath, 'backup-metadata.json');
    if (fs.existsSync(restoredMetadataPath)) {
      await fs.promises.unlink(restoredMetadataPath);
    }

    console.log(`✅ Restored backup: ${backupId} to ${restorePath}`);
  }

  /**
   * List all available backups for a report
   * @param reportName - Name of the report
   */
  async listBackups(reportName?: string): Promise<BackupMetadata[]> {
    if (!fs.existsSync(this.backupRoot)) {
      return [];
    }

    const backupDirs = await readdir(this.backupRoot);
    const backups: BackupMetadata[] = [];

    for (const dir of backupDirs) {
      if (reportName && !dir.startsWith(reportName)) {
        continue;
      }

      const metadataPath = path.join(this.backupRoot, dir, 'backup-metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf-8'));
        backups.push({
          ...metadata,
          backupId: dir,
        } as any);
      }
    }

    return backups.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Delete old backups (keep last N backups)
   * @param reportName - Report to clean up backups for
   * @param keepCount - Number of backups to keep (default: 10)
   */
  async cleanupOldBackups(reportName: string, keepCount: number = 10): Promise<number> {
    const backups = await this.listBackups(reportName);

    if (backups.length <= keepCount) {
      return 0;
    }

    const toDelete = backups.slice(keepCount);
    let deletedCount = 0;

    for (const backup of toDelete) {
      const backupPath = path.join(this.backupRoot, (backup as any).backupId);
      await this.removeDirectory(backupPath);
      deletedCount++;
    }

    console.log(`🗑️  Cleaned up ${deletedCount} old backups for ${reportName}`);
    return deletedCount;
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src);

    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      const entryStat = await stat(srcPath);

      if (entryStat.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Remove directory recursively
   */
  private async removeDirectory(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = await readdir(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const entryStat = await stat(fullPath);

      if (entryStat.isDirectory()) {
        await this.removeDirectory(fullPath);
      } else {
        await fs.promises.unlink(fullPath);
      }
    }

    await fs.promises.rmdir(dir);
  }
}

// Singleton instance
export const reportBackupService = new ReportBackupService();
