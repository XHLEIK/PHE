const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const cats = await db.collection('complaints').distinct('category');
    console.log(`Categories found:`, cats);
    process.exit(0);
}
run();
