/**
 * DEV-ONLY FIXTURES — Gated behind NEXT_PUBLIC_DEV_MODE=true
 *
 * These fixtures provide placeholder data for UI development when the backend
 * is not running. They are DISABLED by default and must NEVER be enabled in
 * production builds.
 *
 * Usage: import { getDevComplaints } from '@/lib/dev-fixtures';
 *        const data = getDevComplaints(); // returns [] if dev mode is off
 */

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

function gated<T>(data: T[]): T[] {
  if (!IS_DEV_MODE) return [];
  console.warn('[DEV FIXTURES] Using mock data — disable NEXT_PUBLIC_DEV_MODE in production');
  return data;
}

function gatedSingle<T>(data: T, fallback: T): T {
  if (!IS_DEV_MODE) return fallback;
  console.warn('[DEV FIXTURES] Using mock data — disable NEXT_PUBLIC_DEV_MODE in production');
  return data;
}

// ---------------------------------------------------------------------------
// Complaint fixtures (previously hardcoded in RealTimeComplaints, complaints/page, dashboard)
// ---------------------------------------------------------------------------
export interface DevComplaint {
  id: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'TRIAGE' | 'RESOLVED' | 'In_Progress' | 'Open';
  time: string;
  department: string;
}

const DEV_COMPLAINTS: DevComplaint[] = [
  {
    id: 'SEC-8821',
    title: 'Payment Gateway Timeout - SBI Portal',
    description: 'Transaction failed but amount debited for candidate AP-4491. Gateway returned 504 Gateway Timeout during prelims fee collection.',
    priority: 'CRITICAL',
    status: 'TRIAGE',
    time: '2 mins ago',
    department: 'Payment Gateway',
  },
  {
    id: 'SEC-8818',
    title: 'Document Upload Sync Error',
    description: 'Candidate reported 403 Forbidden while uploading OBC/NCL certificates. Seems like an S3 bucket permission issue.',
    priority: 'HIGH',
    status: 'TRIAGE',
    time: '15 mins ago',
    department: 'Digital Documentation',
  },
  {
    id: 'SEC-8815',
    title: 'Portal Login Timeout',
    description: 'System-wide login timeouts reported between 10 AM and 11 AM today during heavy traffic spike.',
    priority: 'MEDIUM',
    status: 'PENDING',
    time: '42 mins ago',
    department: 'Infrastructure',
  },
  {
    id: 'SEC-8811',
    title: 'Incorrect Result Entry',
    description: 'Candidate claims discrepancy in the prelims marksheet versus the final score published.',
    priority: 'HIGH',
    status: 'RESOLVED',
    time: '1 hour ago',
    department: 'Result Cell',
  },
];

export function getDevComplaints(): DevComplaint[] {
  return gated(DEV_COMPLAINTS);
}

// ---------------------------------------------------------------------------
// Dashboard stat fixtures
// ---------------------------------------------------------------------------
export interface DevStat {
  title: string;
  value: string;
  change: string;
  color: string;
}

const DEV_DASHBOARD_STATS: DevStat[] = [
  { title: 'System_Grievances', value: '1,284', change: '+12%', color: 'emerald' },
  { title: 'Critical_Alerts', value: '14', change: 'LOW', color: 'rose' },
  { title: 'Kernel_Resolved', value: '892', change: '94%', color: 'blue' },
  { title: 'Uptime_Session', value: '99.9%', change: 'LIVE', color: 'emerald' },
];

export function getDevDashboardStats(): DevStat[] {
  return gated(DEV_DASHBOARD_STATS);
}

// ---------------------------------------------------------------------------
// Infrastructure metrics fixtures
// ---------------------------------------------------------------------------
export interface DevInfraMetric {
  label: string;
  value: number;
}

const DEV_INFRA_METRICS: DevInfraMetric[] = [
  { label: 'Bandwidth', value: 84 },
  { label: 'Memory', value: 62 },
  { label: 'CPU_Cycles', value: 24 },
];

export function getDevInfraMetrics(): DevInfraMetric[] {
  return gated(DEV_INFRA_METRICS);
}

// ---------------------------------------------------------------------------
// Analytics fixtures
// ---------------------------------------------------------------------------
export interface DevAnalyticsStat {
  label: string;
  value: string;
  trend: string;
  color: string;
}

const DEV_ANALYTICS_STATS: DevAnalyticsStat[] = [
  { label: 'Issues Resolved', value: '2,841', trend: '+14%', color: 'emerald' },
  { label: 'Avg Triage Time', value: '42m', trend: '-22%', color: 'blue' },
  { label: 'AI Accuracy', value: '98.4%', trend: '+0.5%', color: 'purple' },
  { label: 'Network Uptime', value: '99.9%', trend: 'STABLE', color: 'emerald' },
];

