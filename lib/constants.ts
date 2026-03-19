// ---------------------------------------------------------------------------
// Departments — PHE & Water Supply (Arunachal Pradesh)
// Source of truth: lib/constants/phe.ts
// Runtime queries must go to the Department collection in MongoDB
// ---------------------------------------------------------------------------
import { PHE_ALLOWED_DEPARTMENTS, PHE_DEPARTMENT_IDS } from '@/lib/constants/phe';

export interface IDepartmentSeed {
  id: string;
  label: string;
  description: string;
  subcategories: string[];
  sla_days: number;
  escalation_level: number;
  active: boolean;
}

export const DEPARTMENTS: IDepartmentSeed[] = PHE_ALLOWED_DEPARTMENTS;

// Flat list of department IDs — used in Zod enums and Gemini prompts
export const DEPARTMENT_IDS: string[] = PHE_DEPARTMENT_IDS;

// ---------------------------------------------------------------------------
// Reveal & Closure Reason Dropdowns
// ---------------------------------------------------------------------------
export const REVEAL_REASONS = [
  'Callback Required',
  'Record Verification',
  'Field Visit Required',
  'Escalation Coordination',
  'Other',
] as const;

export const CLOSURE_REASONS = [
  'Issue Resolved',
  'Duplicate',
  'Invalid',
  'Transferred',
  'Out of Scope',
] as const;

// ---------------------------------------------------------------------------
// Priority options (used in forms and Gemini output mapping)
// ---------------------------------------------------------------------------
export const COMPLAINT_PRIORITIES = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

// ---------------------------------------------------------------------------
// Legacy COMPLAINT_CATEGORIES kept for backward compatibility — do not use in new code
// ---------------------------------------------------------------------------
export const COMPLAINT_CATEGORIES = DEPARTMENTS.map(d => ({ label: d.label, value: d.id }));
