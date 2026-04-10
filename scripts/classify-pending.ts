import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import connectDB from '../lib/db';
import Complaint from '../lib/models/Complaint';
import { processAnalysis } from '../lib/gemini';

async function run() {
    await connectDB();

    const complaints = await Complaint.find({ category: 'pending_ai' });
    console.log(`Found ${complaints.length} complaints needing classification...`);

    let count = 1;
    for (const c of complaints) {
        console.log(`[${count}/${complaints.length}] Analyzing: ${c.complaintId} - "${c.title}"`);
        await processAnalysis(c.complaintId);
        count++;
        // Small delay to respect rate limits
        await new Promise(res => setTimeout(res, 2000));
    }

    console.log('Finished background classification.');
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
