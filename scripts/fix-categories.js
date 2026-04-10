const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    const complaints = await db.collection('complaints').find({ category: 'pending_ai' }).toArray();
    console.log(`Found ${complaints.length} pending_ai complaints.`);
    
    let updated = 0;
    for(let c of complaints) {
        if (c.aiCategory && c.aiCategory !== 'pending_ai') {
            await db.collection('complaints').updateOne({ _id: c._id }, { $set: { category: c.aiCategory } });
            updated++;
        } else if (c.department && c.department !== 'Unassigned') {
            await db.collection('complaints').updateOne({ _id: c._id }, { $set: { category: c.department } });
            updated++;
        }
    }
    
    console.log(`Fixed ${updated} complaints.`);
    process.exit(0);
}
run();
