/**
 * Admin Seed Script — DEV/OPS ONLY
 *
 * Creates an initial admin account for testing purposes.
 * This script MUST NOT be run in production unless through a secure ops pipeline.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Required environment variables (set via .env.local or secret manager):
 *   MONGODB_URI       — MongoDB connection string
 *   SEED_ADMIN_EMAIL  — Email for the seeded admin
 *   SEED_ADMIN_PASSWORD — Temporary password (will be force-rotated on first login)
 *
 * SECURITY NOTES:
 * - The seeded admin is flagged with `mustRotatePassword: true` and `isSeeded: true`
 * - First login MUST force password rotation before any other action
 * - Do not hardcode credentials — always use env vars or a secret manager
 * - This script is idempotent: running it again updates the existing seeded admin
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  // ---- Validate environment ----
  const mongoUri = process.env.MONGODB_URI;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }
  if (!email) {
    console.error('❌ SEED_ADMIN_EMAIL is not set. Aborting.');
    process.exit(1);
  }
  if (!password) {
    console.error('❌ SEED_ADMIN_PASSWORD is not set. Aborting.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('❌ SEED_ADMIN_PASSWORD must be at least 8 characters. Aborting.');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected.');

  const db = mongoose.connection.db!;
  const usersCollection = db.collection('users');

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await usersCollection.updateOne(
    { email: email.toLowerCase().trim() },
    {
      $set: {
        passwordHash,
        name: 'Seed Administrator',
        role: 'superadmin',
        securityLevel: 4,
        mustRotatePassword: true,
        isSeeded: true,
        isLocked: false,
        failedLoginAttempts: 0,
        lockUntil: null,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        email: email.toLowerCase().trim(),
        lastLoginAt: null,
        createdBy: 'system:seed-script',
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  if (result.upsertedCount > 0) {
    console.log(`✅ Admin account CREATED: ${email}`);
  } else {
    console.log(`✅ Admin account UPDATED: ${email}`);
  }

  console.log('   ⚠️  mustRotatePassword = true (force change on first login)');
  console.log('   ⚠️  isSeeded = true (flagged as seed account)');
  console.log('');
  console.log('🔒 IMPORTANT: Rotate the SEED_ADMIN_PASSWORD environment variable after deployment.');
  console.log('   The admin will be forced to set a new password on first login.');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
