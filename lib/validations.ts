import { z } from 'zod';

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address')
    .max(254, 'Email too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

export const rotatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(12, 'New password must be at least 12 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"|,.<>/?])/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
});

// ---------------------------------------------------------------------------
// Admin management schemas
// ---------------------------------------------------------------------------
export const createAdminSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address')
    .max(254, 'Email too long'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s_\-.]+$/, 'Name contains invalid characters'),
  securityLevel: z.number().int().min(1).max(4).default(1),
  temporaryPassword: z
    .string()
    .min(12, 'Temporary password must be at least 12 characters')
    .max(128, 'Password too long'),
});

// ---------------------------------------------------------------------------
// Complaint schemas
// ---------------------------------------------------------------------------
const VALID_CATEGORIES = ['auto', 'exam_misconduct', 'portal_issues', 'result_discrepancy', 'other'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export const createComplaintSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must not exceed 200 characters'),
  description: z
    .string()
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must not exceed 5000 characters'),
  category: z.enum(VALID_CATEGORIES, {
    message: 'Invalid category',
  }),
  priority: z.enum(VALID_PRIORITIES, {
    message: 'Invalid priority',
  }).default('medium'),
  location: z
    .string()
    .trim()
    .max(200, 'Location must not exceed 200 characters')
    .default(''),
  submitterName: z
    .string()
    .trim()
    .max(100, 'Name too long')
    .optional()
    .nullable(),
  submitterContact: z
    .string()
    .trim()
    .max(200, 'Contact info too long')
    .optional()
    .nullable(),
});

export const updateComplaintSchema = z.object({
  status: z
    .enum(['pending', 'triage', 'in_progress', 'resolved', 'closed'])
    .optional(),
  priority: z.enum(VALID_PRIORITIES).optional(),
  department: z.string().trim().max(100).optional(),
  assignedTo: z.string().email().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// ---------------------------------------------------------------------------
// Query parameter schemas
// ---------------------------------------------------------------------------
export const complaintQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'triage', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(VALID_PRIORITIES).optional(),
  sort: z.enum(['createdAt', '-createdAt', 'priority', '-priority', 'status', '-status']).default('-createdAt'),
  search: z.string().trim().max(200).optional(),
});
