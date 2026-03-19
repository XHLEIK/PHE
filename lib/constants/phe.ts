/**
 * lib/constants/phe.ts
 * Central configuration for PHE & Water Supply (Arunachal Pradesh).
 *
 * ALL code must read allowed departments, roles, districts, and tracking
 * config from this single file. Never scatter hard-coded PHE values elsewhere.
 */

// ---------------------------------------------------------------------------
// Department key — canonical top-level identifier for this deployment
// ---------------------------------------------------------------------------
export const PHE_DEPARTMENT_KEY = 'phe_ws' as const;

// ---------------------------------------------------------------------------
// Tracking-ID format  AP-PHE-YYYY-NNNNNN
// ---------------------------------------------------------------------------
export const PHE_TRACKING_PREFIX = 'AP-PHE';
export const PHE_TRACKING_REGEX = /^AP-PHE-\d{4}-\d{6}$/;

// ---------------------------------------------------------------------------
// PHE sub-departments (the 10 divisions within PHE & Water Supply)
// ---------------------------------------------------------------------------
export interface PheDepartment {
  id: string;
  label: string;
  description: string;
  subcategories: string[];
  sla_days: number;
  escalation_level: number;
  active: boolean;
}

export const PHE_ALLOWED_DEPARTMENTS: PheDepartment[] = [
  {
    id: 'water_supply_operations',
    label: 'Water Supply Operations',
    description: 'Daily water supply operations, scheduling, and distribution management.',
    subcategories: ['Supply Disruption', 'Low Pressure', 'No Water', 'Irregular Supply', 'Contaminated Supply'],
    sla_days: 3,
    escalation_level: 2,
    active: true,
  },
  {
    id: 'water_treatment_quality',
    label: 'Water Treatment & Quality',
    description: 'Water quality testing, treatment plant operations, and contamination control.',
    subcategories: ['Water Quality', 'Contamination Report', 'Chlorination Issue', 'Treatment Plant Malfunction'],
    sla_days: 2,
    escalation_level: 3,
    active: true,
  },
  {
    id: 'pipeline_maintenance',
    label: 'Infrastructure & Pipeline Maintenance',
    description: 'Pipeline repairs, leakage control, valve maintenance, and infrastructure upkeep.',
    subcategories: ['Pipeline Leak', 'Burst Pipe', 'Valve Issue', 'Infrastructure Damage', 'Road Cutting Repair'],
    sla_days: 5,
    escalation_level: 2,
    active: true,
  },
  {
    id: 'project_construction',
    label: 'Project & Construction',
    description: 'New water supply projects, construction progress, and tender management.',
    subcategories: ['New Connection Request', 'Project Delay', 'Construction Quality', 'Tender Query'],
    sla_days: 15,
    escalation_level: 1,
    active: true,
  },
  {
    id: 'rural_water_supply',
    label: 'Rural Water Supply',
    description: 'Water supply to rural and remote areas, including hand pumps and tube wells.',
    subcategories: ['Hand Pump Repair', 'Tube Well Issue', 'Rural Scheme Delay', 'Remote Area Supply'],
    sla_days: 7,
    escalation_level: 2,
    active: true,
  },
  {
    id: 'urban_water_supply',
    label: 'Urban Water Supply',
    description: 'Urban water distribution, metering, billing, and connection management.',
    subcategories: ['Metering Issue', 'Billing Dispute', 'New Connection', 'Disconnection Complaint'],
    sla_days: 5,
    escalation_level: 2,
    active: true,
  },
  {
    id: 'complaint_cell',
    label: 'Complaint & Grievance Cell',
    description: 'Central grievance intake, triage, and citizen support for unclassified complaints.',
    subcategories: ['General Grievance', 'Follow-Up', 'Feedback', 'Suggestion'],
    sla_days: 3,
    escalation_level: 3,
    active: true,
  },
  {
    id: 'technical_engineering',
    label: 'Technical & Engineering',
    description: 'Technical assessments, engineering designs, and structural evaluations.',
    subcategories: ['Technical Survey', 'Design Review', 'Structural Assessment', 'Feasibility Study'],
    sla_days: 10,
    escalation_level: 1,
    active: true,
  },
  {
    id: 'monitoring_inspection',
    label: 'Monitoring & Inspection',
    description: 'Field inspections, quality audits, compliance monitoring, and progress tracking.',
    subcategories: ['Field Inspection', 'Quality Audit', 'Progress Review', 'Compliance Check'],
    sla_days: 7,
    escalation_level: 2,
    active: true,
  },
  {
    id: 'it_digital_systems',
    label: 'IT & Digital Systems',
    description: 'Portal management, digital infrastructure, and technology support.',
    subcategories: ['Portal Issue', 'Login Problem', 'Technical Glitch', 'Data Correction'],
    sla_days: 2,
    escalation_level: 3,
    active: true,
  },
];

export const PHE_DEPARTMENT_IDS = PHE_ALLOWED_DEPARTMENTS.map(d => d.id);

// ---------------------------------------------------------------------------
// Legacy department names → mapped to PHE during migration
// ---------------------------------------------------------------------------
export const PHE_DEPARTMENT_MAPPINGS = [
  'Water Supply',
  'Public Health Engineering',
  'PHE',
  'Water Dept',
  'Water Resources',
  'Water',
  'water_resources',
  'phe',
  'phe_ws',
  'Unassigned',            // current default in POST handler
  'pending_ai',            // set as category placeholder
] as const;

// ---------------------------------------------------------------------------
// Arunachal Pradesh districts (26 districts — Census 2011 + new districts)
// ---------------------------------------------------------------------------
export const ARUNACHAL_DISTRICTS = [
  'Anjaw',
  'Changlang',
  'Dibang Valley',
  'East Kameng',
  'East Siang',
  'Kamle',
  'Kra Daadi',
  'Kurung Kumey',
  'Lepa Rada',
  'Lohit',
  'Longding',
  'Lower Dibang Valley',
  'Lower Siang',
  'Lower Subansiri',
  'Namsai',
  'Pakke-Kessang',
  'Papum Pare',
  'Shi Yomi',
  'Siang',
  'Tawang',
  'Tirap',
  'Upper Siang',
  'Upper Subansiri',
  'West Kameng',
  'West Siang',
  'Itanagar Capital Complex',
] as const;

export type ArunachalDistrict = (typeof ARUNACHAL_DISTRICTS)[number];

// ---------------------------------------------------------------------------
// PHE-aligned admin roles
// ---------------------------------------------------------------------------
export const PHE_ADMIN_ROLES = [
  'head_admin',
  'chief_engineer',
  'superintending_engineer',
  'executive_engineer',
  'assistant_engineer',
  'junior_engineer',
  'field_technician',
  'helpdesk',
] as const;

export type PheAdminRole = (typeof PHE_ADMIN_ROLES)[number];

// ---------------------------------------------------------------------------
// Role rename mapping (for migration & backward compatibility)
// ---------------------------------------------------------------------------
export const PHE_ROLE_RENAME_MAP: Record<string, PheAdminRole> = {
  cabinet: 'chief_engineer',
  state_chief: 'chief_engineer',
  district_commissioner: 'superintending_engineer',
  department_director: 'executive_engineer',
  department_head: 'executive_engineer',
  senior_officer: 'executive_engineer',
  officer: 'assistant_engineer',
  junior_officer: 'junior_engineer',
  citizen_support: 'helpdesk',
  field_staff: 'assistant_engineer',
  support_staff: 'field_technician',
};
