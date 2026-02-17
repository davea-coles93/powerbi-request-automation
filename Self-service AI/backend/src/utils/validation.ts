/**
 * Input Validation Utilities
 * Protects against injection attacks and validates user input
 */

import Joi from 'joi';
import * as path from 'path';

// Request DTOSchemas
export const createRequestSchema = Joi.object({
  clientId: Joi.string()
    .max(50)
    .pattern(/^[a-zA-Z0-9-_]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Client ID can only contain letters, numbers, hyphens, and underscores',
      'string.max': 'Client ID must be less than 50 characters'
    }),

  modelName: Joi.string()
    .max(100)
    .pattern(/^[a-zA-Z0-9-_]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Model name can only contain letters, numbers, hyphens, and underscores',
      'string.max': 'Model name must be less than 100 characters'
    }),

  title: Joi.string()
    .max(200)
    .required()
    .messages({
      'string.max': 'Title must be less than 200 characters'
    }),

  description: Joi.string()
    .max(5000)
    .required()
    .messages({
      'string.max': 'Description must be less than 5000 characters'
    }),

  urgency: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .required()
});

export const clarificationResponseSchema = Joi.object({
  response: Joi.string()
    .max(10000)
    .trim()
    .required()
    .messages({
      'string.max': 'Clarification response must be less than 10000 characters'
    })
});

/**
 * Validate URL is safe (http/https only)
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate path is within base directory (prevent path traversal)
 */
export function validatePath(basePath: string, userPath: string): string {
  const fullPath = path.resolve(basePath, userPath);
  const normalizedBase = path.resolve(basePath);

  if (!fullPath.startsWith(normalizedBase)) {
    throw new Error('Invalid path: directory traversal detected');
  }

  return fullPath;
}

/**
 * Sanitize string for safe logging (remove sensitive patterns)
 */
export function sanitizeForLog(input: string, maxLength: number = 100): string {
  return input
    .replace(/password|token|key|secret|api[-_]?key/gi, '[REDACTED]')
    .substring(0, maxLength);
}

/**
 * Sanitize error message for user display
 */
export function sanitizeErrorMessage(error: any): string {
  const safeErrors = [
    'Request not found',
    'Invalid request',
    'Maximum attempts reached',
    'Authentication required',
    'Too many requests',
    'Request is not awaiting clarification',
    'Clarification response required'
  ];

  const message = error?.message || error?.toString() || '';

  // Check if message is in safe list
  if (safeErrors.some(safe => message.includes(safe))) {
    return message;
  }

  // Generic error for everything else
  return 'An error occurred processing your request';
}

/**
 * Sanitize user input before passing to LLM
 */
export function sanitizeForLLM(input: string): string {
  return input
    // Remove potential JSON injection
    .replace(/\{[^}]*\}/g, '[removed]')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '[code block removed]')
    // Remove markdown links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Limit length
    .substring(0, 3000);
}

/**
 * Validate and sanitize git branch name
 */
export function sanitizeBranchName(name: string): string {
  // Only allow alphanumeric, hyphens, underscores, forward slashes
  return name
    .replace(/[^a-zA-Z0-9-_/]/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100);
}
