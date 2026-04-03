import connectDB from '../lib/db';
import Complaint from '../lib/models/Complaint';
import { PHE_DEPARTMENT_IDS } from '../lib/constants/phe';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    await connectDB();
    const filter = { department: { $in: PHE_DEPARTMENT_IDS } };
    const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).limit(10).lean();
    console.log("Filtered count: " + complaints.length);
    complaints.forEach((c: any) => {
        console.log(c.complaintId, " | Dept: ", c.department, " | Title: ", c.title);
    });

    const latestPhed = await Complaint.findOne({ complaintId: { $regex: /^PHED/ } }).lean();
    console.log("\nIs PHED in the filtered list?", complaints.some(c => c.complaintId === latestPhed?.complaintId));
    console.log("PHED Dept:", latestPhed?.department);
    process.exit(0);
}
run();
