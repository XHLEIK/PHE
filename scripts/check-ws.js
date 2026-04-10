const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const complaints = await db.collection('complaints').find({ department: 'water_supply_operations' }).limit(5).toArray();
    console.log(complaints.map(c => ({ id: c.complaintId, dept: c.department, cat: c.category, aiCat: c.aiCategory })));
    process.exit(0);
}
run();
