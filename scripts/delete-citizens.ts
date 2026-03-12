/**
 * scripts/delete-citizens.ts
 * One-time script to delete specific citizen accounts while preserving their chats.
 *
 * Usage: npx tsx scripts/delete-citizens.ts
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

const EMAILS_TO_DELETE = [
  'bwubca23283@brainwareuniversity.ac.in',
  'subhooo224@gmail.com',
];

const PHONE_TO_DELETE = '+917439954585';

async function main() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db!;

  // 1. Delete from citizens collection
  const citizenResult = await db.collection('citizens').deleteMany({
    $or: [
      { email: { $in: EMAILS_TO_DELETE.map(e => e.toLowerCase()) } },
      { phone: PHONE_TO_DELETE },
    ],
  });
  console.log(`✅ Deleted ${citizenResult.deletedCount} citizen document(s)`);

  // 2. Delete refresh tokens for these citizens
  // Refresh tokens store the citizen's email in the token payload
  // They are stored with a 'token' field; we delete by matching user info
  const refreshResult = await db.collection('refreshtokens').deleteMany({
    $or: [
      { userEmail: { $in: EMAILS_TO_DELETE.map(e => e.toLowerCase()) } },
      { email: { $in: EMAILS_TO_DELETE.map(e => e.toLowerCase()) } },
    ],
  });
  console.log(`✅ Deleted ${refreshResult.deletedCount} refresh token(s)`);

  // 3. Show preserved chat data
  const chatSessions = await db.collection('chatsessions').countDocuments({
    email: { $in: EMAILS_TO_DELETE.map(e => e.toLowerCase()) },
  });
  console.log(`\n📌 Preserved ${chatSessions} chat session(s) for these emails`);

  const chatMessages = await db.collection('chatmessages').countDocuments({});
  console.log(`📌 Total chat messages in DB: ${chatMessages}`);

  console.log('\n✅ Done! Citizen accounts deleted. Chat data preserved.');
  console.log('You can now re-register with subhooo224@gmail.com and see previous chats.\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
