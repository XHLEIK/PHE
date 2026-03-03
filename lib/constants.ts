// ---------------------------------------------------------------------------
// Departments — canonical seed list (source of truth for DB seeding only)
// Runtime queries must go to the Department collection in MongoDB
// ---------------------------------------------------------------------------
export interface IDepartmentSeed {
  id: string;
  label: string;
  description: string;
  subcategories: string[];
  sla_days: number;
  escalation_level: number;
  active: boolean;
}

export const DEPARTMENTS: IDepartmentSeed[] = [
  // ---- Core 15 Departments ----
  {
    id: 'pwd',
    label: 'Public Works Department (PWD)',
    description: 'Roads, bridges, government buildings, drainage, street infrastructure',
    subcategories: ['Roads', 'Bridges', 'Government Buildings', 'Drainage', 'Street Infrastructure'],
    sla_days: 15, escalation_level: 2, active: true,
  },
  {
    id: 'water_resources',
    label: 'Water Resources / Jal Shakti Department',
    description: 'Drinking water supply, pipelines, borewells, irrigation, water scarcity',
    subcategories: ['Drinking Water Supply', 'Water Pipelines', 'Borewell Issues', 'Irrigation Canals', 'Water Scarcity'],
    sla_days: 10, escalation_level: 2, active: true,
  },
  {
    id: 'food_civil_supplies',
    label: 'Food & Civil Supplies Department',
    description: 'Ration cards, PDS issues, rice/wheat supply, fair price shops, duplicate deductions',
    subcategories: ['Ration Cards', 'PDS Issues', 'Rice/Wheat Supply', 'Fair Price Shop Complaints', 'Duplicate Ration Deduction'],
    sla_days: 7, escalation_level: 2, active: true,
  },
  {
    id: 'electricity',
    label: 'Electricity / Power Department',
    description: 'Power cuts, billing errors, transformer issues, new connections, voltage problems',
    subcategories: ['Power Cuts', 'Billing Errors', 'Transformer Issues', 'New Connections', 'Voltage Problems'],
    sla_days: 5, escalation_level: 2, active: true,
  },
  {
    id: 'health',
    label: 'Health & Family Welfare',
    description: 'Government hospitals, staff negligence, medicine shortage, ambulance, PHC issues',
    subcategories: ['Government Hospitals', 'Staff Negligence', 'Medicine Shortage', 'Ambulance Services', 'PHC Issues'],
    sla_days: 3, escalation_level: 3, active: true,
  },
  {
    id: 'education',
    label: 'Education Department',
    description: 'School infrastructure, teacher absence, scholarship issues, exams, college administration',
    subcategories: ['School Infrastructure', 'Teacher Absence', 'Scholarship Issues', 'Exam Complaints', 'College Administration'],
    sla_days: 15, escalation_level: 1, active: true,
  },
  {
    id: 'agriculture',
    label: 'Agriculture Department',
    description: 'Crop insurance, subsidy issues, seed/fertilizer supply, farmer compensation, MSP',
    subcategories: ['Crop Insurance', 'Subsidy Issues', 'Seed/Fertilizer Supply', 'Farmer Compensation', 'MSP Problems'],
    sla_days: 10, escalation_level: 2, active: true,
  },
  {
    id: 'revenue',
    label: 'Revenue Department',
    description: 'Land records, mutation issues, caste certificate, income certificate, property disputes',
    subcategories: ['Land Records', 'Mutation Issues', 'Caste Certificate', 'Income Certificate', 'Property Disputes'],
    sla_days: 21, escalation_level: 2, active: true,
  },
  {
    id: 'municipal',
    label: 'Municipal Corporation / Urban Development',
    description: 'Garbage collection, sewerage, streetlights, encroachment, building permits',
    subcategories: ['Garbage Collection', 'Sewerage', 'Streetlights', 'Encroachment', 'Building Permits'],
    sla_days: 7, escalation_level: 1, active: true,
  },
  {
    id: 'rural_development',
    label: 'Rural Development / Panchayati Raj',
    description: 'Village roads, rural water, rural housing schemes, MGNREGA payments',
    subcategories: ['Village Roads', 'Rural Water', 'Rural Housing Schemes', 'MGNREGA Payments'],
    sla_days: 15, escalation_level: 2, active: true,
  },
  {
    id: 'transport',
    label: 'Transport Department',
    description: 'Driving license, vehicle registration, permit issues',
    subcategories: ['Driving License', 'Vehicle Registration', 'Permit Issues'],
    sla_days: 10, escalation_level: 1, active: true,
  },
  {
    id: 'social_welfare',
    label: 'Social Welfare Department',
    description: 'Pension issues, widow pension, disability schemes, senior citizen benefits',
    subcategories: ['Pension Issues', 'Widow Pension', 'Disability Schemes', 'Senior Citizen Benefits'],
    sla_days: 10, escalation_level: 2, active: true,
  },
  {
    id: 'women_child',
    label: 'Women & Child Development',
    description: 'Anganwadi issues, child welfare, women safety programs',
    subcategories: ['Anganwadi Issues', 'Child Welfare', 'Women Safety Programs'],
    sla_days: 7, escalation_level: 3, active: true,
  },
  {
    id: 'police',
    label: 'Police / Home Department',
    description: 'FIR delays, local policing complaints, public safety issues',
    subcategories: ['FIR Delay', 'Local Policing Complaints', 'Public Safety Issues'],
    sla_days: 3, escalation_level: 4, active: true,
  },
  {
    id: 'labour',
    label: 'Labour Department',
    description: 'Wage complaints, factory issues, worker rights',
    subcategories: ['Wage Complaints', 'Factory Issues', 'Worker Rights'],
    sla_days: 15, escalation_level: 2, active: true,
  },
  // ---- Optional Advanced Departments ----
  {
    id: 'environment',
    label: 'Environment & Forest',
    description: 'Environmental violations, forest encroachment, pollution',
    subcategories: ['Environmental Violations', 'Forest Encroachment', 'Pollution'],
    sla_days: 21, escalation_level: 2, active: true,
  },
  {
    id: 'housing_board',
    label: 'Housing Board',
    description: 'Housing scheme issues, allotment complaints',
    subcategories: ['Housing Scheme Issues', 'Allotment Complaints'],
    sla_days: 21, escalation_level: 1, active: true,
  },
  {
    id: 'mining',
    label: 'Mining Department',
    description: 'Illegal mining, permit violations, mining impact',
    subcategories: ['Illegal Mining', 'Permit Violations', 'Mining Impact'],
    sla_days: 21, escalation_level: 2, active: true,
  },
  {
    id: 'tourism',
    label: 'Tourism Department',
    description: 'Tourist facility complaints, hospitality issues',
    subcategories: ['Tourist Facility Complaints', 'Hospitality Issues'],
    sla_days: 15, escalation_level: 1, active: true,
  },
  {
    id: 'it_egovernance',
    label: 'IT & E-Governance',
    description: 'Portal issues, digital service failures, e-governance complaints',
    subcategories: ['Portal Issues', 'Digital Service Failures', 'E-Governance Complaints'],
    sla_days: 5, escalation_level: 1, active: true,
  },
  {
    id: 'minority_affairs',
    label: 'Minority Affairs',
    description: 'Minority welfare scheme issues, discrimination complaints',
    subcategories: ['Minority Welfare Schemes', 'Discrimination Complaints'],
    sla_days: 15, escalation_level: 2, active: true,
  },
  {
    id: 'skill_development',
    label: 'Skill Development',
    description: 'Skill training center issues, certification complaints',
    subcategories: ['Skill Training Center Issues', 'Certification Complaints'],
    sla_days: 15, escalation_level: 1, active: true,
  },
  // ---- Unassigned fallback ----
  {
    id: 'other',
    label: 'Other / General',
    description: 'Complaints that do not fit into other departments',
    subcategories: ['General Complaint'],
    sla_days: 21, escalation_level: 1, active: true,
  },
];

// Flat list of department IDs — used in Zod enums and Gemini prompts
export const DEPARTMENT_IDS: string[] = DEPARTMENTS.map(d => d.id);

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
