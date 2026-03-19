import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-utils';

/**
 * PATCH /api/admin/departments/[id] — Update department metadata
 * Requires department:update permission.
 * Soft-delete: set active=false instead of hard deletion.
 */
export async function PATCH(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  return errorResponse(
    'Department catalog is fixed for PHE & Water Supply deployment. Department edits are disabled.',
    405
  );
}

/**
 * DELETE /api/admin/departments/[id] — Not allowed (soft-delete only)
 */
export async function DELETE() {
  return errorResponse(
    'Department catalog is fixed for PHE & Water Supply deployment. Department deletion is disabled.',
    405
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
