import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import connectDB from '../lib/db';
import Complaint from '../lib/models/Complaint';

async function run() {
    await connectDB();
    const res = await Complaint.updateMany(
        { department: 'phe_ws' },
        { $set: { department: 'complaint_cell' } }
    );
    console.log(`Migrated ${res.modifiedCount} old test connection requests from 'phe_ws' to 'complaint_cell'.`);
    process.exit(0);
}
run().catch(console.error);
