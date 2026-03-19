import { z } from 'zod';
import { REVEAL_REASONS, CLOSURE_REASONS } from './constants';
import { ADMIN_ROLES } from './rbac/roles';
import { PHE_DEPARTMENT_IDS, ARUNACHAL_DISTRICTS, PHE_TRACKING_REGEX } from './constants/phe';

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
    .enum(ADMIN_ROLES as unknown as [string, ...string[]])
    .default('helpdesk'),
  departments: z
    .array(z.enum(PHE_DEPARTMENT_IDS as [string, ...string[]]))
    .default([]),
  locationScope: z.object({
    country: z.string().trim().default('IN'),
    state: z.string().trim().default('Arunachal Pradesh'),
    district: z.string().trim().max(100).default(''),
    circle: z.string().trim().default(''),
    division: z.string().trim().default(''),
    subDivision: z.string().trim().default(''),
    section: z.string().trim().default(''),
    block: z.string().trim().default(''),
    area: z.string().trim().default(''),
  }).default({ country: 'IN', state: 'Arunachal Pradesh', district: '', circle: '', division: '', subDivision: '', section: '', block: '', area: '' }),
  temporaryPassword: z
    .string()
    .min(12, 'Temporary password must be at least 12 characters')
    .max(128, 'Password too long'),
  phone: z
    .string()
    .trim()
    .default(''),
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
  // State and district for tracking ID generation (auto-filled from geolocation)
  state: z
    .string()
    .trim()
    .max(100, 'State name too long')
    .optional()
    .default(''),
  district: z
    .string()
    .trim()
    .max(100, 'District name too long')
    .optional()
    .default(''),
  callConsent: z
    .boolean()
    .default(false),
  attachments: z
    .array(
      z.object({
        fileName: z.string().max(255),
        fileType: z.string().max(100),
        fileSize: z.number().positive(),
        url: z.string().url(),
        publicId: z.string(),
        thumbnailUrl: z.string().default(''),
        streamingUrl: z.string().default(''),
        posterUrl: z.string().default(''),
      })
    )
    .max(5, 'Maximum 5 attachments allowed')
    .optional()
    .default([]),
});

export const updateComplaintSchema = z.object({
  status: z
    .enum(['pending', 'triage', 'in_progress', 'resolved', 'closed', 'escalated'])
    .optional(),
  priority: z.enum(VALID_PRIORITIES).optional(),
  department: z.enum(PHE_DEPARTMENT_IDS as [string, ...string[]]).optional(),
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
  department: z.enum(PHE_DEPARTMENT_IDS as [string, ...string[]]).optional(),
});

// ---------------------------------------------------------------------------
// Citizen auth schemas
// ---------------------------------------------------------------------------
export const citizenRegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .regex(
      /^(\+91)?[6-9]\d{9}$/,
      'Enter a valid Indian mobile number'
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address')
    .max(254, 'Email too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  state: z
    .string()
    .trim()
    .max(100, 'State name too long')
    .optional()
    .default(''),
  district: z
    .string()
    .trim()
    .max(100, 'District name too long')
    .optional()
    .default(''),
});

export const citizenLoginSchema = z.object({
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

export const citizenVerifyOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  code: z
    .string()
    .trim()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const citizenSendOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
});

export const citizenUpdateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  state: z
    .string()
    .trim()
    .max(100)
    .optional(),
  district: z
    .string()
    .trim()
    .max(100)
    .optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export const trackComplaintSchema = z.object({
  complaintId: z
    .string()
    .trim()
    .min(1, 'Complaint ID is required')
    .refine(
      (id) => PHE_TRACKING_REGEX.test(id) || /^GRV-[A-Z]{2}-[A-Z]{3}-\d{4}-\d{6}$/.test(id),
      'Invalid complaint tracking ID format'
    ),
});

export const citizenComplaintQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['pending', 'triage', 'in_progress', 'resolved', 'closed', 'escalated']).optional(),
  sort: z.enum(['createdAt', '-createdAt']).default('-createdAt'),
  search: z.string().trim().max(200).optional(),
});

