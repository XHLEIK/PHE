import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { verifyAccessToken } from '@/lib/auth';
import { errorResponse, successResponse, getAccessTokenFromCookies } from '@/lib/api-utils';
import { authorize, toAdminCtx } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid token', 401);

    const adminCtx = toAdminCtx(payload);
    authorize(adminCtx, 'complaint:view');

    const searchParams = req.nextUrl.searchParams;
    const department = searchParams.get('department');
    const category = searchParams.get('category');
    const locationStr = searchParams.get('location');

    if (!department || !category || !locationStr) {
        return errorResponse('Missing required query parameters', 400);
    }

    await connectDB();

    // Reconstruct the logic used in grouping
    // We want matching department, category, and either district or location equal to locationStr
    
    // First let's find all complaints that match the department & category
    const filter: any = { department, category };
    
    const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).lean();
    
    // Filter manually or in mongo to match locationStr
    const matchedComplaints = complaints.filter(c => {
        const cLoc = c.district || c.location || (c._id as any)?.loc || 'Unknown Area';
        return cLoc.toLowerCase().trim() === locationStr.toLowerCase().trim();
    });

    return successResponse(matchedComplaints);
  } catch (err: any) {
    console.error('[INCIDENTS DETAILS GET ERROR]', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
}