export function getDevAnalyticsStats(): DevAnalyticsStat[] {
  return gated(DEV_ANALYTICS_STATS);
}

export const DEV_BAR_CHART_VALUES = [40, 70, 45, 90, 65, 80, 50, 85, 60, 95, 75, 100];

export function getDevBarChartValues(): number[] {
  return gated(DEV_BAR_CHART_VALUES);
}

export interface DevDeptLoad {
  label: string;
  color: string;
  val: string;
}

const DEV_DEPARTMENT_LOADS: DevDeptLoad[] = [
  { label: 'Examination', color: 'bg-emerald-500', val: '45%' },
  { label: 'Payments', color: 'bg-blue-500', val: '25%' },
  { label: 'Technical', color: 'bg-slate-700', val: '14%' },
];

export function getDevDepartmentLoads(): DevDeptLoad[] {
  return gated(DEV_DEPARTMENT_LOADS);
}

export interface DevTimelineEntry {
  id: string;
  node: string;
  time: string;
  status: string;
}

const DEV_TIMELINE: DevTimelineEntry[] = [
  { id: 'SEC-992', node: 'SBI_PAY', time: '14:22', status: 'RESOLVED' },
  { id: 'SEC-991', node: 'S3_DOCS', time: '13:05', status: 'PATCHED' },
  { id: 'SEC-990', node: 'CORE_DB', time: '11:42', status: 'CLEARED' },
  { id: 'SEC-989', node: 'RTI_NODE', time: '09:15', status: 'ESCALATED' },
];

export function getDevTimeline(): DevTimelineEntry[] {
  return gated(DEV_TIMELINE);
}

// ---------------------------------------------------------------------------
// Department fixtures
// ---------------------------------------------------------------------------
export interface DevDepartment {
  name: string;
  role: string;
  workload: number;
  avgResponse: string;
  status: string;
  iconName: string;
  color: string;
}

const DEV_DEPARTMENTS: DevDepartment[] = [
  { name: 'Payment Gateway', role: 'Transaction Integrity', workload: 85, avgResponse: '0.4s', status: 'High Traffic', iconName: 'CreditCard', color: 'emerald' },
  { name: 'Digital Documentation', role: 'Upload & Verification', workload: 62, avgResponse: '2.1s', status: 'Stable', iconName: 'FileUp', color: 'blue' },
  { name: 'Portal Infrastructure', role: 'Server & Latency', workload: 34, avgResponse: '12ms', status: 'Optimal', iconName: 'Cpu', color: 'purple' },
  { name: 'RTI & Legal Compliance', role: 'Information Requests', workload: 92, avgResponse: '4.5h', status: 'Critical', iconName: 'Scale', color: 'rose' },
];

export function getDevDepartments(): DevDepartment[] {
  return gated(DEV_DEPARTMENTS);
}

// ---------------------------------------------------------------------------
// Admin user fixtures
// ---------------------------------------------------------------------------
export interface DevAdmin {
  name: string;
  email: string;
  level: string;
  active: boolean;
}

const DEV_ADMINS: DevAdmin[] = [
  { name: 'Arunachal_Support', email: 'support@appsc.gov.in', level: 'Level 4', active: true },
  { name: 'Karmu_Admin', email: 'karmu.it@appsc.gov.in', level: 'Level 3', active: true },
  { name: 'Pema_Dev', email: 'pema.infra@appsc.gov.in', level: 'Level 2', active: false },
];

export function getDevAdmins(): DevAdmin[] {
  return gated(DEV_ADMINS);
}

// ---------------------------------------------------------------------------
// System config fixtures
// ---------------------------------------------------------------------------
export interface DevSystemConfig {
  label: string;
  iconName: string;
  status: string;
}

const DEV_SYSTEM_CONFIGS: DevSystemConfig[] = [
  { label: 'Security Protocols', iconName: 'Lock', status: 'Enabled' },
  { label: 'Notification Sync', iconName: 'BellRing', status: '98% Signal' },
  { label: 'Cloud Sync', iconName: 'Database', status: 'Synchronized' },
];

export function getDevSystemConfigs(): DevSystemConfig[] {
  return gated(DEV_SYSTEM_CONFIGS);
}

// ---------------------------------------------------------------------------
// Sidebar system status fixtures
// ---------------------------------------------------------------------------
export interface DevSystemStatus {
  database: string;
  ai: string;
  latency: string;
  health: number;
}

const DEV_SYSTEM_STATUS: DevSystemStatus = {
  database: 'SECURED',
  ai: 'READY',
  latency: '42ms',
  health: 98,
};

export function getDevSystemStatus(): DevSystemStatus {
  return gatedSingle(DEV_SYSTEM_STATUS, { database: '—', ai: '—', latency: '—', health: 0 });
}
