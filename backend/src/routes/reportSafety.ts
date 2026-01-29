/**
 * Report Safety Routes
 * Endpoints for backup, validation, and safe change management
 */

import express from 'express';
import { reportBackupService } from '../services/reportBackupService';
import { reportChangeValidator } from '../services/reportChangeValidator';

const router = express.Router();

/**
 * Create a backup before making changes
 * POST /api/report-safety/backup
 */
router.post('/backup', async (req, res) => {
  try {
    const { reportPath, reason, userName } = req.body;

    if (!reportPath) {
      return res.status(400).json({ error: 'reportPath is required' });
    }

    const backupId = await reportBackupService.createBackup(
      reportPath,
      reason || 'Manual backup',
      userName
    );

    res.json({
      success: true,
      backupId,
      message: `Backup created successfully: ${backupId}`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: 'Failed to create backup',
    });
  }
});

/**
 * List all backups for a report
 * GET /api/report-safety/backups?reportName=sales-sample
 */
router.get('/backups', async (req, res) => {
  try {
    const { reportName } = req.query;

    const backups = await reportBackupService.listBackups(reportName as string);

    res.json({
      success: true,
      count: backups.length,
      backups,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: 'Failed to list backups',
    });
  }
});

/**
 * Restore a backup
 * POST /api/report-safety/restore
 */
router.post('/restore', async (req, res) => {
  try {
    const { backupId, targetPath } = req.body;

    if (!backupId) {
      return res.status(400).json({ error: 'backupId is required' });
    }

    await reportBackupService.restoreBackup(backupId, targetPath);

    res.json({
      success: true,
      message: `Backup ${backupId} restored successfully`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: 'Failed to restore backup',
    });
  }
});

/**
 * Cleanup old backups
 * POST /api/report-safety/cleanup
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { reportName, keepCount = 10 } = req.body;

    if (!reportName) {
      return res.status(400).json({ error: 'reportName is required' });
    }

    const deletedCount = await reportBackupService.cleanupOldBackups(
      reportName,
      keepCount
    );

    res.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} old backups`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: 'Failed to cleanup backups',
    });
  }
});

/**
 * Validate a proposed change
 * POST /api/report-safety/validate
 */
router.post('/validate', async (req, res) => {
  try {
    const { reportPath, changeType, params } = req.body;

    if (!reportPath || !changeType || !params) {
      return res.status(400).json({
        error: 'reportPath, changeType, and params are required',
      });
    }

    const validation = await reportChangeValidator.validateChange(
      reportPath,
      changeType,
      params
    );

    const preview = reportChangeValidator.generateChangePreview(validation);

    res.json({
      success: validation.isValid,
      validation,
      preview,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: 'Failed to validate change',
    });
  }
});

/**
 * Get change management status for a report
 * GET /api/report-safety/status?reportPath=...
 */
router.get('/status', async (req, res) => {
  try {
    const { reportPath } = req.query;

    if (!reportPath) {
      return res.status(400).json({ error: 'reportPath is required' });
    }

    const fs = require('fs');
    const path = require('path');

    // Check if git is available
    let gitStatus = 'Not a git repository';
    try {
      const { execSync } = require('child_process');
      const repoRoot = path.dirname(path.dirname(reportPath as string));
      gitStatus = execSync('git status --short', { cwd: repoRoot }).toString();
      if (!gitStatus) {
        gitStatus = 'Clean (no changes)';
      }
    } catch (e) {
      // Git not available or not a repo
    }

    // Get recent backups
    const reportName = path.basename(path.dirname(reportPath as string));
    const backups = await reportBackupService.listBackups(reportName);
    const recentBackups = backups.slice(0, 5);

    res.json({
      success: true,
      status: {
        reportPath,
        reportName,
        gitStatus,
        hasGit: gitStatus !== 'Not a git repository',
        backupCount: backups.length,
        recentBackups,
        recommendations: [
          backups.length === 0
            ? '⚠️  No backups found. Create a backup before making changes.'
            : '✅ Backups available',
          gitStatus === 'Not a git repository'
            ? '💡 Consider using git for version control'
            : '✅ Git repository detected',
        ],
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: 'Failed to get status',
    });
  }
});

export default router;
