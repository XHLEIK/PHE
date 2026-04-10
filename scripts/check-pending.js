const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const complaints = await db.collection('complaints').find({ category: 'pending_ai' }).toArray();
    console.log(`Found ${complaints.length} pending_ai complaints.`);
    for(let c of complaints.slice(0, 5)) {
        console.log(`- ${c.complaintId}: ${c.title}`);
    }
    process.exit(0);
}
run();
