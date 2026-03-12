import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { verifyAccessToken } from '@/lib/auth';
import { errorResponse, getAccessTokenFromCookies } from '@/lib/api-utils';
import { authorize, toAdminCtx, buildScopeQuery } from '@/lib/rbac';

/**
 * GET /api/admin/export/complaints — Export complaints as CSV
 * Query params: status, priority, department, from, to (date range)
 * Requires analytics:export permission. Results scoped to admin's location/department.
 */
export async function GET(req: NextRequest) {
  const token = getAccessTokenFromCookies(req);
  if (!token) return errorResponse('Authentication required', 401);

  const payload = verifyAccessToken(token);
  if (!payload) return errorResponse('Invalid or expired token', 401);

  const adminCtx = toAdminCtx(payload);
  authorize(adminCtx, 'analytics:export');

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const department = searchParams.get('department');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const format = searchParams.get('format') || 'csv';

  try {
    await connectDB();

    // Build filter with RBAC scope
    const scopeFilter = buildScopeQuery(adminCtx);
    const filter: Record<string, unknown> = { ...scopeFilter };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;
    if (from || to) {
      filter.createdAt = {};
      if (from) (filter.createdAt as Record<string, unknown>).$gte = new Date(from);
      if (to) (filter.createdAt as Record<string, unknown>).$lte = new Date(to);
    }

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .limit(5000) // Safety cap
      .lean();

    if (format === 'csv') {
      const records: Record<string, unknown>[] = JSON.parse(JSON.stringify(complaints));
      const csv = generateCSV(records);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="complaints-export-${Date.now()}.csv"`,
        },
      });
    }

    // JSON fallback
    return NextResponse.json({ success: true, data: complaints, total: complaints.length });
  } catch (err) {
    console.error('[EXPORT COMPLAINTS ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(complaints: Record<string, unknown>[]): string {
  const headers = [
    'Tracking ID',
    'Title',
    'Description',
    'Status',
    'Priority',
    'Department',
    'Category',
    'Location',
    'State',
    'District',
    'Submitter Name',
    'Submitter Phone',
    'Submitter Email',
    'Assigned To',
    'AI Summary',
    'AI Confidence',
    'SLA Deadline',
    'SLA Breached',
    'Created At',
    'Updated At',
  ];

  const rows = complaints.map(c => [
    escapeCSV(c.complaintId),
    escapeCSV(c.title),
    escapeCSV(c.description),
    escapeCSV(c.status),
    escapeCSV(c.priority),
    escapeCSV(c.department),
    escapeCSV(c.category),
    escapeCSV(c.location),
    escapeCSV(c.state),
    escapeCSV(c.district),
    escapeCSV(c.submitterName),
    escapeCSV(c.submitterPhone),
    escapeCSV(c.submitterEmail),
    escapeCSV(c.assignedTo),
    escapeCSV((c.aiAnalysis as Record<string, unknown> | undefined)?.summary),
    escapeCSV((c.aiAnalysis as Record<string, unknown> | undefined)?.confidence),
    escapeCSV(c.slaDeadline ? new Date(c.slaDeadline as string).toISOString() : ''),
    escapeCSV(c.slaBreached ? 'Yes' : 'No'),
    escapeCSV(c.createdAt ? new Date(c.createdAt as string).toISOString() : ''),
    escapeCSV(c.updatedAt ? new Date(c.updatedAt as string).toISOString() : ''),
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
