import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import connectDB from '../lib/db';
import Complaint from '../lib/models/Complaint';
import { processAnalysis } from '../lib/gemini';
import mongoose from 'mongoose';

async function run() {
    await connectDB();

    // Find recent complaints that were incorrectly defaulted to complaint_cell by AI.
    // Or just pick the last 10 complaints and reanalyze them.
    const complaints = await Complaint.find({}).sort({ createdAt: -1 }).limit(10);

    console.log(`Re-analyzing ${complaints.length} recent complaints to apply the new PHE department prompt rules...`);

    for (const c of complaints) {
        console.log(`\nReanalyzing: ${c.complaintId} - "${c.title}"`);
        // Optional: reset to pending so we can see the exact output change
        c.department = 'Unassigned';
        await c.save();

        await processAnalysis(c.complaintId);

        // Fetch it again to see the result
        const updated = await Complaint.findOne({ complaintId: c.complaintId });
        console.log(`[RESULT] ${updated?.complaintId} -> Dept: ${updated?.department}, Priority: ${updated?.priority}`);
    }

    process.exit(0);
}

run().catch(console.error);
