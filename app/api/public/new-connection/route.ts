import { NextRequest } from 'next/server';
import { errorResponse, getClientIp, checkRateLimit, successResponse } from '@/lib/api-utils';
import { newConnectionSchema } from '@/lib/validations';
import Complaint from '@/lib/models/Complaint';
import connectDB from '@/lib/db';
import { generateNewConnectionId } from '@/lib/models/Counter';
import { processAnalysis } from '@/lib/gemini';
import { PHE_DEPARTMENT_KEY } from '@/lib/constants/phe';

export const runtime = 'nodejs';

/**
 * POST /api/public/new-connection
 * 
 * Accepts a new water connection request from the public homepage AI chat.
 * Stores the request as a tracked entity in the Complaint collection so that
 * admins can view it in the dashboard, AI can route it, and citizens can track it.
 */
export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);

        // Rate limit: 5 new connections per day per IP
        const rl = checkRateLimit(`new-connection:${ip}`, 5, 86400_000);
        if (!rl.allowed) {
            return errorResponse('You have exceeded the maximum number of new connection requests for today. Please try again tomorrow.', 429);
        }

        const body = await req.json();

        const parsed = newConnectionSchema.safeParse(body);
        if (!parsed.success) {
            return errorResponse(parsed.error.issues[0].message, 400);
        }

        const { name, phone, address, idProofUrl } = parsed.data;

        await connectDB();

        // 1. Generate unique PHED tracking ID
        const connectionId = await generateNewConnectionId();

        // 2. Create the connection request as a "complaint" entity
        const newRequest = await Complaint.create({
            complaintId: connectionId,
            department: 'complaint_cell',
            category: 'pending_ai',
            title: 'New Water Connection Request',
            description: `Applicant Address: ${address}\nPhone: ${phone}\nID Proof Uploaded: ${idProofUrl}`,
            submitterName: name,
            submitterPhone: phone,
            location: address,
            state: 'Arunachal Pradesh',
            district: 'General', // Default, AI will try to extract if possible
            status: 'pending',
            priority: 'medium', // Default
            channel: 'web',
            locationScope: {
                state: 'Arunachal Pradesh',
            },
            attachments: [
                {
                    fileName: 'Aadhaar Card / ID Proof',
                    fileType: 'image/jpeg', // Generic, we treat UI upload as image usually
                    url: idProofUrl,
                    fileSize: 0,
                    storageKey: 'ui-upload',
                    thumbnailUrl: idProofUrl,
                    streamingUrl: '',
                    posterUrl: '',
                    uploadedAt: new Date(),
                }
            ],
            aiCategory: null,
            aiPriority: null,
            aiConfidence: null,
        } as any);

        // 3. Fire-and-forget: Tell Gemini to analyze and route the connection request
        // Since title is "New Water Connection Request", Gemini should correctly assign
        // it to water_supply_operations or similar PHE department.
        processAnalysis(connectionId).catch(err => {
            console.error('[ProcessAnalysis Error for New Connection]', connectionId, err);
        });

        return successResponse({
            connectionId: newRequest.complaintId,
            message: 'New connection request submitted successfully.',
        }, undefined, 201);

    } catch (err) {
        console.error('[NEW CONNECTION API ERROR]', err);
        return errorResponse('Internal server error', 500);
    }
}

export async function OPTIONS() {
    return new Response(null, { status: 204 });
}
