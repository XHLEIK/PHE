import { z } from 'zod';
import { REVEAL_REASONS, CLOSURE_REASONS } from './constants';

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
  role: z
    .enum(['head_admin', 'department_admin', 'staff'])
    .default('staff'),
  departments: z
    .array(z.string().trim().min(1))
    .default([]),
  temporaryPassword: z
    .string()
    .min(12, 'Temporary password must be at least 12 characters')
    .max(128, 'Password too long'),
});

// ---------------------------------------------------------------------------
// Complaint schemas
// ---------------------------------------------------------------------------
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
  // Contact info — required fields
  submitterName: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),
  submitterPhone: z
    .string()
    .trim()
    .regex(
      /^(\+91)?[6-9]\d{9}$/,
      'Enter a valid phone number so we can reach you about your complaint'
    ),
  submitterEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address'),
  // Optional geolocation coordinates
  coordinates: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional()
    .nullable(),
  location: z
    .string()
    .trim()
    .max(300, 'Location must not exceed 300 characters')
    .default(''),
  callConsent: z
    .boolean()
    .default(false),
});

export const updateComplaintSchema = z.object({
  status: z
    .enum(['pending', 'triage', 'in_progress', 'resolved', 'closed', 'escalated'])
    .optional(),
  priority: z.enum(VALID_PRIORITIES).optional(),
  department: z.string().trim().max(100).optional(),
  assignedTo: z.string().email().nullable().optional(),
  // Reason required for terminal/escalation transitions \u2014 enforced at route level
  reason: z.string().trim().min(1).max(200).optional(),
  comment: z.string().trim().max(250).optional(),
}).refine((data) => {
  const { reason, comment, ...rest } = data;
  return Object.keys(rest).length > 0;
}, {
  message: 'At least one field must be provided for update',
});

// Status transitions that REQUIRE a reason
export const TERMINAL_STATUSES = ['resolved', 'closed', 'escalated'] as const;

// ---------------------------------------------------------------------------
// Reveal contact schema
// ---------------------------------------------------------------------------
export const revealContactSchema = z.object({
  reason: z.enum(REVEAL_REASONS, { message: 'Select a valid reason' }),
});

// ---------------------------------------------------------------------------
// Query parameter schemas
// ---------------------------------------------------------------------------
export const complaintQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'triage', 'in_progress', 'resolved', 'closed', 'escalated']).optional(),
  priority: z.enum(VALID_PRIORITIES).optional(),
  sort: z.enum(['createdAt', '-createdAt', 'priority', '-priority', 'status', '-status']).default('-createdAt'),
  search: z.string().trim().max(200).optional(),
  department: z.string().trim().optional(),
});