// ---------------------------------------------------------------------------
// Phase 2: Admin Scale-Up schemas
// ---------------------------------------------------------------------------

/** Internal note on a complaint (admin-only) */
export const createNoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Note content is required')
    .max(2000, 'Note must not exceed 2000 characters'),
});

/** Assign complaint to an admin */
export const assignComplaintSchema = z.object({
  assignToEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid admin email')
    .optional(),
  assignToSelf: z.boolean().optional(),
}).refine(
  (data) => data.assignToEmail || data.assignToSelf,
  { message: 'Provide assignToEmail or set assignToSelf to true' }
);

/** Escalate complaint to another department */
export const escalateComplaintSchema = z.object({
  toDepartment: z.enum(PHE_DEPARTMENT_IDS as [string, ...string[]]),
  reason: z
    .string()
    .trim()
    .min(5, 'Escalation reason must be at least 5 characters')
    .max(500, 'Reason must not exceed 500 characters'),
});

/** Bulk update complaints (max 50) */
export const bulkUpdateSchema = z.object({
  complaintIds: z
    .array(z.string().trim().min(1))
    .min(1, 'At least one complaint ID required')
    .max(50, 'Maximum 50 complaints per batch'),
  updates: z.object({
    status: z.enum(['pending', 'triage', 'in_progress', 'resolved', 'closed', 'escalated']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    department: z.enum(PHE_DEPARTMENT_IDS as [string, ...string[]]).optional(),
    assignedTo: z.string().email().nullable().optional(),
  }).refine((data) => Object.values(data).some(v => v !== undefined), {
    message: 'At least one update field required',
  }),
  reason: z
    .string()
    .trim()
    .min(1, 'Reason is required for bulk updates')
    .max(200, 'Reason must not exceed 200 characters'),
});

/** Update admin user profile */
export const updateAdminUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .regex(/^[a-zA-Z\s_\-.]+$/, 'Name contains invalid characters')
    .optional(),
  role: z.enum(ADMIN_ROLES as unknown as [string, ...string[]]).optional(),
  departments: z.array(z.enum(PHE_DEPARTMENT_IDS as [string, ...string[]])).optional(),
  locationScope: z.object({
    country: z.string().trim().optional(),
    state: z.string().trim().optional(),
    district: z.string().trim().max(100).optional(),
    circle: z.string().trim().optional(),
    division: z.string().trim().optional(),
    subDivision: z.string().trim().optional(),
    section: z.string().trim().optional(),
    block: z.string().trim().optional(),
    area: z.string().trim().optional(),
  }).optional(),
  isActive: z.boolean().optional(),
  phone: z.string().trim().max(20).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

/** Notification list query */
export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  isRead: z.enum(['true', 'false']).optional(),
  type: z.enum([
    'assignment', 'escalation', 'sla_warning', 'sla_breach',
    'status_change', 'new_complaint', 'note_added', 'system',
  ]).optional(),
});

/** Analytics with date range */
export const analyticsQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  department: z.enum(PHE_DEPARTMENT_IDS as [string, ...string[]]).optional(),
  period: z.enum(['7d', '30d', '90d', 'custom']).default('30d'),
});

/** Department admin management */
export const departmentAdminSchema = z.object({
  adminEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid admin email'),
});

/** Enhanced complaint query (Phase 2 — adds assignedTo, slaBreached, dateFrom, dateTo) */
export const enhancedComplaintQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'triage', 'in_progress', 'resolved', 'closed', 'escalated']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  sort: z.enum(['createdAt', '-createdAt', 'priority', '-priority', 'status', '-status', 'slaDeadline', '-slaDeadline']).default('-createdAt'),
  search: z.string().trim().max(200).optional(),
  department: z.enum(PHE_DEPARTMENT_IDS as [string, ...string[]]).optional(),
  assignedTo: z.string().trim().optional(),
  slaBreached: z.enum(['true', 'false']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  cursor: z.string().trim().optional(), // MongoDB _id for cursor-based pagination
});

